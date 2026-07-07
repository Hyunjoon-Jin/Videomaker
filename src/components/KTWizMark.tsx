import React from "react";
import { KR_FONT } from "../fonts";

/**
 * KT 위즈 워드마크(깔끔한 그래픽 재현).
 * 실사 씬의 AI 뭉개진 로고 대신, 그래픽 컴포넌트(스코어버그·라인업·엔딩)에 사용.
 * 최종본에선 공식 로고 파일(SVG/PNG)로 교체 권장.
 *   "kt wiz" 볼드 이탤릭 + 빨강 별 액센트.
 */
const STAR =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

export interface KTWizMarkProps {
  size?: number; // 글자 높이 px
  color?: string; // 워드마크 색
  star?: string; // 별 색
}

export const KTWizMark: React.FC<KTWizMarkProps> = ({
  size = 34,
  color = "#111",
  star = "#E4002B",
}) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.18,
        fontFamily: KR_FONT,
        fontWeight: 900,
        fontStyle: "italic",
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -1,
        color,
        userSelect: "none",
      }}
    >
      kt&nbsp;wiz
      <span
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background: star,
          clipPath: STAR,
          display: "inline-block",
        }}
      />
    </span>
  );
};
