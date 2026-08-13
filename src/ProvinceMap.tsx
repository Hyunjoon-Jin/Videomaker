import React from "react";
import provinces from "./data/provinces.json";
import { CITIES } from "./data/places";
import { Battle, battlesUpTo } from "./data/battles";
import { smooth } from "./front";
import { makePocket, makePolyFront } from "./polyfront";
import { IMJIN_FRONT, JEOLLA_FROM, JEOLLA_POCKET, JEOLLA_TO } from "./data/imjin-front";
import { FORTS, FORT_FROM, FORT_TO, MILITIA, ROUTES, routeProgress } from "./data/detail";

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
  /** 카메라가 만든 viewBox. 없으면 지도 전체를 본다. */
  viewBox?: string;
  /**
   * 화면 픽셀 → 지도 단위 변환기.
   * 확대하면 지도 단위 하나가 더 많은 화면 픽셀을 먹는다. 선 굵기와
   * 글자 크기를 그대로 두면 줌인할 때 크레용으로 그린 것처럼 굵어진다.
   */
  u?: (px: number) => number;
  children?: React.ReactNode;
}

const FREE = "#2C2B24";
const HELD = "#7A2A20";
const COAST = "#4A4638";

const JOSEON = "#7FA8C4";
const JAPAN = "#D4694F";
const MILITIA_C = "#7C8B52";
const FORT_C = "#C08A7A";
const JOSEON_C = "#7FA8C4";

/**
 * 6·25 편과 같은 폴리라인 전선. 일본군은 남쪽에서 올라오므로 "아래"가 점령.
 * 전라도는 흥남 교두보와 같은 구조라 포켓으로 둔다.
 */
const FRONT = makePolyFront(IMJIN_FRONT, "south");
const JEOLLA = makePocket(JEOLLA_POCKET, JEOLLA_FROM, JEOLLA_TO, 2.5);

/**
 * 전쟁 지도 — 점령권을 곡선으로 그린다.
 *
 * 도 폴리곤을 칠하지 않는다. 행정 경계에 맞추면 도 하나가 통째로 켜졌다
 * 꺼졌다 해서 끊겨 보이고, 실제 전선은 경계선과 무관하게 움직인다.
 * 대신 육지 전체를 클립으로 잡고, 그 안에서 곡선 아래를 점령색으로 덮는다.
 * 전라도 미점령분은 별도의 닫힌 곡선으로 도로 빼낸다.
 */
export const WarMap: React.FC<Props> = ({
  month,
  reveal = 1,
  viewBox,
  u = (px: number) => px,
  children,
}) => {
  const fought = battlesUpTo(month);
  const jeollaA = JEOLLA.alphaAt(month);
  const jeollaD = jeollaA > 0 ? JEOLLA.pathAt(month) : "";

  return (
    <svg
      viewBox={viewBox ?? PROVINCE_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
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

        {/* 점령권 — 폴리라인 아래, 육지 안쪽만.
            순서: 채움 → 전라도 빼내기 → 전선 → 전라도 테두리 */}
        <g clipPath="url(#land)">
          <path d={FRONT.areaAt(month)} fill={HELD} />
          {jeollaD && <path d={jeollaD} fill={FREE} opacity={jeollaA} />}
          <path
            d={FRONT.lineAt(month)}
            fill="none"
            stroke="#D4694F"
            strokeWidth={u(4)}
            opacity={0.85}
          />
          {jeollaD && (
            <path
              d={jeollaD}
              fill="none"
              stroke={JOSEON_C}
              strokeWidth={3.2}
              strokeDasharray={`${u(11)} ${u(8)}`}
              opacity={jeollaA}
            />
          )}
        </g>

        {/* 해안선 */}
        {PROVINCES.map((p) => (
          <path key={`c${p.id}`} d={p.d} fill="none" stroke={COAST} strokeWidth={u(1.8)} />
        ))}

        {/* 지명 */}
        {CITIES.filter((c) => c.from <= month).map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={u(5)} fill="#C09240" />
            <text
              x={c.side === "left" ? c.x - 11 : c.x + 11}
              y={c.y + 6}
              textAnchor={c.side === "left" ? "end" : "start"}
              fontSize={u(31)}
              fontWeight={900}
              fill="#DCC48C"
              style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(6) }}
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* 이동 경로 — 선조 파천 · 명군 남하 */}
        {ROUTES.map((r) => {
          const prog = routeProgress(r, month);
          if (prog <= 0) return null;
          const pts = smooth(r.pts.map((p) => [p.x, p.y] as [number, number]), 16);
          const n = Math.max(2, Math.round(pts.length * prog));
          const d = pts
            .slice(0, n)
            .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
            .join("");
          const head = pts[n - 1];
          return (
            <g key={r.id}>
              <path
                d={d}
                fill="none"
                stroke={r.color}
                strokeWidth={u(3.3)}
                strokeDasharray="9 7"
                opacity={0.9}
              />
              <circle cx={head[0]} cy={head[1]} r={4.5} fill={r.color} />
            </g>
          );
        })}

        {/* 왜성 — 남해안 벨트. 교착기의 실체 */}
        {month >= FORT_FROM && month < FORT_TO &&
          FORTS.map((f) => (
            <g key={f.name}>
              <rect
                x={f.x - 4}
                y={f.y - 4}
                width={8}
                height={8}
                fill="#151310"
                stroke={FORT_C}
                strokeWidth={2.2}
              />
            </g>
          ))}

        {/* 의병 */}
        {MILITIA.filter((m) => m.month <= month).map((m) => {
          const fresh = Math.max(0, 1 - (month - m.month) / 1.2);
          return (
            <g key={m.leader}>
              {fresh > 0 && (
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={5 + fresh * 22}
                  fill="none"
                  stroke={MILITIA_C}
                  strokeWidth={2.2}
                  opacity={fresh * 0.8}
                />
              )}
              <path
                d={`M${m.x} ${m.y - 6}L${m.x + 5.5} ${m.y + 4}L${m.x - 5.5} ${m.y + 4}Z`}
                fill={MILITIA_C}
                stroke="#151310"
                strokeWidth={u(1.6)}
              />
              {m.label && (
                <text
                  x={m.side === "left" ? m.x - 11 : m.x + 11}
                  y={m.y + 5 + (m.dy ?? 0)}
                  textAnchor={m.side === "left" ? "end" : "start"}
                  fontSize={u(27)}
                  fontWeight={900}
                  fill={MILITIA_C}
                  style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(6) }}
                >
                  {m.leader}
                </text>
              )}
            </g>
          );
        })}

        {/* 전라도 라벨 — 지켜낸 도라는 것이 읽혀야 한다 */}
        {jeollaA > 0 && (
          <text
            x={352}
            y={866}
            textAnchor="end"
            fontSize={u(28)}
            fontWeight={900}
            fill={JOSEON_C}
            opacity={jeollaA}
            style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(6) }}
          >
            전라도 미점령
          </text>
        )}

        {/* 전투 */}
        {fought.map((b) => (
          <BattleMark key={b.name} b={b} month={month} u={u} />
        ))}
      </g>

      {children}
    </svg>
  );
};

const BattleMark: React.FC<{
  b: Battle;
  month: number;
  u: (px: number) => number;
}> = ({ b, month, u }) => {
  const fresh = Math.max(0, 1 - (month - b.month) / 0.9);
  const color = b.won === "joseon" ? JOSEON : JAPAN;
  const r = u(b.major ? 8 : 5);

  return (
    <g>
      {fresh > 0 && (
        <circle
          cx={b.x}
          cy={b.y}
          r={r + fresh * u(34)}
          fill="none"
          stroke={color}
          strokeWidth={u(3)}
          opacity={fresh * 0.75}
        />
      )}
      {b.sea ? (
        <circle cx={b.x} cy={b.y} r={r} fill="#151310" stroke={color} strokeWidth={u(4)} />
      ) : (
        <rect
          x={b.x - r}
          y={b.y - r}
          width={r * 2}
          height={r * 2}
          fill={color}
          stroke="#151310"
          strokeWidth={u(1.8)}
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      )}
      {b.major && (
        <text
          x={b.side === "left" ? b.x - u(17) : b.x + u(17)}
          y={b.y + u(8) + u(b.dy ?? 0)}
          textAnchor={b.side === "left" ? "end" : "start"}
          fontSize={u(28)}
          fontWeight={900}
          fill={color}
          style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(6) }}
        >
          {b.name}
        </text>
      )}
    </g>
  );
};
