import React from "react";
import { KR_FONT } from "../fonts";

/**
 * "B2B" 로고 — 가운데 2는 야구공, 위에 "Back to Back" 스크립트.
 * 엔딩 카피 레퍼런스(현수막) 디자인 재현.
 * 빨강 3D B + 야구공 2(빨강 실밥) + "Back to Back".
 */
const RED = "#D81E2C";
const RED_DK = "#8E1019";

// 3D 압출 텍스트 섀도우
const extrude = (n: number, color: string) =>
  Array.from({ length: n })
    .map((_, i) => `${i + 1}px ${i + 1}px 0 ${color}`)
    .join(", ");

const Baseball: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="ball" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f2f2f2" />
          <stop offset="100%" stopColor="#d5d5d5" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="url(#ball)" stroke="#c9c9c9" strokeWidth="1.5" />
      <path
        d="M27,9 C14,30 14,70 27,91"
        fill="none"
        stroke={RED}
        strokeWidth="2.6"
        strokeDasharray="2.5 6"
        strokeLinecap="round"
      />
      <path
        d="M73,9 C86,30 86,70 73,91"
        fill="none"
        stroke={RED}
        strokeWidth="2.6"
        strokeDasharray="2.5 6"
        strokeLinecap="round"
      />
    </svg>
    {/* 야구공 위 숫자 2 */}
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: KR_FONT,
        fontWeight: 900,
        fontStyle: "italic",
        fontSize: size * 0.66,
        color: "#2A2A2A",
        textShadow: "0 2px 3px rgba(0,0,0,0.25)",
      }}
    >
      2
    </span>
  </div>
);

const BigB: React.FC<{ size: number }> = ({ size }) => (
  <span
    style={{
      fontFamily: KR_FONT,
      fontWeight: 900,
      fontStyle: "italic",
      fontSize: size,
      lineHeight: 1,
      color: RED,
      textShadow: extrude(6, RED_DK),
    }}
  >
    B
  </span>
);

export const B2BLogo: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const B = 150 * scale;
  const ball = 118 * scale;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 2 * scale,
      }}
    >
      {/* Back to Back 스크립트 */}
      <span
        style={{
          position: "absolute",
          top: -40 * scale,
          left: "50%",
          transform: "translateX(-50%) rotate(-4deg)",
          fontFamily: KR_FONT,
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 40 * scale,
          color: RED,
          whiteSpace: "nowrap",
        }}
      >
        Back to Back
      </span>
      <BigB size={B} />
      <Baseball size={ball} />
      <BigB size={B} />
    </div>
  );
};
