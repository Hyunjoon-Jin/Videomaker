import React from "react";
import { REGIONS, VIEW_BOX } from "./data/regions";
import { changeRatio } from "./data/population";
import { C, rampColor } from "./theme";

interface Props {
  /** 표시 연도(정수가 아니어도 됨 — 보간해서 부드럽게 흐른다) */
  year: number;
  /** 0..1, 지도 등장 진행도 */
  reveal?: number;
}

/**
 * 250개 시군구를 1975년 대비 인구 증감률로 칠한 대한민국 지도.
 *
 * 연도는 실수로 받아 두 정수 연도 사이를 선형 보간한다.
 * 그래서 프레임마다 색이 튀지 않고 연속적으로 흐른다.
 */
export const KoreaMap: React.FC<Props> = ({ year, reveal = 1 }) => {
  const y0 = Math.floor(year);
  const y1 = Math.min(y0 + 1, 2025);
  const t = year - y0;

  return (
    <svg
      viewBox={VIEW_BOX}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      {REGIONS.map((r, i) => {
        // 등장 연출: 위도(=화면 y) 순서로 훑고 지나가듯 나타난다.
        const order = r.cy / 1000;
        const local = Math.max(0, Math.min(1, (reveal - order * 0.45) / 0.55));
        if (local <= 0) return null;

        const ratio = changeRatio(y0, r.code) * (1 - t) + changeRatio(y1, r.code) * t;

        return (
          <path
            key={r.code}
            d={r.d}
            fill={rampColor(ratio)}
            stroke={C.bg}
            strokeWidth={0.7}
            opacity={local}
          />
        );
      })}
    </svg>
  );
};
