import React from "react";

/**
 * 원본 영상에 박힌 방송 그래픽(스코어바·채널 버그·선수명)을 가리는 블러 패치.
 * 지정한 코너에 backdrop-blur + feather 마스크를 얹는다.
 */
export type Corner = "tl" | "tr" | "bl" | "br";

export interface BlurPatchProps {
  corner: Corner;
  width: number;
  height: number;
  blur?: number;
  tint?: number; // 0~1
  /** 코너에서의 여백(px) */
  inset?: number;
}

const CENTER: Record<Corner, string> = {
  tl: "18% 28%",
  tr: "82% 28%",
  bl: "18% 72%",
  br: "82% 72%",
};

export const BlurPatch: React.FC<BlurPatchProps> = ({
  corner,
  width,
  height,
  blur = 20,
  tint = 0.3,
  inset = 0,
}) => {
  const pos: React.CSSProperties = { position: "absolute", width, height };
  if (corner === "tl") Object.assign(pos, { top: inset, left: inset });
  if (corner === "tr") Object.assign(pos, { top: inset, right: inset });
  if (corner === "bl") Object.assign(pos, { bottom: inset, left: inset });
  if (corner === "br") Object.assign(pos, { bottom: inset, right: inset });

  const mask = `radial-gradient(115% 118% at ${CENTER[corner]}, #000 82%, transparent 100%)`;

  return (
    <div
      style={{
        ...pos,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        background: `rgba(6,10,17,${tint})`,
        WebkitMaskImage: mask,
        maskImage: mask,
        pointerEvents: "none",
      }}
    />
  );
};
