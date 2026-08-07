import React from "react";
import provinces from "./data/provinces.json";
import { CITIES } from "./data/places";
import { Battle, battlesUpTo } from "./data/battles";
import { frontLine, frontPath, holePath } from "./front";

interface Province {
  id: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
}

export const PROVINCES: Province[] = provinces.provinces;
export const PROVINCE_VIEWBOX: string = provinces.viewBox;

interface Props {
  month: number;
  reveal?: number;
  children?: React.ReactNode;
}

const FREE = "#273143";
const HELD = "#9B1C1C";
const COAST = "#3A4762";

const JOSEON = "#60A5FA";
const JAPAN = "#F87171";

/**
 * 전쟁 지도 — 점령권을 곡선으로 그린다.
 *
 * 도 폴리곤을 칠하지 않는다. 행정 경계에 맞추면 도 하나가 통째로 켜졌다
 * 꺼졌다 해서 끊겨 보이고, 실제 전선은 경계선과 무관하게 움직인다.
 * 대신 육지 전체를 클립으로 잡고, 그 안에서 곡선 아래를 점령색으로 덮는다.
 * 전라도 미점령분은 별도의 닫힌 곡선으로 도로 빼낸다.
 */
export const WarMap: React.FC<Props> = ({ month, reveal = 1, children }) => {
  const fought = battlesUpTo(month);
  const hole = holePath(month);

  return (
    <svg
      viewBox={PROVINCE_VIEWBOX}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      <defs>
        {/* 육지 — 점령색이 바다로 새지 않게 잡아주는 마스크 */}
        {/* 제주는 전 기간 미점령이므로 클립에서 제외한다.
            빼지 않으면 전선 곡선 아래에 걸려 붉게 칠해진다. */}
        <clipPath id="land">
          {PROVINCES.filter((p) => p.id !== "jeju").map((p) => (
            <path key={p.id} d={p.d} />
          ))}
        </clipPath>
      </defs>

      <g opacity={reveal}>
        {/* 바탕 */}
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill={FREE} stroke="none" />
        ))}

        {/* 점령권 — 곡선 아래, 육지 안쪽만 */}
        <g clipPath="url(#land)">
          <path d={frontPath(month)} fill={HELD} />
          {/* 전라도 미점령 — 점령색에서 도로 빼낸다 */}
          {hole && <path d={hole} fill={FREE} />}
        </g>

        {/* 전선 */}
        <g clipPath="url(#land)">
          <path
            d={frontLine(month)}
            fill="none"
            stroke="#F87171"
            strokeWidth={3}
            opacity={0.8}
          />
          {hole && (
            <path d={hole} fill="none" stroke="#F87171" strokeWidth={2.6} opacity={0.55} />
          )}
        </g>

        {/* 해안선 */}
        {PROVINCES.map((p) => (
          <path key={`c${p.id}`} d={p.d} fill="none" stroke={COAST} strokeWidth={1.4} />
        ))}

        {/* 지명 */}
        {CITIES.filter((c) => c.from <= month).map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={4} fill="#FBBF24" />
            <text
              x={c.side === "left" ? c.x - 11 : c.x + 11}
              y={c.y + 6}
              textAnchor={c.side === "left" ? "end" : "start"}
              fontSize={23}
              fontWeight={900}
              fill="#FDE68A"
              style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 5 }}
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* 전투 */}
        {fought.map((b) => (
          <BattleMark key={b.name} b={b} month={month} />
        ))}
      </g>

      {children}
    </svg>
  );
};

const BattleMark: React.FC<{ b: Battle; month: number }> = ({ b, month }) => {
  const fresh = Math.max(0, 1 - (month - b.month) / 0.9);
  const color = b.won === "joseon" ? JOSEON : JAPAN;
  const r = b.major ? 6 : 4;

  return (
    <g>
      {fresh > 0 && (
        <circle
          cx={b.x}
          cy={b.y}
          r={r + fresh * 26}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          opacity={fresh * 0.75}
        />
      )}
      {b.sea ? (
        <circle cx={b.x} cy={b.y} r={r} fill="#0B0E14" stroke={color} strokeWidth={3} />
      ) : (
        <rect
          x={b.x - r}
          y={b.y - r}
          width={r * 2}
          height={r * 2}
          fill={color}
          stroke="#0B0E14"
          strokeWidth={1.4}
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      )}
      {b.major && (
        <text
          x={b.side === "left" ? b.x - 13 : b.x + 13}
          y={b.y + 6 + (b.dy ?? 0)}
          textAnchor={b.side === "left" ? "end" : "start"}
          fontSize={21}
          fontWeight={900}
          fill={color}
          style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 5 }}
        >
          {b.name}
        </text>
      )}
    </g>
  );
};
