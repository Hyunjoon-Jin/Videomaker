import React from "react";
import { AbsoluteFill } from "remotion";
import provinces from "./data/provinces.json";
import { WarMap } from "./ProvinceMap";
import { makePolyFront } from "./polyfront";
import { FRONT_TRACE } from "./data/korean-war";
import { LINES, cutLatAt, partialPath, splitAt } from "./data/rail";
import { EA_LANDS, TYPHOONS, eaProject, trackPathTo } from "./data/typhoon";
import { BEACON_XY } from "./data/bongsu";
import { FEEDS, PLANT_XY, radiusOf } from "./data/power";
import { XY as TS_XY, traveled } from "./data/tongsinsa";
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

/**
 * 썸네일의 얼굴.
 *
 * 두 번 고쳤다.
 *
 * 처음에는 어두운 지도 위에 밝은 글자였다. 200px으로 줄여보니
 * (scripts/grid.py) 일곱 장이 전부 검은 사각형이고 살아남는 건 숫자
 * 하나뿐이었다. 그래서 땅을 밝게 깔고 아래를 안료색 판으로 바꿨다.
 *
 * 그때 위쪽 kicker('1959년 추석 · 태풍 사라')를 지웠다. 200px에서
 * 못 읽으니 자리만 먹는다고 봤는데, 그게 실은 이 숫자가 무엇에 대한
 * 것인지를 말하던 유일한 줄이었다. 남은 건 '849명 / 나머지 셋 다 합쳐
 * 390명'이었고, 이건 앞에 뭐가 있었는지 모르면 아무 뜻이 없다.
 *
 * 지금은 두 줄로 감싼다.
 *
 *   1959년 태풍 사라        ← 무엇에 대한 숫자인가
 *       849명
 *   한 번에 낸 사망·실종자 수  ← 무엇을 센 숫자인가
 *
 * 한 줄에 다 넣으면 '1959년, 태풍 사라 한 번에 발생한 사망·실종자 수'가
 * 되는데 28자라 글자가 36px까지 줄어든다. 200px에서 6px이니 못 읽는다.
 * 짧게 줄이면 뜻이 없어지고 길게 쓰면 안 보이므로, 줄이지 말고 나눈다.
 * 두 줄 다 62px을 지키면 200px에서 11px이라 읽힌다.
 */
const Face: React.FC<{
  /** 무엇에 대한 숫자인가 — 연도와 소재 */
  topic: string;
  /** 제일 큰 숫자 */
  big: string;
  /** 숫자에 붙는 단위 */
  unit: string;
  /** 무엇을 센 숫자인가 */
  label: string;
  /** 색면 색 */
  band: string;
  /** 색면 위 글자색. 기본은 먹색이다. */
  ink?: string;
}> = ({ topic, big, unit, label, band, ink = "#17140F" }) => {
  // 숫자 길이로 크기를 정한다. '11.5%'와 '8일'이 같은 크기면 하나는 넘친다.
  const n = big.length + unit.length * 0.62;
  const size = Math.min(360, Math.floor(1660 / Math.max(2.4, n)));
  // 글자 수가 많으면 줄이되 62px 밑으로는 안 내린다. 그 밑은 어차피 못 읽는다.
  const fit = (t: string) => Math.max(52, Math.min(70, Math.floor(1080 / Math.max(1, t.length))));
  return (
    <>
      {/* 지도와 색면이 만나는 자리. 딱 끊지 않고 한 뼘만 그늘을 준다. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(12,10,8,0) 44%, rgba(12,10,8,0.55) 56%, rgba(12,10,8,0) 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1090,
          bottom: 0,
          background: band,
        }}
      />
      <div style={{ position: "absolute", left: 64, right: 64, top: 1136 }}>
        <div
          style={{
            color: ink,
            fontSize: fit(topic),
            fontWeight: 800,
            opacity: 0.78,
            whiteSpace: "nowrap",
            marginBottom: 6,
          }}
        >
          {topic}
        </div>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              color: ink,
              fontSize: size,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: -8,
            }}
          >
            {big}
          </span>
          <span
            style={{
              color: ink,
              fontSize: Math.round(size * 0.44),
              fontWeight: 800,
              marginLeft: 8,
              opacity: 0.84,
            }}
          >
            {unit}
          </span>
        </div>
        <div
          style={{
            color: ink,
            fontSize: fit(label),
            fontWeight: 800,
            lineHeight: 1.16,
            marginTop: 16,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
    </>
  );
};

/** 편마다 하나씩 — 그리드에서 채널이 색으로 갈린다 */
const BAND = {
  war: "#B3402C",      // 산화철 붉은색
  kwar: "#8E5A3A",     // 붉은 흙
  typhoon: "#3E6480",  // 삭은 쪽빛
  rail: "#C09240",     // 놋쇠
  bongsu: "#D9741F",   // 잉걸불
  power: "#17140F",    // 먹색 — 이 편만 뒤집는다
  tongsinsa: "#7C8B52", // 국방색
} as const;

/**
 * 지도 색 — 썸네일에서는 땅이 밝고 바다가 어둡다.
 *
 * 본편은 반대다. 80초 동안 보는 화면에서 땅이 밝으면 눈이 피로하고,
 * 그 위에 얹히는 선과 글자가 죽는다. 썸네일은 0.3초 안에 형태가
 * 읽혀야 하므로 땅과 바다의 명도 차를 최대로 벌린다. 같은 지도라도
 * 보는 시간이 다르면 칠하는 법이 다르다.
 */
const M = {
  land: "#8C7F66",
  coast: "#C4B79B",
  /** 강조 — 이 편이 말하는 면 */
  hot: "#B3402C",
} as const;

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {children}
      <Grain opacity={0.3} vignette={0.34} />
    </AbsoluteFill>
  );
};

/* ── 1. 임진왜란 ───────────────────────────────────────
   개전 두 달, 평양까지 올라간 시점. 붉은 면이 제일 넓은 순간이라
   200px에서도 '밀렸다'가 한눈에 읽힌다. */
export const ThumbWar: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.92 }}>
      <WarMap
        month={2.4}
        viewBox={PENINSULA_VB}
        u={(px) => px * 0.78}
        bare
        palette={{ free: M.land, held: "#8E2A1C", coast: M.coast }}
      />
    </AbsoluteFill>
    <Face
      topic="1592년 임진왜란"
      big="11"
      unit="개월"
      label="일본군이 한양을 차지한 기간"
      band={BAND.war}
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
          <path key={p.id} d={p.d} fill={M.land} />
        ))}
        <g clipPath="url(#thLand)">
          <path d={KW_FRONT.areaAt(40)} fill="#8E2A1C" />
          <path d={KW_FRONT.lineAt(40)} fill="none" stroke="#F0A08A" strokeWidth={7} />
        </g>
        {PROVINCES.map((p) => (
          <path key={`c${p.id}`} d={p.d} fill="none" stroke={M.coast} strokeWidth={2.4} />
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      topic="1950년 6·25 전쟁"
      big="40"
      unit="일"
      label="38선에서 낙동강까지 밀린 시간"
      band={BAND.kwar}
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
          <path key={i} d={l.d} fill={M.land} stroke={M.coast} strokeWidth={2.6} />
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
      topic="1959년 태풍 사라 · 사망·실종"
      big="849"
      unit="명"
      label="루사·매미·힌남노 합쳐 390명"
      band={BAND.typhoon}
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
            <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.4} />
          ))}
          {LINES.filter((l) => l.year <= YEAR).map((l) => {
            const parts = l.north ? splitAt(l.pts, cutLatAt(YEAR)) : null;
            return (
              <g key={l.id}>
                <path
                  d={parts ? parts.south : partialPath(l.pts, 1)}
                  fill="none"
                  stroke="#7A2A16"
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {parts && (
                  <path
                    d={parts.north}
                    fill="none"
                    stroke="#4A4436"
                    strokeWidth={7}
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
        topic="1945년 이후 경의선"
        big="81"
        unit="년"
        label="서울에서 신의주행 표를 못 판 기간"
        band={BAND.rail}
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
          <path key={p.id} d={p.d} fill="#5C5340" stroke="#8E8267" strokeWidth={1.3} />
        ))}
        <path
          d={BEACON_XY.map((b, i) => `${i ? "L" : "M"}${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join("")}
          fill="none"
          stroke="#7A2E08"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {BEACON_XY.map((b) => (
          <g key={b.name}>
            <circle cx={b.x} cy={b.y} r={9} fill="#7A2E08" />
            <circle cx={b.x} cy={b.y} r={5} fill="#FFD98A" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      topic="조선 봉수 · 부산에서 서울까지"
      big="12"
      unit="시간"
      label="규정이 그랬고 실제는 닷새였다"
      band={BAND.bongsu}
    />
  </Frame>
);

/* ── 6. 5·14 단전 ─────────────────────────────────────
   단전 직후. 북쪽 큰 원 넷이 꺼지고 남쪽 작은 원 셋만 남은 그림이
   이 편의 전부다. 원 크기 차이가 200px에서도 읽힌다. */
export const ThumbPower: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      <svg
        viewBox={PENINSULA_VB}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.4} />
        ))}
        {FEEDS.map((f) => (
          <path
            key={f.id}
            d={f.d}
            fill="none"
            stroke="#4A4436"
            strokeWidth={4}
            strokeDasharray="12 14"
            opacity={0.7}
          />
        ))}
        {PLANT_XY.filter((p) => !p.ship).map((p) => {
          const off = p.north;
          // 꺼진 곳은 윤곽만, 살아 있는 곳은 채운다. 크기 차이가 이 편이다.
          const col = off ? "#241F18" : INK.flame;
          const r = radiusOf(p.kw);
          return (
            <g key={p.name}>
              <circle cx={p.x} cy={p.y} r={r} fill={col} opacity={off ? 0.85 : 0.95} />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill="none"
                stroke={off ? "#241F18" : "#FFE9BC"}
                strokeWidth={4}
              />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
    {/* 이 편만 판이 먹색이고 글자가 불빛색이다 — 불이 꺼진 편이다 */}
    <Face
      topic="1948년 5·14 단전"
      big="11.5"
      unit="%"
      label="북한이 끊자 남한에 남은 발전설비"
      band={BAND.power}
      ink={INK.flame}
    />
  </Frame>
);

/* ── 7. 조선통신사 ────────────────────────────────────
   한 줄이 한반도에서 일본 동쪽 끝까지 건너간 그림. 200px에서 읽히는
   것은 그 길이뿐이고, 그 길이가 이 편의 답이다. 뭍길과 바닷길을
   본편과 같은 색으로 나눠 그린다 — 걸어간 길보다 배로 간 길이 길다. */
export const ThumbTongsinsa: React.FC = () => {
  const t = traveled(1);
  return (
    <Frame>
      <AbsoluteFill style={{ opacity: 0.95 }}>
        <svg
          // 노정 전체(x 362~864, y 375~560)가 위쪽 3분의 1에 들어오게 잡는다.
          viewBox="318 44 604 1074"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {EA_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={M.land} stroke={M.coast} strokeWidth={2.2} />
          ))}
          <path d={t.land} fill="none" stroke="#8E2A14" strokeWidth={12} strokeLinejoin="round" />
          <path
            d={t.sea}
            fill="none"
            stroke="#16344B"
            strokeWidth={12}
            strokeDasharray="17 12"
            strokeLinecap="round"
          />
          {TS_XY.filter((s) => s.name === "한양" || s.name === "에도").map((s) => (
            <g key={s.name}>
              <circle cx={s.x} cy={s.y} r={17} fill="#241F18" stroke="#F3E7CC" strokeWidth={6} />
            </g>
          ))}
        </svg>
      </AbsoluteFill>
      <Face
        topic="1763년 조선통신사"
        big="191"
        unit="일"
        label="한양에서 에도까지 걸린 시간"
        band={BAND.tongsinsa}
      />
    </Frame>
  );
};
