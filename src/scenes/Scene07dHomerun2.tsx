import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";
import { LiveBug } from "../components/Broadcast";
import { BlurPatch } from "../components/BlurPatch";

/**
 * Scene 7D — 홈런 ② 대형 수주 (8초, 추가).
 * 배경: 업로드된 두 번째 홈런 영상(clips/S07D.mp4).
 * 원본 방송 그래픽(우상단 채널 버그·좌하단 자막·우하단 박스) 블러 처리.
 * S07(3점)에 이어 4번째 수주 = 최상강남 4점.
 */
export const Scene07dHomerun2: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S07.png" clip="clips/S07D.mp4" label="Scene 7D" title="홈런 ②" seconds={8} />

    {/* 원본 방송 그래픽 가림 */}
    <BlurPatch corner="tr" width={320} height={230} />
    <BlurPatch corner="bl" width={630} height={185} />
    <BlurPatch corner="br" width={560} height={320} />

    <LiveBug />
    <Scoreboard
      homeScore={4}
      awayScore={0}
      inning="4회 말"
      count={{ balls: 0, strikes: 0, outs: 1 }}
    />
    <Subtitle
      kind="caption"
      text="◎◎물산 120억 수주"
      sub="시즌 최장 비거리 대형 아치!"
      appearAt={24}
    />
  </AbsoluteFill>
);
