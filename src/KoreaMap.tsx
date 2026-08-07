import React from "react";
import { REGIONS, Region, VIEW_BOX } from "./data/regions";
import { C } from "./theme";

interface Props {
  /** 지역 → 채움색. 시간축 해석은 호출부가 정한다(연도든 날짜든). */
  colorOf: (r: Region) => string;
  /** 0..1, 지도 등장 진행도 */
  reveal?: number;
  /** 지역별 외곽선 색(강조용). 없으면 배경색 */
  strokeOf?: (r: Region) => string;
  /** 카메라. 없으면 전국 뷰 고정 */
  viewBox?: string;
  /** 확대 시 선이 같이 두꺼워지지 않도록 하는 보정 배율 */
  strokeScale?: number;
  children?: React.ReactNode;
}

/**
 * 대한민국 250개 시군구 지도 — 범용 렌더러.
 *
 * 이 컴포넌트는 시간을 모른다. 색칠 규칙만 받는다.
 * 그래서 인구(연도축)든 전쟁 진격(날짜축)이든 같은 엔진으로 그린다.
 *
 * children은 지도와 같은 좌표계(0..1000) 위에 얹힌다 — 경로선·마커용.
 */
export const KoreaMap: React.FC<Props> = ({
  colorOf,
  reveal = 1,
  strokeOf,
  viewBox,
  strokeScale = 1,
  children,
}) => (
  <svg
    viewBox={viewBox ?? VIEW_BOX}
    style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
  >
    {REGIONS.map((r) => {
      // 등장 연출: 화면 y 순서로 훑고 지나가듯 나타난다.
      const local = Math.max(0, Math.min(1, (reveal - (r.cy / 1000) * 0.45) / 0.55));
      if (local <= 0) return null;

      return (
        <path
          key={r.code}
          d={r.d}
          fill={colorOf(r)}
          stroke={strokeOf ? strokeOf(r) : C.bg}
          strokeWidth={0.7 * strokeScale}
          opacity={local}
        />
      );
    })}
    {children}
  </svg>
);
