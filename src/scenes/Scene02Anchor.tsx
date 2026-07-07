import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 2 — AI 앵커 브리핑 (20초).
 * 배경: Imagen 생성 뉴스 스튜디오 플레이트(실제 제작 시 HeyGen 앵커 합성으로 교체).
 * 오버레이: 뉴스 하단 자막바.
 */
export const Scene02Anchor: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S02.png" label="Scene 2" title="AI 앵커 브리핑" seconds={20} />
    <Subtitle
      kind="newsbar"
      label="속보"
      text="전 세계 B2B 업계 초긴장… 강남·서부, 하나로 뭉쳤다"
      appearAt={20}
    />
  </AbsoluteFill>
);
