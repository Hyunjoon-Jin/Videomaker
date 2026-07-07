import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";
import { LiveBug } from "../components/Broadcast";
import { BlurPatch } from "../components/BlurPatch";

/**
 * Scene 8 — 도루: 고객사 탈환 (10초).
 * 배경: 업로드된 도루/세이프 영상(clips/S08.mp4).
 * 원본 방송 그래픽 3곳(좌상단 선수명·우상단 채널 버그·우하단 스코어바) 블러 처리.
 * 그 위에 LIVE 버그·자막·우리 스코어바 오버레이.
 */
export const Scene08Steal: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S08.png" clip="clips/S08.mp4" label="Scene 8" title="도루 · 고객사 탈환" seconds={10} />

    {/* 원본 방송 그래픽 가림 */}
    <BlurPatch corner="tl" width={300} height={130} />
    <BlurPatch corner="tr" width={780} height={155} />
    <BlurPatch corner="br" width={590} height={365} />

    <LiveBug />
    <Scoreboard
      homeScore={4}
      awayScore={0}
      inning="5회 초"
      bases={[false, true, false]}
      count={{ balls: 1, strikes: 1, outs: 1 }}
    />
    <Subtitle
      kind="lower"
      text="○○ 고객사 탈환 — 허를 찌른 도루, 세이프!"
      appearAt={150}
    />
  </AbsoluteFill>
);
