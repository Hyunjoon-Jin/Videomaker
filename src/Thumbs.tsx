import React from "react";
import { AbsoluteFill } from "remotion";
import provinces from "./data/provinces.json";
import { WarMap } from "./ProvinceMap";
import { makePolyFront } from "./polyfront";
import { FRONT_TRACE } from "./data/korean-war";
import { LINES, cutLatAt, partialPath, splitAt } from "./data/rail";
import { EA_LANDS, TYPHOONS, eaProject, trackPathTo } from "./data/typhoon";
import { BEACON_XY } from "./data/bongsu";
import { C, INK } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";

/**
 * 쇼츠 썸네일 1080×1920.
 *
 * 본편과 다른 물건이다. 영상은 80초 동안 읽히면 되지만 썸네일은 그리드에서
 * 폭 200px으로 뜬다. 그 크기에서 살아남는 것은 큰 숫자 하나와 짧은 한 줄뿐이라,
 * 본편 자막을 그대로 키운다고 되지 않는다.
 *
 * 지도는 넣는다. 지우면 다른 채널 썸네일과 구분이 안 된다. 대신 사건 라벨과
 * 날짜는 전부 뺀다 — 200px에서는 얼룩으로만 보인다.
 *
 * 아래 15%는 비워둔다. 쇼츠는 그 자리에 조회수를 얹는다.
 */

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;
const KW_FRONT = makePolyFront(FRONT_TRACE, "north");

/**
 * 반도 썸네일 공통 틀.
 *
 * 처음에는 반도를 꽉 채웠는데, 그러면 낙동강 방어선이 숫자에 가려졌다.
 * 그 그림이 이 편의 전부인데 숫자가 그걸 덮으면 안 된다. 반도가 화면
 * 위쪽 65%에서 끝나도록 물러선다. 세로비는 1080:1920과 같게 맞춘다.
 */
const PENINSULA_VB = "40 -50 900 1600";

const FREE = "#2C2B24";
const HELD = "#7A2A20";

/** 지도 위에 얹는 글자 — 네 편이 같은 틀을 쓴다 */
const Face: React.FC<{
  /** 제일 큰 숫자. 여기가 썸네일의 전부다. */
  big: string;
  /** 숫자에 붙는 단위 */
  unit: string;
  /** 숫자가 무엇인지. 반드시 한 줄 — 두 줄이 되면 200px에서 못 읽는다. */
  label: string;
  /** 위쪽 작은 글자 — 무슨 소재인지 */
  kicker: string;
  color: string;
}> = ({ big, unit, label, kicker, color }) => (
  <>
    {/* 글자 자리 어둠. 본편보다 세게 — 썸네일은 글자가 이겨야 한다 */}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(12,10,8,0.86) 0%, rgba(12,10,8,0.3) 14%, rgba(12,10,8,0) 30%, rgba(12,10,8,0.55) 52%, rgba(12,10,8,0.93) 68%)",
      }}
    />
    <AbsoluteFill style={{ padding: "0 68px" }}>
      <div
        style={{
          position: "absolute",
          top: 74,
          left: 68,
          color: INK.brass,
          fontSize: 54,
          fontWeight: 800,
          letterSpacing: 4,
        }}
      >
        {kicker}
      </div>
      {/* 숫자는 아래에서 300px 띄운다. 그 아래는 쇼츠 UI 자리다. */}
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 300 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              color,
              fontSize: 400,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: -8,
            }}
          >
            {big}
          </span>
          <span
            style={{
              color: C.text,
              fontSize: 148,
              fontWeight: 800,
              marginLeft: 8,
            }}
          >
            {unit}
          </span>
        </div>
        {/*
          nowrap이라 길면 그냥 잘려 나간다 — 실제로 태풍 편 라벨이
          "…다 합쳐도 39"에서 끊겼다. 글자 수로 크기를 줄여 항상 한 줄에
          들어오게 한다. 폭은 1080에서 좌우 여백 68씩 뺀 944.
        */}
        <div
          style={{
            color: C.text,
            fontSize: Math.min(86, Math.floor(944 / Math.max(1, label.length))),
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 16,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  </>
);

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {children}
      <Grain opacity={0.34} vignette={0.4} />
    </AbsoluteFill>
  );
};

/* ── 1. 임진왜란 ───────────────────────────────────────
   개전 두 달, 평양까지 올라간 시점. 붉은 면이 제일 넓은 순간이라
   200px에서도 '밀렸다'가 한눈에 읽힌다. */
export const ThumbWar: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.92 }}>
      <WarMap month={2.4} viewBox={PENINSULA_VB} u={(px) => px * 0.78} bare />
    </AbsoluteFill>
    <Face
      kicker="임진왜란 7년"
      big="11"
      unit="개월"
      label="일본군이 한양에 있던 시간"
      color={INK.oxideHot}
    />
  </Frame>
);

/* ── 2. 6·25 ──────────────────────────────────────────
   낙동강 방어선. 남는 땅이 제일 작은 순간. */
export const ThumbKoreanWar: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.92 }}>
      <svg
        viewBox={PENINSULA_VB}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <clipPath id="thLand">
            {PROVINCES.filter((p) => p.id !== "jeju").map((p) => (
              <path key={p.id} d={p.d} />
            ))}
          </clipPath>
        </defs>
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill={FREE} />
        ))}
        <g clipPath="url(#thLand)">
          <path d={KW_FRONT.areaAt(40)} fill={HELD} />
          <path d={KW_FRONT.lineAt(40)} fill="none" stroke="#D4694F" strokeWidth={5} />
        </g>
        {PROVINCES.map((p) => (
          <path key={`c${p.id}`} d={p.d} fill="none" stroke="#4A4638" strokeWidth={2} />
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      kicker="6·25 · 1950년 6월 25일"
      big="40"
      unit="일"
      label="낙동강까지 밀리는 데"
      color="#D4694F"
    />
  </Frame>
);

/* ── 3. 태풍 ──────────────────────────────────────────
   넷의 경로를 다 그린다. 색이 넷이라 200px에서도 '여러 개'가 읽힌다. */
export const ThumbTyphoon: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      {/*
        EA 창(1000×1600)을 그대로 쓰면 9:16으로 잘리면서 경로가 화면
        한가운데에 자잘하게 뭉친다. 네 경로의 실제 범위(x 343~912,
        y 178~1356)에 맞춰 다시 잡는다. 남쪽 꼬리는 글자 밑으로 들어가도 된다.
      */}
      <svg
        viewBox="190 120 748 1330"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {EA_LANDS.map((l, i) => (
          <path key={i} d={l.d} fill="#2F2920" stroke="#6E6555" strokeWidth={2.6} />
        ))}
        {TYPHOONS.map((t) => (
          <path
            key={t.id}
            d={trackPathTo(t, 1)}
            fill="none"
            stroke={t.color}
            strokeWidth={t.id === "sarah" ? 11 : 6}
            strokeLinecap="round"
            opacity={t.id === "sarah" ? 1 : 0.55}
          />
        ))}
        {/* 사라의 상륙 지점만 찍는다. 이 편의 주인공이다. */}
        {(() => {
          const s = TYPHOONS[0];
          const q = eaProject(s.landAt[0], s.landAt[1]);
          return (
            <>
              <circle cx={q.x} cy={q.y} r={34} fill="none" stroke={s.color} strokeWidth={7} />
              <circle cx={q.x} cy={q.y} r={11} fill={s.color} />
            </>
          );
        })()}
      </svg>
    </AbsoluteFill>
    <Face
      kicker="1959년 추석 · 태풍 사라"
      big="849"
      unit="명"
      label="나머지 셋 다 합쳐 390명"
      color="#D4694F"
    />
  </Frame>
);

/* ── 4. 철도 ──────────────────────────────────────────
   1945년. 북으로 가던 선이 전부 회색 점선이 된 순간. */
export const ThumbRail: React.FC = () => {
  const YEAR = 1946;
  return (
    <Frame>
      <AbsoluteFill style={{ opacity: 0.95 }}>
        <svg
          viewBox={PENINSULA_VB}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill="#302C22" stroke="#5E5747" strokeWidth={2} />
          ))}
          {LINES.filter((l) => l.year <= YEAR).map((l) => {
            const parts = l.north ? splitAt(l.pts, cutLatAt(YEAR)) : null;
            return (
              <g key={l.id}>
                <path
                  d={parts ? parts.south : partialPath(l.pts, 1)}
                  fill="none"
                  stroke="#D9A45E"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {parts && (
                  <path
                    d={parts.north}
                    fill="none"
                    stroke="#6A6252"
                    strokeWidth={6}
                    strokeDasharray="16 18"
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <Face
        kicker="경의선 · 1906 – 1945"
        big="81"
        unit="년"
        label="신의주행 표를 못 판 시간"
        color={INK.brass}
      />
    </Frame>
  );
};

/* ── 5. 봉수 ──────────────────────────────────────────
   불이 다 붙은 상태. 부산에서 남산까지 한 줄로 이어진 그림이 이 편의 전부다.
   반도 전체가 아니라 그 줄만 담기게 남부로 내려 잡는다. */
export const ThumbBongsu: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      <svg
        // 봉수 사슬(x 453~625, y 556~811)만 담기게 바짝 당긴다.
        // 반도 전체를 잡으면 줄이 손톱만 해져서 이 편의 그림이 사라진다.
        viewBox="342 473 394 700"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill="#1B1810" stroke="#4C432E" strokeWidth={1.1} />
        ))}
        <path
          d={BEACON_XY.map((b, i) => `${i ? "L" : "M"}${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join("")}
          fill="none"
          stroke={INK.ember}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {BEACON_XY.map((b) => (
          <g key={b.name}>
            <circle cx={b.x} cy={b.y} r={7} fill={INK.flame} opacity={0.55} />
            <circle cx={b.x} cy={b.y} r={3.2} fill="#FFF3D6" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      kicker="조선 봉수 · 제2로 직봉"
      big="12"
      unit="시간"
      label="실제로는 닷새가 걸렸다"
      color={INK.flame}
    />
  </Frame>
);
