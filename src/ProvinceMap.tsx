import React from "react";
import provinces from "./data/provinces.json";
import { ProvinceId } from "./data/war";
import { CITIES, SEA_BATTLES } from "./data/places";

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
  /** 도 → 점령도 0..1 */
  levelOf: (id: ProvinceId) => number;
  /** 현재 개월 — 지명 등장 시점 판단용 */
  month: number;
  reveal?: number;
  /** 표시할 해전 이름 */
  seaShown?: string[];
  children?: React.ReactNode;
}

const FREE: [number, number, number] = [0x26, 0x30, 0x41];
const HELD: [number, number, number] = [0x9b, 0x1c, 0x1c];
const FREE_S = "#3A4762";
const HELD_S = "#EF4444";

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

/**
 * 조선 팔도 지도 — 지명 포함.
 *
 * 라벨이 없는 역사 지도는 정보가 아니라 무늬다. 자막이 "평양 함락"이라 해도
 * 평양이 어디인지 지도에 없으면 시청자는 아무것도 못 읽는다.
 * 도 이름·주요 거점·해전을 모두 지도 위에 적는다.
 */
export const ProvinceMap: React.FC<Props> = ({
  levelOf,
  month,
  reveal = 1,
  seaShown = [],
  children,
}) => (
  <svg
    viewBox={PROVINCE_VIEWBOX}
    style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
  >
    {/* 도 */}
    {PROVINCES.map((p) => {
      const lv = levelOf(p.id as ProvinceId);
      return (
        <path
          key={p.id}
          d={p.d}
          fill={mix(FREE, HELD, lv)}
          stroke={lv > 0.5 ? HELD_S : FREE_S}
          strokeWidth={1.6}
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
        fontSize={19}
        fontWeight={700}
        fill="#E6EAF2"
        opacity={reveal * 0.62}
        style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 4 }}
      >
        {p.name}
      </text>
    ))}

    {/* 주요 거점 */}
    {CITIES.filter((c) => c.from <= month).map((c) => (
      <g key={c.name} opacity={reveal}>
        <circle cx={c.x} cy={c.y} r={5} fill="#FBBF24" />
        <circle cx={c.x} cy={c.y} r={9} fill="none" stroke="#FBBF24" strokeWidth={1.6} opacity={0.5} />
        <text
          x={c.side === "left" ? c.x - 14 : c.x + 14}
          y={c.y + 7}
          textAnchor={c.side === "left" ? "end" : "start"}
          fontSize={25}
          fontWeight={900}
          fill="#FDE68A"
          style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 5 }}
        >
          {c.name}
        </text>
      </g>
    ))}

    {/* 해전 */}
    {seaShown.map((name) => {
      const s = SEA_BATTLES[name];
      if (!s) return null;
      return (
        <g key={name} opacity={reveal}>
          <circle cx={s.x} cy={s.y} r={17} fill="#3B82F6" opacity={0.2} />
          <circle
            cx={s.x}
            cy={s.y}
            r={7}
            fill="#0B0E14"
            stroke="#60A5FA"
            strokeWidth={3.4}
          />
          <text
            x={s.side === "left" ? s.x - 16 : s.x + 16}
            y={s.y + 7 + (s.dy ?? 0)}
            textAnchor={s.side === "left" ? "end" : "start"}
            fontSize={24}
            fontWeight={900}
            fill="#93C5FD"
            style={{ paintOrder: "stroke", stroke: "#0B0E14", strokeWidth: 5 }}
          >
            {name}
          </text>
        </g>
      );
    })}

    {children}
  </svg>
);
