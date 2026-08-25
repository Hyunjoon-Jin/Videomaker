import React from "react";
import { AbsoluteFill } from "remotion";
import provinces from "./data/provinces.json";
import { WarMap } from "./ProvinceMap";
import { makePolyFront } from "./polyfront";
import { FRONT_TRACE } from "./data/korean-war";
import { LINES, cutLatAt, partialPath, splitAt } from "./data/rail";
import { EA_KOREA, EA_LANDS, TYPHOONS, eaProject, trackPathTo } from "./data/typhoon";
import { BEACON_XY } from "./data/bongsu";
import { FEEDS, PLANT_XY, radiusOf } from "./data/power";
import { XY as TS_XY, traveled } from "./data/tongsinsa";
import { ZONE_XY, dikePath, polyPath } from "./data/ganchuk";
import { AKASHI, MERIDIANS, SEOUL, meridianPath, meridianX } from "./data/timezone";
import { FLIGHT, OLD_SAGO, flightPathTo } from "./data/sillok";
import { MAP_KOREA, MAP_LANDS, MARKED, MAX_DEPTH, PROFILE, TRENCH_LON, colorOf, lonX, radiusOf as qRadius } from "./data/quake";
import { YEARS as EX_YEARS } from "./data/race";
import { SITES as SNOW_SITES, BODY_CM as SNOW_BODY_CM } from "./data/snow";
import { MAP as WD_MAP, SOKCHO as WD_SOKCHO } from "./data/wind";
import {
  JEJU as CN_JEJU,
  LIMIT as CN_LIMIT,
  SEOUL as CN_SEOUL,
  latY as cnLatY,
} from "./data/canopus";
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
  ganchuk: "#3E6B62",   // 갯벌 위의 물빛
  tz: "#4E4867",        // 남보라 — 새벽하늘
  sillok: "#63333F",    // 자단빛 — 책갑 물들이던 색
  quake: "#5E2E1C",     // 녹슨 쇠 — 땅속. 6·25의 붉은 흙과 갈리게 더 어둡게
  datum: "#3F4C55",     // 청사진 — 측량 도면의 회청색. 태풍의 쪽빛보다 탁하게
  extremes: "#7E6A6E", // 마른 자줏빛 흙 — 더위도 추위도 아닌 색. 한쪽 편을 들면 안 된다
  canopus: "#2A3350",  // 감청 — 별이 뜨기 직전 하늘. 시간대 편의 남보라보다 푸르고 어둡게
  snow: "#3A5570",     // 눈 그늘의 푸른빛. 노인성 편의 감청보다 밝고 회색기가 있다
  wind: "#8A5A22",     // 삭은 황토 — 바람이 훑고 간 색. 봉수의 잉걸불보다 어둡다
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

/* ── 8. 서해안 간척 ───────────────────────────────────
   막은 선과 그 안쪽 땅을 본편과 같은 방식으로 그린다. 새만금 하나가
   나머지 넷을 합친 것보다 넓다는 게 200px에서도 면 크기로 읽힌다. */
export const ThumbGanchuk: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      <svg
        // 다섯 지구는 x 402~427, y 583~736에 몰려 있다. 반도 전체를 잡으면
        // 원이 점이 되므로 그 띠만 담기게 바짝 당긴다.
        viewBox="340 500 180 320"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={0.8} />
        ))}
        {ZONE_XY.map((z) => (
          <g key={z.id}>
            <path d={polyPath(z)} fill="#1E5750" opacity={0.95} stroke="#7FD3BE" strokeWidth={1.4} />
            <path
              d={dikePath(z)}
              fill="none"
              stroke="#B9F0DE"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      topic="1968~2010 서해안 간척"
      big="1,351"
      unit="km²"
      label="바다를 막아 만든 땅 넓이"
      band={BAND.ganchuk}
    />
  </Frame>
);

/* ── 9. 한국 표준시 ───────────────────────────────────
   세로선 두 개와 그 사이를 잇는 가로 막대. 200px으로 줄이면 다른
   여덟 장은 전부 지도 얼룩인데 이것만 직선이라 그리드에서 혼자 튄다.
   막대 하나가 곧 32분이라 그림과 숫자가 같은 말을 한다. */
export const ThumbTimezone: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      <svg
        // 두 자오선(x 382, 677)과 한반도 서해안이 다 들어오게 잡는다.
        // 세로는 색면이 시작하는 y 1090 위로 서울과 아카시가 오게 맞췄다.
        viewBox="243 60 560 996"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {EA_LANDS.map((l, i) => (
          <path key={i} d={l.d} fill={M.land} stroke={M.coast} strokeWidth={2.4} />
        ))}
        {/* EA_LANDS에 한반도는 없다. 따로 그려야 반도가 화면에 남는다. */}
        {EA_KOREA.map((d, i) => (
          <path key={`k${i}`} d={d} fill={M.land} stroke={M.coast} strokeWidth={2.4} />
        ))}
        {/*
          선을 밝게 쓴다. 본편은 어두운 바다 위에 옅은 선이지만 여기서는
          바다가 검고 땅이 밝다. 어두운 선을 그으면 바다 구간에서 통째로
          사라져 막대가 반만 남는다.
        */}
        {MERIDIANS.map((m) => (
          <path
            key={m}
            d={meridianPath(m)}
            fill="none"
            stroke={m === 135 ? "#C3B7E8" : "#6E668C"}
            strokeWidth={m === 135 ? 12 : 7}
            strokeDasharray={m === 135 ? undefined : "20 18"}
          />
        ))}
        {/* 서울에서 135°까지 — 이 가로 길이가 곧 32분이다 */}
        <line
          x1={SEOUL.x}
          y1={SEOUL.y}
          x2={meridianX(135)}
          y2={SEOUL.y}
          stroke="#F3E7CC"
          strokeWidth={15}
        />
        {[SEOUL.x, meridianX(135)].map((x) => (
          <line
            key={x}
            x1={x}
            y1={SEOUL.y - 30}
            x2={x}
            y2={SEOUL.y + 30}
            stroke="#F3E7CC"
            strokeWidth={15}
          />
        ))}
        {[SEOUL, AKASHI].map((c) => (
          <circle
            key={c.name}
            cx={c.x}
            cy={c.y}
            r={18}
            fill="#F3E7CC"
            stroke="#241F18"
            strokeWidth={7}
          />
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      topic="서울, 낮 12시"
      big="32"
      unit="분"
      label="해가 가장 높이 뜨기까지 남은 시간"
      band={BAND.tz}
    />
  </Frame>
);

/* ── 10. 조선왕조실록 사고 ────────────────────────────
   붉은 ✕ 셋과 살아남은 점 하나, 그리고 그 점에서 뻗어 반도를 세로로
   가로지르는 선. 200px으로 줄이면 '셋이 죽고 하나가 도망쳤다'가 형태만으로
   읽힌다. 글자를 못 읽어도 그림이 먼저 말한다. */
export const ThumbSillok: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{ opacity: 0.95 }}>
      <svg
        // 사고 넷(x 452~558)과 피난 경로(x 351~467, y 306~767)가 다 들어오되
        // 색면이 시작하는 y 1090 위에서 끝나게 잡았다.
        viewBox="250 246 560 996"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {PROVINCES.map((p) => (
          <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.2} />
        ))}
        <path
          d={flightPathTo(1)}
          fill="none"
          stroke="#F3E7CC"
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={flightPathTo(1)}
          fill="none"
          stroke="#8E2A3A"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 불탄 셋 — ✕가 200px에서 살아남는 유일한 기호다 */}
        {OLD_SAGO.filter((s) => s.lost).map((s) => (
          <g key={s.name} stroke="#8E1F1F" strokeWidth={9} strokeLinecap="round">
            <line x1={s.x - 15} y1={s.y - 15} x2={s.x + 15} y2={s.y + 15} />
            <line x1={s.x - 15} y1={s.y + 15} x2={s.x + 15} y2={s.y - 15} />
          </g>
        ))}
        {/* 살아남은 전주와 도착지 묘향산 */}
        {[FLIGHT[0], FLIGHT[FLIGHT.length - 1]].map((s) => (
          <circle
            key={s.name}
            cx={s.x}
            cy={s.y}
            r={17}
            fill="#F3E7CC"
            stroke="#241F18"
            strokeWidth={6}
          />
        ))}
      </svg>
    </AbsoluteFill>
    <Face
      topic="1592년 내장산"
      big="370"
      unit="일"
      label="선비 둘이 실록을 지킨 날"
      band={BAND.sillok}
    />
  </Frame>
);

/* ── 11. 한반도 밑 ────────────────────────────────────
   이 채널 썸네일 중 유일하게 지도가 아니라 단면이다. 200px으로 줄이면
   왼쪽 아래로 비스듬히 내려가는 점의 띠만 남는데, 그 형태가 곧 이 편의
   답이라 글자를 못 읽어도 그림이 먼저 말한다.

   위에 반도와 일본을 띠로 얹어 어디를 자른 단면인지 알아보게 했다.
   축척은 본편과 같은 1:1이라 보이는 기울기가 실제 기울기다. */
const QK_LON0 = 128.5;
const QK_LON1 = 146.5;
/** 잘라 쓸 경도 구간의 폭(지도 단위) */
const QK_W = lonX(QK_LON1) - lonX(QK_LON0);

export const ThumbQuake: React.FC = () => (
  <Frame>
    {/* 반도와 일본 — 어디를 자른 것인지 */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, height: 300, opacity: 0.95 }}>
      <svg
        viewBox={`${lonX(QK_LON0)} 300 ${QK_W} ${(300 / 1080) * QK_W}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {MAP_LANDS.map((l, i) => (
          <path key={i} d={l.d} fill={M.land} stroke={M.coast} strokeWidth={2} />
        ))}
        {MAP_KOREA.map((d, i) => (
          <path key={`k${i}`} d={d} fill={M.land} stroke={M.coast} strokeWidth={2} />
        ))}
      </svg>
    </div>

    {/* 단면 */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 490, height: (350 / QK_W) * 1080 }}>
      <svg
        viewBox={`${lonX(QK_LON0)} 0 ${QK_W} 350`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {[200, 400, 600].map((d) => (
          <line
            key={d}
            x1={lonX(QK_LON0)}
            y1={(d / MAX_DEPTH) * 350}
            x2={lonX(QK_LON1)}
            y2={(d / MAX_DEPTH) * 350}
            stroke="#5A5045"
            strokeWidth={1.6}
          />
        ))}
        <line
          x1={lonX(TRENCH_LON)}
          y1={0}
          x2={lonX(TRENCH_LON)}
          y2={350}
          stroke="#C4B79B"
          strokeWidth={3}
        />
        {PROFILE.map((q, i) => (
          <circle
            key={i}
            cx={lonX(q.lon)}
            cy={(q.d / MAX_DEPTH) * 350}
            r={qRadius(q.m) * 0.95}
            fill={colorOf(q.d)}
            opacity={0.85}
          />
        ))}
        {/* 가장 깊은 것 */}
        <circle
          cx={lonX(MARKED.deepest.lon)}
          cy={(MARKED.deepest.d / MAX_DEPTH) * 350}
          r={14}
          fill="none"
          stroke="#F3E7CC"
          strokeWidth={4}
        />
      </svg>
    </div>

    <Face
      topic="2023년 함경북도 앞바다"
      big="645"
      unit="km"
      label="한반도에서 가장 깊은 지진"
      band={BAND.quake}
    />
  </Frame>
);

/* ── 12. 좌표 365m ────────────────────────────────────
   다른 편들과 달리 전국 지도가 아니다. 365m는 반도 투영에서 0.33단위라
   지도로는 아무것도 안 보인다. 그래서 이 썸네일만 미터 좌표계다 —
   격자 한 칸이 100m고, 두 점이 그 위에서 갈라진다.

   그리드에 나란히 놓았을 때 확대된 판 하나만 다른 것이 오히려 눈에
   걸린다. 그게 이 편이 다른 편과 다른 점이기도 하다.

   경복궁 궁역은 안 그린다. 이 배율에서 궁역 남북 780m는 1716px이라
   그림 영역(1090px)을 넘어가서, 남는 건 화면을 가로지르는 선 두 개뿐이다.
   200px에서 살아남는 것은 점 둘과 그 사이의 빗금뿐이다.

   글자도 SVG 안에 넣는다. 밖에 두면 slice 배율만큼 어긋난다 — 처음에
   그렇게 했다가 둘째 점이 화면 밖으로 나갔다. */
export const ThumbDatum: React.FC = () => {
  /** 미터 → px */
  const k = 2.2;
  const ax = 330;
  const ay = 240;
  // 남동으로 어긋난다 — 옛 좌표를 새 지도에 찍었을 때의 방향이다.
  const bx = ax + 188 * k;
  const by = ay + 303 * k;
  return (
    <Frame>
      <AbsoluteFill style={{ opacity: 0.95 }}>
        <svg
          viewBox="0 0 1080 1920"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {/* 100m 격자 — 눈금이 있어야 365m가 길이로 읽힌다 */}
          {[...Array(6)].map((_, i) => (
            <g key={i} stroke="#2E3840" strokeWidth={3}>
              <line x1={i * 100 * k} y1={0} x2={i * 100 * k} y2={1090} />
              <line x1={0} y1={i * 100 * k} x2={1080} y2={i * 100 * k} />
            </g>
          ))}

          <line
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            stroke={M.hot}
            strokeWidth={14}
            strokeDasharray="34 24"
          />
          <circle cx={ax} cy={ay} r={26} fill="#F3E7CC" stroke="#17140F" strokeWidth={8} />
          <circle cx={bx} cy={by} r={26} fill={M.hot} stroke="#17140F" strokeWidth={8} />

          <text x={ax + 48} y={ay + 20} fontSize={60} fontWeight={900} fill="#F3E7CC">
            지금 좌표
          </text>
          <text x={bx + 48} y={by + 20} fontSize={60} fontWeight={900} fill={M.hot}>
            옛 좌표
          </text>
        </svg>
      </AbsoluteFill>

      <Face
        topic="2010년 세계측지계"
        big="365"
        unit="m"
        label="우리나라 좌표가 한꺼번에 움직인 거리"
        band={BAND.datum}
      />
    </Frame>
  );
};

/* ── 13. 역대 기온 폭 1위 ─────────────────────────────
   막대 하나가 위아래로 뻗는 그림. 다른 편들의 썸네일은 전부 지도인데
   이것만 막대라 그리드에서 눈에 걸린다. 지도는 뒤에 남긴다 — 막대만
   두면 무슨 채널인지 모른다.

   **지점 이름을 안 쓴다.** 편이 5위부터 거꾸로 세어 1위를 마지막에
   놓는 구조라, 썸네일에 답을 적으면 카운트다운이 할 일이 없다.
   일출 편에서 독도를 뺀 것과 같은 이유다. 이름 자리에는 물음표가
   선다 — 숫자 둘은 다 보여주고 어디인지만 감춘다. */
export const ThumbExtremes: React.FC = () => {
  const hero = EX_YEARS[EX_YEARS.length - 1].top[0];
  const cx = 540;
  const zero = 640;
  // 1℃ = 9.0px. 40.1은 위로 361px, -32.6은 아래로 293px.
  const k = 9.0;
  const w = 190;
  return (
    <Frame>
      <AbsoluteFill style={{ opacity: 0.95 }}>
        <svg
          viewBox="150 180 780 1387"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.2} />
          ))}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill>
        <svg
          viewBox="0 0 1080 1920"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <rect x={cx - w / 2} y={zero - hero.hi * k} width={w} height={hero.hi * k} fill="#C4553A" />
          <rect x={cx - w / 2} y={zero} width={w} height={-hero.lo * k} fill="#5C87A8" />
          <line x1={cx - w} y1={zero} x2={cx + w} y2={zero} stroke="#17140F" strokeWidth={7} />

          <text x={cx} y={zero - hero.hi * k - 26} fontSize={78} fontWeight={900}
                fill="#E8A88F" textAnchor="middle">
            +{hero.hi.toFixed(1)}℃
          </text>
          <text x={cx} y={zero - hero.lo * k + 84} fontSize={78} fontWeight={900}
                fill="#9DBBD1" textAnchor="middle">
            −{Math.abs(hero.lo).toFixed(1)}℃
          </text>
          <text x={cx} y={zero - 20} fontSize={104} fontWeight={900} fill="#17140F"
                textAnchor="middle">
            ?
          </text>
        </svg>
      </AbsoluteFill>

      <Face
        topic="역대 최고 − 역대 최저"
        big={hero.gap.toFixed(1)}
        unit="℃"
        label="기온 폭 전국 1위 동네의 기록"
        band={BAND.extremes}
      />
    </Frame>
  );
};

/* ── 14. 노인성 ───────────────────────────────────────
   가로선 하나. 위는 캄캄하고 아래에 별이 하나 낮게 떠 있다.
   200px에서 읽혀야 하는 것은 '선이 서울과 제주를 갈랐다' 하나뿐이라
   지점 이름도 둘만 남긴다. */
export const ThumbCanopus: React.FC = () => {
  // 반도가 색면(top 1090) 위에서 끝나도록 물러선 뷰박스.
  // 세로 1200 svg가 1920px에 들어가 배율 1.6이 된다.
  const VB = "180 350 677 1200";
  const line = cnLatY(CN_LIMIT);
  return (
    <Frame>
      <AbsoluteFill>
        <svg
          viewBox={VB}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <radialGradient id="thCnGlow">
              <stop offset="0%" stopColor="#FFF6DC" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#FFF6DC" stopOpacity={0} />
            </radialGradient>
          </defs>

          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.2} />
          ))}

          {/* 선 위는 별이 안 뜨는 땅이다. 썸네일에서는 그늘이 아니라
              통째로 덮어야 200px에서 갈린 것이 보인다. */}
          <rect x={0} y={0} width={1000} height={line} fill="#141726" opacity={0.86} />
          <line x1={0} y1={line} x2={1000} y2={line} stroke="#E0A83A" strokeWidth={7} />

          {/* 별이 뜨는 쪽. 점은 제주에 얹는다 — 하늘 그림이 아니라 지도다. */}
          <circle cx={CN_JEJU.x} cy={CN_JEJU.y} r={46} fill="url(#thCnGlow)" />
          <circle cx={CN_JEJU.x} cy={CN_JEJU.y} r={11} fill="#FFF6DC" />

          <text
            x={CN_SEOUL.x + 18}
            y={CN_SEOUL.y - 16}
            fontSize={44}
            fontWeight={900}
            fill="#9AA0B4"
            style={{ paintOrder: "stroke", stroke: "#141726", strokeWidth: 10 }}
          >
            서울
          </text>
          <text
            x={CN_JEJU.x + 30}
            y={CN_JEJU.y + 16}
            fontSize={46}
            fontWeight={900}
            fill="#FFF6DC"
            style={{ paintOrder: "stroke", stroke: "#2A2418", strokeWidth: 10 }}
          >
            제주
          </text>
        </svg>
      </AbsoluteFill>

      <Face
        topic="노인성 — 시리우스 다음으로 밝은 별"
        big="37.3"
        unit="°N"
        label="이 선 위에서는 안 뜨는 별"
        band={BAND.canopus}
        ink="#EDE6D6"
      />
    </Frame>
  );
};

/* ── 15. 눈 ───────────────────────────────────────────
   눈에 목까지 잠긴 사람 하나. 200px에서 읽혀야 하는 것은 그 그림과
   숫자 둘(150.9cm, 1955)뿐이라 지점도 하나만 세운다.

   처음에는 사람을 700px로 그렸는데 색면 위 1090px 안에서 눈이
   사람을 거의 다 덮어 머리도 안 보였다. 색면 선을 지면으로 삼고
   키를 900px로 키우니 머리와 어깨가 눈 위로 나온다. */
export const ThumbSnow: React.FC = () => {
  const top = SNOW_SITES[0];
  const ground = 1090;
  const bodyPx = 900;
  const k = bodyPx / SNOW_BODY_CM;
  const manX = 700;
  const head = ground - bodyPx;
  const snowTop = ground - top.v * k;
  const h = bodyPx;
  const headR = h * 0.062;
  const shoulder = head + h * 0.17;
  const hip = head + h * 0.52;
  const bodyW = h * 0.115;
  const legW = h * 0.048;
  return (
    <Frame>
      <AbsoluteFill style={{ opacity: 0.5 }}>
        <svg
          viewBox="230 250 640 914"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={2.2} />
          ))}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" style={{ width: "100%", height: "100%", display: "block" }}>
          {/* 눈 벽 — 사람 뒤에 둔다 */}
          <rect x={0} y={snowTop} width={1080} height={ground - snowTop} fill="#EDF4FB" />

          <g fill="#232C3A">
            <circle cx={manX} cy={head + headR} r={headR} />
            <rect x={manX - bodyW / 2} y={shoulder} width={bodyW} height={hip - shoulder} rx={h * 0.02} />
            <rect x={manX - bodyW / 2 - legW * 0.9} y={shoulder + h * 0.01}
                  width={legW * 0.8} height={h * 0.29} rx={legW * 0.4} />
            <rect x={manX + bodyW / 2 + legW * 0.1} y={shoulder + h * 0.01}
                  width={legW * 0.8} height={h * 0.29} rx={legW * 0.4} />
            <rect x={manX - bodyW / 2 + h * 0.004} y={hip - h * 0.01}
                  width={legW} height={ground - hip + h * 0.01} rx={legW * 0.4} />
            <rect x={manX + bodyW / 2 - legW - h * 0.004} y={hip - h * 0.01}
                  width={legW} height={ground - hip + h * 0.01} rx={legW * 0.4} />
          </g>


          {/* 키 자 */}
          <line x1={manX + 62} y1={head} x2={manX + 130} y2={head} stroke="#8A94A6" strokeWidth={5} />
          <text x={manX + 142} y={head + 16} fontSize={46} fontWeight={900} fill="#8D97A9">
            {SNOW_BODY_CM}cm
          </text>

          {/* 흰 눈 위에 어두운 글씨 */}
          <text x={62} y={snowTop + 128} fontSize={116} fontWeight={900} fill="#1B2330">
            {top.v.toFixed(1)}cm
          </text>
          <text x={66} y={snowTop + 198} fontSize={54} fontWeight={900} fill="#5A6678">
            어른 목까지
          </text>
        </svg>
      </AbsoluteFill>

      <Face
        topic={`${top.name} · 하루에 쌓인 눈 역대 1위`}
        big={top.d.slice(0, 4)}
        unit="년"
        label={`${Number(top.d.slice(5, 7))}월 ${Number(top.d.slice(8))}일 하루에 온 눈`}
        band={BAND.snow}
        ink="#EDF3FA"
      />
    </Frame>
  );
};


/* ── 16. 바람 ─────────────────────────────────────────
   속초 클로즈업 하나. 200px에서 읽혀야 하는 것은 시속 숫자와
   '동해안 어딘가'라는 위치뿐이라 다른 지점은 넣지 않는다. */
export const ThumbWind: React.FC = () => {
  const s = WD_SOKCHO;
  const w = 74;
  // svg는 1080×1920을 통째로 채운다. 뷰박스 비율도 그래야 한다.
  // 색면이 1090부터라 지점은 그 위 절반(y 545)에 와야 안 잘린다.
  const h = (w * 1920) / 1080;
  return (
    <Frame>
      <AbsoluteFill>
        <svg
          viewBox={`${s.x - w / 2} ${s.y - (h * 545) / 1920} ${w} ${h}`}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {WD_MAP.map((p, i) => (
            <path key={i} d={p.d} fill={M.land} stroke={M.coast} strokeWidth={w / 260} />
          ))}
          {/* 바람이 지나간 자리 */}
          {[1, 2, 3].map((k) => (
            <circle key={k} cx={s.x} cy={s.y} r={(w / 260) * 9 * k * 1.5}
                    fill="none" stroke="#E8912A" strokeWidth={w / 300} opacity={0.75 - k * 0.16} />
          ))}
          <circle cx={s.x} cy={s.y} r={(w / 260) * 9} fill="#E8912A" />
          <text x={s.x - (w / 260) * 18} y={s.y + (w / 260) * 10}
                fontSize={(w / 260) * 30} fontWeight={900} fill="#F6E8D2"
                textAnchor="end"
                style={{ paintOrder: "stroke", stroke: "#17140F", strokeWidth: (w / 260) * 9 }}>
            속초
          </text>
        </svg>
      </AbsoluteFill>

      <Face
        topic="관측 이래 가장 센 바람"
        big={s.kmh.toFixed(0)}
        unit="km/h"
        label={`${s.d.slice(0, 4)}년 ${Number(s.d.slice(5, 7))}월 ${Number(s.d.slice(8))}일 · 초속 ${s.v}m`}
        band={BAND.wind}
        ink="#F6E8D2"
      />
    </Frame>
  );
};
