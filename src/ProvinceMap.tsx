import React from "react";
import provinces from "./data/provinces.json";
import { ProvinceId } from "./data/war";
import { CITIES } from "./data/places";
import { Battle, battlesUpTo } from "./data/battles";

interface Province {
  id: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
}

export const PROVINCES: Province[] = provinces.provinces;
export const SGG: string[] = provinces.sgg;
export const PROVINCE_VIEWBOX: string = provinces.viewBox;

interface Props {
  /** 도 → 점령도 0..1 */
  levelOf: (id: ProvinceId) => number;
  month: number;
  reveal?: number;
  children?: React.ReactNode;
}

const FREE: number[] = [0x26, 0x30, 0x41];
const HELD: number[] = [0x9b, 0x1c, 0x1c];
const FREE_S = "#3A4762";
const HELD_S = "#EF4444";

const JOSEON = "#60A5FA";
const JAPAN = "#F87171";

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

/**
 * 조선 팔도 지도 + 시군구 경계 + 개별 전투.
 *
 * 색칠은 도 단위(그 이상은 사료로 못 받친다), 경계선은 시군구 단위,
 * 전투는 개별 실좌표. 주장의 정밀도와 화면의 밀도를 분리한 것이다 —
 * 없는 데이터를 지어내지 않으면서 지도는 성기지 않게.
 */
export const ProvinceMap: React.FC<Props> = ({ levelOf, month, reveal = 1, children }) => {
  const fought = battlesUpTo(month);

  return (
    <svg
      viewBox={PROVINCE_VIEWBOX}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      {/* 도 채움 */}
      {PROVINCES.map((p) => {
        const lv = levelOf(p.id as ProvinceId);
        return (
          <path
            key={p.id}
            d={p.d}
            fill={mix(FREE, HELD, lv)}
            stroke="none"
            opacity={reveal}
          />
        );
      })}

      {/* 시군구 경계 — 밀도만 담당, 점령 판정과 무관 */}
      <g opacity={reveal * 0.28}>
        {SGG.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#0B0E14" strokeWidth={0.9} />
        ))}
      </g>

      {/* 도 경계 */}
      {PROVINCES.map((p) => {
        const lv = levelOf(p.id as ProvinceId);
        return (
          <path
            key={`s${p.id}`}
            d={p.d}
            fill="none"
            stroke={lv > 0.5 ? HELD_S : FREE_S}
            strokeWidth={1.8}
            opacity={reveal}
          />
        );
      })}

      {/* 도 이름 */}
      {PROVINCES.map((p) => (
        <text
          key={`t${p.id}`}
          x={p.cx}
          y={p.cy}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fill="#E6EAF2"
          opacity={reveal * 0.5}
          style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 4 }}
        >
          {p.name}
        </text>
      ))}

      {/* 거점 */}
      {CITIES.filter((c) => c.from <= month).map((c) => (
        <g key={c.name} opacity={reveal * 0.9}>
          <circle cx={c.x} cy={c.y} r={4} fill="#FBBF24" />
          <text
            x={c.side === "left" ? c.x - 11 : c.x + 11}
            y={c.y + 6}
            textAnchor={c.side === "left" ? "end" : "start"}
            fontSize={22}
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
        <BattleMark key={b.name} b={b} month={month} reveal={reveal} />
      ))}

      {children}
    </svg>
  );
};

/** 전투 하나. 막 벌어졌을 때 파문이 퍼지고, 이후에는 점으로 남는다. */
const BattleMark: React.FC<{ b: Battle; month: number; reveal: number }> = ({
  b,
  month,
  reveal,
}) => {
  const age = month - b.month;
  const fresh = Math.max(0, 1 - age / 0.9);
  const color = b.won === "joseon" ? JOSEON : JAPAN;
  const r = b.major ? 6 : 4;

  return (
    <g opacity={reveal}>
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
        <circle
          cx={b.x}
          cy={b.y}
          r={r}
          fill="#0B0E14"
          stroke={color}
          strokeWidth={3}
        />
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
