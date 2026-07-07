import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { KR_FONT } from "../fonts";
import { LiveBug } from "./Broadcast";

/**
 * 실사 플레이트 — Imagen(또는 Veo 프레임)으로 생성한 이미지를 full-bleed 배경으로.
 * 켄번스(느린 줌)로 정지 이미지에 생명감 부여 + 상/하단 스크림(오버레이 가독성).
 * 우하단에 작은 씬 태그(애니매틱 식별용).
 *
 * 실제 영상 클립이 준비되면 <Img>를 <OffthreadVideo>로 바꾸면 됨.
 */
export interface PlateProps {
  img: string; // staticFile 상대경로, 예: "scenes/S07.png"
  label?: string; // "Scene 7"
  title?: string; // "홈런 몽타주"
  seconds?: number;
  kenBurns?: boolean;
  scrimTop?: boolean; // 스코어바 가독성
  scrimBottom?: boolean; // 자막 가독성
  grade?: string; // CSS filter, 예: "saturate(0.6)"
  live?: boolean; // 좌상단 LIVE 방송 버그(중계 느낌, PART2)
}

export const Plate: React.FC<PlateProps> = ({
  img,
  label,
  title,
  seconds,
  kenBurns = true,
  scrimTop = true,
  scrimBottom = true,
  grade,
  live = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = kenBurns
    ? interpolate(frame, [0, durationInFrames], [1.06, 1.14])
    : 1;
  const drift = kenBurns
    ? interpolate(frame, [0, durationInFrames], [-1.2, 1.2])
    : 0;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(img)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${drift}%)`,
            filter: grade,
          }}
        />
      </AbsoluteFill>

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
