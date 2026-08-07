import React from "react";
import { REGIONS } from "./data/regions";
import { Division } from "./data/imjin";

const CENTER = new Map(REGIONS.map((r) => [r.code, { x: r.cx, y: r.cy }]));

/** day 시점까지 진격한 경로를 잘라 좌표열로. 구간 사이는 선형 보간한다. */
function pointsUpTo(div: Division, day: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < div.path.length; i++) {
    const w = div.path[i];
    const c = CENTER.get(w.code);
    if (!c) continue;

    if (w.day <= day) {
      pts.push(c);
      continue;
    }
    // 아직 도달 못한 첫 지점 — 직전 지점에서 부분 전진
    const prev = div.path[i - 1];
    const pc = prev ? CENTER.get(prev.code) : undefined;
    if (prev && pc && day > prev.day) {
      const t = (day - prev.day) / (w.day - prev.day);
      pts.push({ x: pc.x + (c.x - pc.x) * t, y: pc.y + (c.y - pc.y) * t });
    }
    break;
  }
  return pts;
}

interface Props {
  division: Division;
  day: number;
}

/**
 * 진격로 한 갈래. 지도와 같은 0..1000 좌표계 위에 그린다.
 * 선두에는 광점을 찍어 현재 위치를 보여준다.
 */
export const MarchRoute: React.FC<Props> = ({ division, day }) => {
  const pts = pointsUpTo(division, day);
  if (pts.length === 0) return null;

  const d = "M" + pts.map((p) => `${p.x} ${p.y}`).join("L");
  const head = pts[pts.length - 1];

  return (
    <g>
      {/* 바깥 글로우 */}
      <path
        d={d}
        fill="none"
        stroke={division.color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.22}
      />
      <path
        d={d}
        fill="none"
        stroke={division.color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.length > 1 && (
        <>
          <circle cx={head.x} cy={head.y} r={13} fill={division.color} opacity={0.25} />
          <circle cx={head.x} cy={head.y} r={5.5} fill="#fff" />
        </>
      )}
    </g>
  );
};
