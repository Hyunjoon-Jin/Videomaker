import React from "react";
import { AbsoluteFill } from "remotion";
import { C, INK } from "./theme";
import { Grain } from "./Grain";
import { graticule, orth, trackPath } from "./globe";
import { useFonts } from "./fonts";

/**
 * 채널 아이콘 800×800.
 *
 * 전에는 한반도 실루엣이었다. 지금까지 만든 네 편이 전부 한반도라
 * 자연스러워 보였지만, 그건 표식이 아니라 지금 가진 목록이었다. 다른
 * 땅을 한 편이라도 다루는 순간 채널 얼굴부터 틀린 말이 된다.
 *
 * 남기는 것은 매번 하는 일이다 — 지도를 깔고, 그 위로 선 하나를 시간에
 * 따라 움직인다. 그래서 격자(지도)와 그것을 가로지르는 선(때) 둘만 둔다.
 * 채널 이름이 '땅과 때'인 것도 그대로 맞아떨어진다.
 *
 * 프로필은 48px으로도 뜬다. 그 크기에 살아남는 것은 두세 개뿐이므로
 * 굵은 테두리 원과 굵은 가로선을 주역으로 두고, 격자는 큰 크기에서만
 * 보이는 결로 깐다.
 */
export const ChannelIcon: React.FC = () => {
  useFonts();
  // 유튜브가 원으로 오려내므로 1000 안에서 넉넉히 물러선다
  const R = 322;
  const CX = 500;
  const CY = 500;
  // 자취가 지나는 자리 — 가로선은 이 근처를 지나야 둘이 한 몸으로 읽힌다
  const BAR_Y = CY - R * 0.2;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, #2A2319 0%, ${C.bg} 78%)`,
        }}
      />
      <AbsoluteFill>
        <svg viewBox="0 0 1000 1000" style={{ width: "100%", height: "100%" }}>
          {/* 구 안쪽 — 바탕보다 조금 밝게 해서 테 없이도 면이 잡히게 */}
          <circle cx={CX} cy={CY} r={R} fill="#241F17" />

          {/* 격자 — 48px에서는 사라진다. 큰 크기에서 지도라는 것을 말해준다 */}
          <g
            stroke={INK.brass}
            strokeWidth={5}
            fill="none"
            opacity={0.45}
            strokeLinecap="round"
          >
            {graticule(R, CX, CY, 30).map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* 테두리 — 작은 크기에서 이 원이 표식의 절반을 맡는다 */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={INK.brass} strokeWidth={26} />

          {/*
            때 — 지구를 가로지르는 선.

            원 안에만 두면 금지 표지처럼 읽히므로 양옆으로 조금 넘긴다.
            지나가는 축이지 그어버린 줄이 아니다. 정중앙을 피해 위로 올린
            것도 같은 이유다.

            놋쇠 위에 붉은 선을 그냥 얹으면 둘 다 따뜻한 색이라 작은 크기에서
            뭉갠다. 바탕색으로 먼저 굵게 그어 홈을 파고 그 안에 넣으면
            색이 아니라 형태로 갈라져 48px에서도 살아남는다.
          */}
          <line
            x1={CX - R - 66}
            y1={BAR_Y}
            x2={CX + R + 66}
            y2={BAR_Y}
            stroke={C.bg}
            strokeWidth={62}
            strokeLinecap="round"
          />
          <line
            x1={CX - R - 56}
            y1={BAR_Y}
            x2={CX + R + 56}
            y2={BAR_Y}
            stroke={INK.oxideHot}
            strokeWidth={30}
            strokeLinecap="round"
          />
          {/* 선 위의 한 점 — 지금 보고 있는 때 */}
          <circle cx={CX + R * 0.34} cy={BAR_Y} r={30} fill={C.bg} />
          <circle cx={CX + R * 0.34} cy={BAR_Y} r={16} fill={C.text} />
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
 * TV에서만 보이므로 잘려도 되는 것만 둔다.
 *
 * 전에는 그 자리에 한반도 철도망을 깔고, 안전 영역에는 '임진왜란 · 6·25 ·
 * 태풍 · 철도'라고 지금 있는 네 편을 적어두었다. 둘 다 다섯 번째 영상을
 * 올리는 순간 낡는다. 소재를 적는 대신 이 채널이 지키는 것을 적는다.
 */
const SAFE_W = 1546;
const SAFE_H = 423;

/**
 * 지구 위의 자취 셋.
 *
 * 실제 무엇의 경로도 아니다. 특정 사건을 그리면 그 사건의 채널이 되므로
 * 일부러 아무 데도 아닌 선을 둔다. 굵기와 색만 본편의 어법을 따른다 —
 * 밀고 올라가는 선, 휘어 도는 선, 곧게 뻗는 선.
 */
const TRACKS: Array<{ pts: Array<[number, number]>; color: string; w: number }> = [
  // 머리(끝점)가 화면 밖으로 나가면 '어디까지 왔는지'가 안 보인다.
  // 셋 다 지구 앞면 안쪽에서 끝나게 잡았다.
  { pts: [[-68, -10], [-34, 12], [-6, 30], [22, 44], [50, 50]], color: INK.oxideHot, w: 9 },
  { pts: [[-56, 44], [-24, 52], [8, 48], [30, 38], [44, 26]], color: INK.brass, w: 7 },
  { pts: [[-44, -24], [-14, -10], [14, -2], [38, 2]], color: INK.indigoHot, w: 6 },
];

export const ChannelBanner: React.FC = () => {
  useFonts();
  // 지구는 오른쪽에 크게. 잘려도 되는 자리이므로 화면 밖으로 걸쳐도 된다
  const R = 760;
  const CX = 1900;
  const CY = 700;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <AbsoluteFill>
        <svg viewBox="0 0 2560 1440" style={{ width: "100%", height: "100%" }}>
          <circle cx={CX} cy={CY} r={R} fill="#211C15" />
          <g
            stroke={INK.brass}
            strokeWidth={2.6}
            fill="none"
            opacity={0.5}
            strokeLinecap="round"
          >
            {graticule(R, CX, CY, 15).map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={INK.brass}
            strokeWidth={6}
            opacity={0.75}
          />
          {TRACKS.map((t, i) => (
            <path
              key={i}
              d={trackPath(t.pts, R, CX, CY)}
              fill="none"
              stroke={t.color}
              strokeWidth={t.w}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ))}
          {/* 각 자취의 머리 — 지금 어디까지 왔는지 */}
          {TRACKS.map((t, i) => {
            const q = orth(t.pts[t.pts.length - 1][0], t.pts[t.pts.length - 1][1], R, CX, CY);
            if (!q.front) return null;
            return <circle key={`h${i}`} cx={q.x} cy={q.y} r={t.w * 1.5} fill={t.color} />;
          })}
        </svg>
      </AbsoluteFill>

      {/* 왼쪽에서 오른쪽으로 어둠 — 글자가 지구 위에 얹혀도 읽히게 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, ${C.bg} 20%, rgba(21,19,16,0.92) 38%, rgba(21,19,16,0.2) 58%, rgba(21,19,16,0.35) 100%)`,
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
          <div style={{ width: 560, height: 1, background: "#4A4234", margin: "22px 0 16px" }} />
          {/*
            소재를 나열하지 않는다. 소재는 매번 바뀌고 이건 안 바뀐다.

            '기록에 있는 값과 채운 값을 구분해서 씁니다'라고 적었다가 고쳤다.
            배너는 누구한테 해명하는 자리가 아니라 이 채널이 어떤 채널인지
            한눈에 보여주는 자리다. 설명문이 아니라 표어여야 한다.
            본편 자막이 전부 평서형인데 채널 얼굴만 존댓말이면 목소리가
            따로 논다.
          */}
          <div
            style={{
              color: "#BDB3A0",
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            기록은 기록대로, 추정은 추정대로
          </div>
        </div>
      </AbsoluteFill>

      <Grain opacity={0.42} vignette={0.5} />
    </AbsoluteFill>
  );
};
