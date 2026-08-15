import React from "react";
import { AbsoluteFill } from "remotion";
import provinces from "./data/provinces.json";
import { LINES, partialPath } from "./data/rail";
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
  /*
    담기는 크기.

    지도 좌표는 0..1000을 꽉 채우고 제주는 y 962~1000, 반도 북단은 y 0에
    닿아 있다. 그대로 그리면 위아래가 액자에 잘린다 — 실제로 제주가 밑변에
    걸려 반쯤 잘려 있었다. 게다가 유튜브는 프로필을 원으로 오려내므로
    네 귀퉁이는 버려지고, 위아래 끝은 원이 좁아지는 자리라 더 위험하다.

    지도 1000단위를 아이콘 800px 중 640px에만 넣는다. 위아래로 80px씩
    남으므로 원에 잘리지 않는다. viewBox를 1250으로 키우면 그 배율이 된다.
  */
  const PAD = (1000 * 800) / 640 / 2 - 500; // = 125
  const box = `${-PAD} ${-PAD} ${1000 + PAD * 2} ${1000 + PAD * 2}`;
  const y38 = project(127, 38).y;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* 원형 바탕 — 유튜브가 원으로 잘라내므로 모서리는 버려진다 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, #2A2319 0%, ${C.bg} 76%)`,
        }}
      />
      <AbsoluteFill>
        <svg viewBox={box} style={{ width: "100%", height: "100%" }}>
          {/*
            48px에서도 읽혀야 한다.

            전에는 어두운 면에 가는 놋쇠 테를 둘렀는데, 그 크기가 되면
            테는 사라지고 배경과 비슷한 갈색 얼룩만 남았다. 아이콘은
            그림이 아니라 표식이므로 면을 통째로 밝게 채운다. 같은 path를
            두껍게 한 번 더 깔아 도와 도 사이 실틈을 메워 하나의 실루엣이
            되게 한다.
          */}
          {PROVINCES.map((p) => (
            <path
              key={`o${p.id}`}
              d={p.d}
              fill={INK.brass}
              stroke={INK.brass}
              strokeWidth={9}
              strokeLinejoin="round"
            />
          ))}

          {/*
            때 — 반도를 가로지르는 선 하나. 채널 이름이 '땅과 때'라
            땅은 반도가, 때는 이 선이 맡는다. 38선이자 위도선이고 시간 축이다.

            놋쇠 위에 붉은 선을 그냥 얹으면 둘 다 따뜻한 색이라 작은 크기에서
            뭉갠다. 바탕색으로 먼저 굵게 그어 홈을 파고 그 안에 붉은 선을
            넣으면, 색이 아니라 형태로 갈라져 48px에서도 살아남는다.
          */}
          <line
            x1={185}
            y1={y38}
            x2={700}
            y2={y38}
            stroke={C.bg}
            strokeWidth={44}
            strokeLinecap="round"
          />
          <line
            x1={195}
            y1={y38}
            x2={690}
            y2={y38}
            stroke={INK.oxideHot}
            strokeWidth={22}
            strokeLinecap="round"
          />
        </svg>
      </AbsoluteFill>
      <Grain opacity={0.3} vignette={0.28} />
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
          {/* 0.9배로 줄여 제주가 밑변에 걸리지 않게 한다.
              그대로 두면 지도 y가 0~1000을 꽉 채워 제주가 잘려 나간다. */}
          <g transform="translate(430 0) translate(500 500) scale(0.9) translate(-500 -500)">
            {PROVINCES.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="#282318"
                stroke="#645C4A"
                strokeWidth={2.2}
              />
            ))}
            {/*
              본편과 같은 곡선을 쓴다.
              정차역 좌표를 직선으로 이으면 역마다 각이 져서 철길이 아니라
              접은 종이가 된다. 경의선과 함경선에서 특히 티가 났다.
            */}
            {LINES.map((l) => (
              <path
                key={l.id}
                d={partialPath(l.pts, 1)}
                fill="none"
                stroke={l.fast ? "#4C7A9B" : INK.brass}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
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
          <div style={{ width: 620, height: 1, background: "#4A4234", margin: "22px 0 16px" }} />
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
