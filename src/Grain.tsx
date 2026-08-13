import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

/**
 * 그레인 + 비네트.
 *
 * 벡터로만 그린 화면은 잡티가 0이다. 사람이 실제로 보는 화면 중에
 * 잡티가 0인 것은 없다. 그 차이가 '만들어진 티'로 읽힌다.
 *
 * 타일을 프레임마다 바꿔 알갱이가 움직이게 한다. 한 장을 고정해 깔면
 * 렌즈에 먼지가 앉은 것처럼 보여서 오히려 눈에 걸린다.
 * 2프레임에 한 장씩 넘겨 15Hz — 그 이상은 지직거린다.
 */
export const Grain: React.FC<{ opacity?: number; vignette?: number }> = ({
  opacity = 0.5,
  vignette = 0.5,
}) => {
  const frame = useCurrentFrame();
  const i = Math.floor(frame / 2) % 4;

  return (
    <>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile(`grain-${i}.png`)})`,
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay",
          opacity,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 76% 58% at 50% 45%, rgba(0,0,0,0) 45%, rgba(10,7,4,${vignette}) 100%)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
