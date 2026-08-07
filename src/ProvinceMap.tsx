import React from "react";
import provinces from "./data/provinces.json";
import { ProvinceId } from "./data/war";

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
  /** 일본군이 점령한 도 */
  occupied: Set<ProvinceId>;
  /** 0..1 등장 진행도 */
  reveal?: number;
  /** 이름표를 붙일 도 (강조용) */
  highlight?: ProvinceId | null;
  children?: React.ReactNode;
}

const FREE = "#26304180";
const FREE_S = "#3A4762";
const HELD = "#9B1C1C";
const HELD_S = "#EF4444";

/**
 * 조선 팔도 지도.
 *
 * 도 단위로 칠하는 이유는 정확성 때문이다. 가로 전선으로는 1592년 전라도가
 * 점령된 것처럼 보이는데, 전라도가 버틴 것이 이 전쟁의 분기점이다.
 */
export const ProvinceMap: React.FC<Props> = ({
  occupied,
  reveal = 1,
  highlight,
  children,
}) => (
  <svg
    viewBox={PROVINCE_VIEWBOX}
    style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
  >
    {PROVINCES.map((p) => {
      const held = occupied.has(p.id as ProvinceId);
      const on = highlight === p.id;
      return (
        <path
          key={p.id}
          d={p.d}
          fill={held ? HELD : FREE}
          stroke={on ? "#FBBF24" : held ? HELD_S : FREE_S}
          strokeWidth={on ? 4 : 1.6}
          opacity={reveal}
        />
      );
    })}
    {children}
  </svg>
);
