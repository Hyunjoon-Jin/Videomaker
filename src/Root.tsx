import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import { SCENES, secToFrames, TOTAL_FRAMES } from "./timeline";
import { SCENE_COMPONENTS } from "./registry";
import { FullAnimatic } from "./FullAnimatic";

/**
 * 컴포지션 등록.
 * - "FullAnimatic": 전체 2분 40초(≈2:52) 통합본.
 * - 각 씬: 개별 컴포지션으로 분리 등록 → 나중에 개별 씬만 교체 렌더링 가능.
 *   렌더 예)  npx remotion render S07-Homerun out/S07.mp4
 *
 * 규격: 1920×1080 (가이드의 Veo 출력 1080p 기준), 30fps.
 * 가이드 원문은 23.976fps지만 애니매틱은 정수 fps로 단순화.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FullAnimatic"
        component={FullAnimatic}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {SCENES.map((s) => {
        const Comp = SCENE_COMPONENTS[s.id];
        return (
          <Composition
            key={s.id}
            id={s.id}
            component={Comp}
            durationInFrames={secToFrames(s.seconds)}
            fps={FPS}
            width={1920}
            height={1080}
          />
        );
      })}
    </>
  );
};
