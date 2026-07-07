import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { KR_FONT } from "../fonts";
import { LiveBug } from "./Broadcast";
import { Atmosphere, AtmosphereProps } from "./Atmosphere";

/**
 * 실사 플레이트 — 생성 이미지를 시네마틱 카메라 무빙으로 애니메이팅.
 * 방향성 있는 느린 무빙(푸시인/풀아웃/틸트/팬) + 선택적 분위기 레이어(먼지·빛)로
 * 정지 이미지에 생명감을 준다. 상/하단 스크림 + 좌하단 씬 태그.
 */
export type Motion = "in" | "out" | "up" | "down" | "left" | "right" | "none";

export interface PlateProps {
  img: string;
  label?: string;
  title?: string;
  seconds?: number;
  /** 카메라 무빙 프리셋(기본 "in") */
  motion?: Motion;
  /** 무빙 강도(기본 0.09 = 9%) */
  amount?: number;
  /** 하위호환: false면 motion="none" */
  kenBurns?: boolean;
  scrimTop?: boolean;
  scrimBottom?: boolean;
  grade?: string;
  live?: boolean;
  /** 분위기 레이어(먼지·빛). true 또는 옵션 객체 */
  atmosphere?: boolean | AtmosphereProps;
  /** Veo 등 외부 클립 경로(있으면 이미지 대신 재생) */
  clip?: string;
}

const EASE = Easing.bezier(0.33, 0, 0.2, 1);

export const Plate: React.FC<PlateProps> = ({
  img,
  label,
  title,
  seconds,
  motion = "in",
  amount = 0.09,
  kenBurns = true,
  scrimTop = true,
  scrimBottom = true,
  grade,
  live = false,
  atmosphere,
  clip,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: EASE,
    extrapolateRight: "clamp",
  });

  const m: Motion = clip ? "none" : kenBurns ? motion : "none";
  // 팬/틸트 시 가장자리 노출 방지용 베이스 오버스캔
  const base = m === "in" || m === "out" || m === "none" ? 1.03 : 1.09;
  const pan = amount * 100; // % 이동량

  let scale = base;
  let tx = 0;
  let ty = 0;
  if (m === "in") scale = base + amount * p;
  else if (m === "out") scale = base + amount * (1 - p);
  else if (m === "up") ty = interpolate(p, [0, 1], [pan / 2, -pan / 2]);
  else if (m === "down") ty = interpolate(p, [0, 1], [-pan / 2, pan / 2]);
  else if (m === "left") tx = interpolate(p, [0, 1], [pan / 2, -pan / 2]);
  else if (m === "right") tx = interpolate(p, [0, 1], [-pan / 2, pan / 2]);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {clip ? (
          <OffthreadVideo
            src={staticFile(clip)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: grade }}
          />
        ) : (
          <Img
            src={staticFile(img)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
              filter: grade,
            }}
          />
        )}
      </AbsoluteFill>

      {atmosphere && (
        <Atmosphere {...(typeof atmosphere === "object" ? atmosphere : {})} />
      )}

      {scrimTop && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%)",
          }}
        />
      )}
      {scrimBottom && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 30%)",
          }}
        />
      )}

      {live && <LiveBug />}

      {(label || title) && (
        <div
          style={{
            position: "absolute",
            left: 44,
            bottom: 30,
            fontFamily: KR_FONT,
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 1,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {label}
          {title ? ` · ${title}` : ""}
          {seconds ? ` · ${seconds}s` : ""}
        </div>
      )}
    </AbsoluteFill>
  );
};
