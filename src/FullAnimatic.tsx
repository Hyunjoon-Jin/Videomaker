import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { SCENES, secToFrames } from "./timeline";
import { SCENE_COMPONENTS } from "./registry";

/**
 * 전체 통합 애니매틱 — SCENES 순서대로 이어붙인다.
 * 개별 씬 컴포지션과 동일한 컴포넌트를 재사용하므로, 씬 하나를 교체 렌더링해도
 * 전체 영상에 그대로 반영된다.
 */
export const FullAnimatic: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Series>
        {SCENES.map((s) => {
          const Comp = SCENE_COMPONENTS[s.id];
          return (
            <Series.Sequence
              key={s.id}
              durationInFrames={secToFrames(s.seconds)}
            >
              <Comp />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
