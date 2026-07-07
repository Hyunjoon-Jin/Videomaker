import React from "react";
import { AbsoluteFill } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 2 — AI 앵커 브리핑 (20초).
 * 배경: HeyGen 앵커(그린스크린) + Veo 스튜디오 합성 예정 → 플레이스홀더.
 * 오버레이: 뉴스 하단 자막바(실제 구현).
 */
export const Scene02Anchor: React.FC = () => (
  <AbsoluteFill>
    <Placeholder
      label="Scene 2"
      title="AI 앵커 브리핑"
      seconds={20}
      tone="news"
      note="HeyGen 앵커 아바타(그린스크린) → Ultra Key → Veo 뉴스 스튜디오 배경 합성. 앵커 6초 · 인서트 B컷 4초 · 앵커 6초 · 화이트 플래시 전환."
    />
    <Subtitle
      kind="newsbar"
      label="속보"
      text="전 세계 B2B 업계 초긴장… 강남·서부, 하나로 뭉쳤다"
      appearAt={20}
    />
  </AbsoluteFill>
);
