import React from "react";
import { AbsoluteFill } from "remotion";
import provinces from "./data/provinces.json";
import { LINES } from "./data/rail";
import { project } from "./data/places";
import { C, INK } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;
const VIEWBOX: string = provinces.viewBox;

/**
 * 채널 아이콘 800×800.
 *
 * 프로필은 48px으로도 뜬다. 그 크기에서 글자는 못 읽으므로 글자를 넣지
 * 않는다. 네 편이 전부 이 반도 위에서 벌어지므로 반도 자체가 표식이다.
 *
 * 가로선 하나를 겹치는 이유는 채널 이름이 '땅과 때'이기 때문이다.
 * 땅은 반도가, 때는 그 위를 지나는 선이 맡는다. 38선이자 위도선이고
 * 시간 축이기도 하다.
 */
export const ChannelIcon: React.FC = () => {
  useFonts();
  // 반도의 대략적인 중심과 크기 — 아이콘 안에서 꽉 차게 키운다
  const CX = 440;
  const CY = 475;
  const K = 1.05;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* 원형 바탕 — 유튜브가 원으로 잘라내므로 모서리는 버려진다 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, #241F19 0%, ${C.bg} 74%)`,
        }}
      />
      <AbsoluteFill style={{ padding: 70 }}>
        <svg viewBox={VIEWBOX} style={{ width: "100%", height: "100%" }}>
          <g transform={`translate(${CX} ${CY}) scale(${K}) translate(${-CX} ${-CY})`}>
            {/*
              도 경계선을 그대로 두면 48px에서 뭉개져 얼룩으로 보인다.
              같은 path를 두 번 그려 실루엣만 남긴다. 아래층은 굵은 놋쇠선으로
              바깥에 테를 만들고, 위층이 안쪽을 도로 덮어 내부 경계를 지운다.
            */}
            {PROVINCES.map((p) => (
              <path
                key={`o${p.id}`}
                d={p.d}
                fill={INK.brass}
                stroke={INK.brass}
                strokeWidth={16}
                strokeLinejoin="round"
              />
            ))}
            {PROVINCES.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="#3A342A"
                stroke="#3A342A"
                strokeWidth={5}
                strokeLinejoin="round"
              />
            ))}
            {/*
              때 — 반도를 가로지르는 선 하나.
              화면 끝까지 늘이면 원형으로 잘렸을 때 뜬금없는 줄무늬가 된다.
              반도를 조금 넘는 만큼만 긋는다.
            */}
            <line
              x1={205}
              y1={project(127, 38).y}
              x2={675}
              y2={project(127, 38).y}
              stroke={INK.oxideHot}
              strokeWidth={17}
              strokeLinecap="round"
            />
          </g>
        </svg>
      </AbsoluteFill>
      <Grain opacity={0.4} vignette={0.3} />
    </AbsoluteFill>
  );
};

/**
 * 채널 배너 2560×1440.
 *
 * 유튜브는 이 이미지를 기기마다 다르게 잘라낸다. 모든 기기에서 남는
 * 영역은 가운데 1546×423뿐이라 글자는 전부 그 안에 넣는다. 바깥은
 * TV에서만 보이므로 잘려도 되는 것만 둔다 — 여기서는 지도다.
 */
const SAFE_W = 1546;
const SAFE_H = 423;

export const ChannelBanner: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* 배경 지도 — 잘려도 되는 자리에 둔다 */}
      <AbsoluteFill style={{ opacity: 0.95 }}>
        <svg
          viewBox={VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%" }}
        >
          <g transform="translate(430 0)">
            {PROVINCES.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="#252118"
                stroke="#5A5344"
                strokeWidth={2.2}
              />
            ))}
            {LINES.map((l) => (
              <path
                key={l.id}
                d={l.pts
                  .map(([lo, la], i) => {
                    const q = project(lo, la);
                    return `${i ? "L" : "M"}${q.x} ${q.y}`;
                  })
                  .join("")}
                fill="none"
                stroke={l.fast ? "#4C7A9B" : INK.brass}
                strokeWidth={3.2}
                strokeLinecap="round"
                opacity={0.8}
              />
            ))}
          </g>
        </svg>
      </AbsoluteFill>

      {/* 왼쪽에서 오른쪽으로 어둠 — 글자가 지도 위에 얹혀도 읽히게 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, ${C.bg} 22%, rgba(21,19,16,0.9) 40%, rgba(21,19,16,0.15) 60%, rgba(21,19,16,0.45) 100%)`,
        }}
      />

      {/* 안전 영역 — 모든 기기에서 남는 자리 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: SAFE_W,
            height: SAFE_H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: INK.brass,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 10,
            }}
          >
            지도 위에 시간을 얹는다
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 168,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 10,
            }}
          >
            땅과 때
          </div>
          <div style={{ height: 1, background: "#3B342A", margin: "22px 0 16px" }} />
          <div style={{ color: "#BDB3A0", fontSize: 38, fontWeight: 500 }}>
            임진왜란 · 6·25 · 태풍 · 철도
          </div>
          <div style={{ color: "#6E6657", fontSize: 27, fontWeight: 500, marginTop: 8 }}>
            좌표와 날짜는 기록에서, 그 사이는 추정이라고 밝힙니다
          </div>
        </div>
      </AbsoluteFill>

      <Grain opacity={0.42} vignette={0.5} />
    </AbsoluteFill>
  );
};
