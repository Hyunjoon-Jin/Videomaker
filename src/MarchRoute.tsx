import React from "react";
import { Division, TOTAL_DAYS } from "./data/imjin";
import { pathUpTo, positionAt } from "./route";

interface Props {
  division: Division;
  day: number;
  /** 확대 시 선 굵기를 유지하기 위한 보정(= 1/zoom) */
  scale?: number;
  /** 날짜 눈금 표시 여부 */
  ticks?: boolean;
}

/**
 * 진격로 한 갈래 — 곡선.
 *
 * 하루 단위 눈금을 곡선 위에 찍어 "며칠에 어디까지 갔는지"를 보여준다.
 * 눈금과 선두 위치는 같은 곡선 샘플에서 나오므로 서로 어긋나지 않는다.
 */
export const MarchRoute: React.FC<Props> = ({
  division,
  day,
  scale = 1,
  ticks = true,
}) => {
  const d = pathUpTo(division, day);
  if (!d) return null;

  const head = positionAt(division, day);
  const start = positionAt(division, -Infinity);

  // 이미 지나온 날짜 눈금
  const marks: Array<{ x: number; y: number; n: number }> = [];
  if (ticks) {
    for (let n = 0; n <= TOTAL_DAYS; n++) {
      if (n > day) break;
      const p = positionAt(division, n);
      // 아직 출발 전인 사단은 눈금을 찍지 않는다
      if (p && start && n >= start.day) marks.push({ x: p.x, y: p.y, n });
    }
  }

  return (
    <g>
      {/* 바깥 글로우 */}
      <path
        d={d}
        fill="none"
        stroke={division.color}
        strokeWidth={10 * scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.2}
      />
      <path
        d={d}
        fill="none"
        stroke={division.color}
        strokeWidth={3.2 * scale}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 하루 단위 눈금 */}
      {marks.map((m) => (
        <circle
          key={m.n}
          cx={m.x}
          cy={m.y}
          r={2.4 * scale}
          fill="#0B0E14"
          stroke={division.color}
          strokeWidth={1.6 * scale}
        />
      ))}

      {/* 선두 */}
      {head && (
        <>
          <circle
            cx={head.x}
            cy={head.y}
            r={14 * scale}
            fill={division.color}
            opacity={0.22}
          />
          <circle
            cx={head.x}
            cy={head.y}
            r={5.6 * scale}
            fill="#fff"
            stroke={division.color}
            strokeWidth={2 * scale}
          />
        </>
      )}
    </g>
  );
};
