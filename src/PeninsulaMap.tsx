import React from "react";
import peninsula from "./data/peninsula.json";

const NORTH: string[] = peninsula.north;
const SOUTH: Array<{ code: string; d: string }> = peninsula.south;
export const PENINSULA_VIEWBOX: string = peninsula.viewBox;

interface Props {
  /** 일본군 최대 진출선 (cy). 이 아래가 점령권 */
  front: number;
  /** 0..1 등장 진행도 */
  reveal?: number;
  children?: React.ReactNode;
}

const BASE = "#212938";
const BASE_N = "#1B2230";
const HELD = "#8E1C1C";

/**
 * 한반도 전체 지도 — 남한은 시군구, 북한은 국경 외곽선.
 *
 * 점령권은 지역별로 칠하지 않고 전선 아래를 통째로 클립해 칠한다.
 * 시군구 단위 점령 사료가 없으므로 있는 척하지 않는 편이 정직하다.
 */
export const PeninsulaMap: React.FC<Props> = ({ front, reveal = 1, children }) => (
  <svg
    viewBox={PENINSULA_VIEWBOX}
    style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
  >
    <defs>
      <clipPath id="heldClip">
        <rect x={-50} y={front} width={1100} height={1100} />
      </clipPath>
      <linearGradient id="frontFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
      </linearGradient>
      {/* 전선이 바다 위까지 곧게 뻗으면 화면을 자르는 막대처럼 보인다.
          양끝을 투명하게 빼서 육지 위에서만 또렷하게 만든다. */}
      <linearGradient id="frontEdge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#EF4444" stopOpacity="0" />
        <stop offset="22%" stopColor="#EF4444" stopOpacity="1" />
        <stop offset="78%" stopColor="#EF4444" stopOpacity="1" />
        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
      </linearGradient>
      <mask id="frontMask">
        <rect x={0} y={0} width={1000} height={1000} fill="url(#frontEdge)" />
      </mask>
    </defs>

    {/* 바탕 — 한반도 전체 */}
    <g opacity={reveal}>
      {NORTH.map((d, i) => (
        <path key={`n${i}`} d={d} fill={BASE_N} stroke="#0B0E14" strokeWidth={0.8} />
      ))}
      {SOUTH.map((r) => (
        <path key={r.code} d={r.d} fill={BASE} stroke="#0B0E14" strokeWidth={0.6} />
      ))}
    </g>

    {/* 점령권 — 전선 아래만 */}
    <g clipPath="url(#heldClip)" opacity={reveal}>
      {NORTH.map((d, i) => (
        <path key={`hn${i}`} d={d} fill={HELD} stroke="#0B0E14" strokeWidth={0.8} />
      ))}
      {SOUTH.map((r) => (
        <path key={`hs${r.code}`} d={r.d} fill={HELD} stroke="#0B0E14" strokeWidth={0.6} />
      ))}
    </g>

    {/* 전선 */}
    {front < 1000 && reveal > 0.4 && (
      <g mask="url(#frontMask)">
        <rect x={0} y={front} width={1000} height={26} fill="url(#frontFade)" opacity={0.5} />
        <line
          x1={0}
          y1={front}
          x2={1000}
          y2={front}
          stroke="#EF4444"
          strokeWidth={2.6}
          strokeDasharray="14 9"
        />
      </g>
    )}

    {children}
  </svg>
);
