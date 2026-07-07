import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * 방송 하단 네임택 (Scene 3·4·5).
 * 상단 직함(작게) + 하단 이름(크게). '(가상)' 표기는 안전장치이자 개그.
 */
export interface NameTagProps {
  role: string; // "아메리카나 합중국 대통령 (가상)"
  name?: string; // "김봉균" 등 (선택)
  accent?: string;
  appearAt?: number;
  /** 하단 여백(px). 하단 자막바 위에 얹기 위해 기본값을 높게 둔다. */
  bottom?: number;
}

export const NameTag: React.FC<NameTagProps> = ({
  role,
  name,
  accent = COLORS.gold,
  appearAt = 0,
  bottom = 300,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - appearAt;
  if (local < 0) return null;

  const enter = spring({ frame: local, fps, config: { damping: 200 } });
  const slide = interpolate(enter, [0, 1], [-60, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        bottom,
        transform: `translateX(${slide}px)`,
        opacity: enter,
        fontFamily: KR_FONT,
        boxShadow: "0 16px 44px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 8, background: accent }} />
        <div
          style={{
            background: "rgba(8,14,26,0.94)",
            padding: "16px 34px",
          }}
        >
          {name && (
            <div
              style={{
                color: COLORS.white,
                fontWeight: 900,
                fontSize: 52,
                lineHeight: 1.1,
              }}
            >
              {name}
            </div>
          )}
          <div
            style={{
              color: name ? accent : COLORS.white,
              fontWeight: name ? 700 : 900,
              fontSize: name ? 30 : 46,
              letterSpacing: 1,
              lineHeight: 1.2,
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </div>
  );
};
