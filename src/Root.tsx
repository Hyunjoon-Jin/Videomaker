import React from "react";
import { Composition } from "remotion";
import { ShortsDecline, SHORT_DURATION } from "./ShortsDecline";
import { ShortsImjin, IMJIN_DURATION } from "./ShortsImjin";
import { ShortsWar, WAR_DURATION } from "./ShortsWar";
import { ShortsKoreanWar, KW_DURATION } from "./ShortsKoreanWar";
import { ShortsTyphoon, ShortsTyphoonCut, TY_DURATION, TY_CUT_DURATION } from "./ShortsTyphoon";
import { ShortsRail, RAIL_DURATION } from "./ShortsRail";
import { ShortsBongsu, BONGSU_DURATION } from "./ShortsBongsu";
import { ShortsPower, POWER_DURATION } from "./ShortsPower";
import { ShortsTongsinsa, TONGSINSA_DURATION } from "./ShortsTongsinsa";
import { ShortsGanchuk, GANCHUK_DURATION } from "./ShortsGanchuk";
import { ShortsTimezone, TZ_DURATION } from "./ShortsTimezone";
import { ShortsSillok, SILLOK_DURATION } from "./ShortsSillok";
import { ShortsQuake, QUAKE_DURATION } from "./ShortsQuake";
import { ChannelBanner, ChannelIcon, ChannelWatermark } from "./Channel";
import { ThumbBongsu, ThumbGanchuk, ThumbKoreanWar, ThumbPower, ThumbRail, ThumbQuake, ThumbSillok, ThumbTimezone, ThumbTongsinsa, ThumbTyphoon, ThumbWar } from "./Thumbs";
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
    {/* 같은 소재의 20초 판 — 길이를 놓고 나란히 비교하려고 만든 것 */}
    <Composition
      id="ShortsTyphoonCut"
      component={ShortsTyphoonCut}
      durationInFrames={TY_CUT_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 4 — 철도 (전쟁도 재난도 아닌 소재) */}
    <Composition
      id="ShortsRail"
      component={ShortsRail}
      durationInFrames={RAIL_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    <Composition
      id="ShortsBongsu"
      component={ShortsBongsu}
      durationInFrames={BONGSU_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    <Composition
      id="ShortsPower"
      component={ShortsPower}
      durationInFrames={POWER_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    <Composition
      id="ShortsTongsinsa"
      component={ShortsTongsinsa}
      durationInFrames={TONGSINSA_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    <Composition
      id="ShortsGanchuk"
      component={ShortsGanchuk}
      durationInFrames={GANCHUK_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 9 — 한국 표준시 */}
    <Composition
      id="ShortsTimezone"
      component={ShortsTimezone}
      durationInFrames={TZ_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 10 — 조선왕조실록 사고 */}
    <Composition
      id="ShortsSillok"
      component={ShortsSillok}
      durationInFrames={SILLOK_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 기획 11 — 한반도 밑, 지진 깊이 */}
    <Composition
      id="ShortsQuake"
      component={ShortsQuake}
      durationInFrames={QUAKE_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
    {/* 썸네일 — 쇼츠와 같은 9:16 */}
    {([
      ["ThumbWar", ThumbWar],
      ["ThumbKoreanWar", ThumbKoreanWar],
      ["ThumbTyphoon", ThumbTyphoon],
      ["ThumbRail", ThumbRail],
      ["ThumbBongsu", ThumbBongsu],
      ["ThumbPower", ThumbPower],
      ["ThumbTongsinsa", ThumbTongsinsa],
      ["ThumbGanchuk", ThumbGanchuk],
      ["ThumbTimezone", ThumbTimezone],
      ["ThumbSillok", ThumbSillok],
      ["ThumbQuake", ThumbQuake],
    ] as const).map(([id, comp]) => (
      <Composition
        key={id}
        id={id}
        component={comp}
        durationInFrames={1}
        fps={FPS}
        width={SHORT_W}
        height={SHORT_H}
      />
    ))}
    {/* 채널 자산 — 영상이 아니라 정지 이미지로 뽑는다 */}
    <Composition
      id="ChannelIcon"
      component={ChannelIcon}
      durationInFrames={1}
      fps={FPS}
      width={800}
      height={800}
    />
    <Composition
      id="ChannelBanner"
      component={ChannelBanner}
      durationInFrames={1}
      fps={FPS}
      width={2560}
      height={1440}
    />
    {/* 워터마크는 배경 없이 뽑아야 한다 — 렌더할 때 --image-format=png */}
    <Composition
      id="ChannelWatermark"
      component={ChannelWatermark}
      durationInFrames={1}
      fps={FPS}
      width={150}
      height={150}
    />
  </>
);
