import React from "react";
import { Composition } from "remotion";
import { ShortsDecline, SHORT_DURATION } from "./ShortsDecline";
import { ShortsImjin, IMJIN_DURATION } from "./ShortsImjin";
import { ShortsWar, WAR_DURATION } from "./ShortsWar";
import { ShortsKoreanWar, KW_DURATION } from "./ShortsKoreanWar";
import { ShortsTyphoon, TY_DURATION } from "./ShortsTyphoon";
import { FPS, SHORT_H, SHORT_W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    {/* 기획 1 — 공공데이터 (KOSIS 실데이터 대기 중) */}
    <Composition
      id="ShortsDecline"
      component={ShortsDecline}
      durationInFrames={SHORT_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 2 — 마이크로 히스토리 */}
    <Composition
      id="ShortsImjin"
      component={ShortsImjin}
      durationInFrames={IMJIN_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 2b — 임진왜란 7년 전편 */}
    <Composition
      id="ShortsWar"
      component={ShortsWar}
      durationInFrames={WAR_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 2c — 6·25 전쟁 */}
    <Composition
      id="ShortsKoreanWar"
      component={ShortsKoreanWar}
      durationInFrames={KW_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 3 — 태풍 (전쟁이 아닌 소재) */}
    <Composition
      id="ShortsTyphoon"
      component={ShortsTyphoon}
      durationInFrames={TY_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
  </>
);
