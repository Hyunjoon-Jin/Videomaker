import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * 중계 방송 버그(좌상단 "● LIVE") — 실제 중계화면 느낌.
 */
export const LiveBug: React.FC<{ label?: string }> = ({
  label = "최상강남 vs RIVALS",
}) => {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame / 6) > -0.3 ? 1 : 0.3;
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 46,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "rgba(6,10,17,0.8)",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.12)",
        fontFamily: KR_FONT,
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: COLORS.homeRed,
          opacity: blink,
          boxShadow: `0 0 10px ${COLORS.homeRed}`,
        }}
      />
      <span
        style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: 3 }}
      >
        LIVE
      </span>
      <span style={{ color: COLORS.subtleGrey, fontWeight: 700, fontSize: 18 }}>
        {label}
      </span>
    </div>
  );
};
