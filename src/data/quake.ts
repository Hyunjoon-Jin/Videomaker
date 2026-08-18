/**
 * 한반도 밑 — 지진계가 본 깊이, 1900~2025.
 *
 * 질문 하나: 한반도 밑에는 무엇이 있나.
 *
 * ── 화면이 새로 쓰는 축 ─────────────────────────────
 * 아홉 편 동안 화면의 축은 늘 위도와 경도였다. 이 편에는 셋째 축이
 * 붙는다 — 깊이.
 *
 * 위에 평면 지도를 놓고 아래에 단면을 놓되 **가로축을 공유한다.**
 * 지도 위 진앙에서 그대로 아래로 떨어뜨리면 그 지진의 깊이가 된다.
 * 그러려면 지도의 경도 범위와 단면의 경도 범위가 같아야 하고, 그래서
 * eastasia.json(118~143°E)을 못 쓴다 — 동쪽 끝이 일본해구에 걸쳐
 * 잘린다. slabmap.json을 따로 뽑았다(124~147°E, 30~47°N).
 *
 * ── 데이터 ──────────────────────────────────────────
 * scripts/prep-quakes.py가 USGS FDSN 카탈로그에서 구워 quakes.json에
 * 넣는다. 좌표·깊이·규모·시각이 전부 카탈로그값이고, 이 편에서 손으로
 * 찍은 점은 하나도 없다.
 *
 * 핵실험을 뺀 것이 이 편에서 제일 중요한 한 줄이다. 창 안에 여섯 건이
 * 있고 그중 2017년 것이 M6.3이라, 규모만 보고 골랐으면 그게 '한반도
 * 최대 지진'으로 화면에 올라갔을 것이다. USGS가 type을 nuclear
 * explosion으로 붙여둬서 내가 판단할 필요가 없었다. 그 8분 뒤 무너진
 * 산도 collapse로 따로 붙어 있다. 둘 다 뺐다.
 *
 * ── 확인한 것 ───────────────────────────────────────
 * 2023. 9. 6  M4.9, 41.49°N 130.08°E, 깊이 645km — 이 창에서 가장 깊다
 * 1917. 7.31  M7.4, 42.23°N 130.21°E, 깊이 460km — 한반도 상자 최대
 * 2011. 3.11  M9.1, 38.30°N 142.37°E, 깊이 29km — 도호쿠, 창 전체 최대
 * 2016. 9.12  M5.4, 35.78°N 129.22°E, 깊이 13km — 경주
 * 2017.11.15  M5.5, 36.07°N 129.28°E, 깊이 10km — 포항
 *
 * 규모는 USGS 값이다. 기상청은 경주를 5.8, 포항을 5.4로 적는다. 척도와
 * 관측망이 달라 생기는 차이다. 한 카탈로그 안에서 서로 비교해야 하므로
 * 섞지 않고 USGS로 통일하고 차이는 고정댓글에 적는다.
 *
 * ── 계산한 것 ───────────────────────────────────────
 * 해구에서 함경북도 앞바다까지 1,156km, 서울까지 1,472km. 대권거리다.
 * 경도별 깊이 중앙값도 계산값이다(143°E 25km → 130°E 566km).
 *
 * ── 적지 않은 것 ────────────────────────────────────
 * 서울 밑에도 그 판이 있는지는 안 쓴다. 토모그래피 연구는 상부맨틀
 * 바닥에 누운 판을 말하지만 지진 목록으로는 알 수 없고, 이 편은 지진
 * 목록만 가지고 만든 편이다. 화면은 지진이 난 곳까지만 말한다.
 */
import raw from "./quakes.json";
import map from "./slabmap.json";

export interface Quake {
  /** UTC 초 */
  t: number;
  m: number;
  lon: number;
  lat: number;
  /** km */
  d: number;
}

export const QUAKES: Quake[] = raw.events as Quake[];
export const MAP_VIEWBOX: string = map.viewBox;
export const MAP_LANDS: Array<{ iso: string; d: string }> = map.lands;
export const MAP_KOREA: string[] = map.korea;
export const MAP_H = map.h;

/** 평면 투영 — prep-slabmap.py와 같은 식 */
export function px(lon: number, lat: number): { x: number; y: number } {
  return {
    x: (lon - map.lon[0]) * map.kx * map.scale + map.offx,
    y: map.h - ((lat - map.lat[0]) * map.scale + map.offy),
  };
}

export function lonX(lon: number): number {
  return (lon - map.lon[0]) * map.kx * map.scale + map.offx;
}

/**
 * 단면 — 가로는 평면과 같은 경도축, 세로는 깊이.
 * 0~700km를 단면 높이에 맞춘다.
 */
export const MAX_DEPTH = 700;

export function depthY(d: number, h: number): number {
  return (Math.max(0, Math.min(MAX_DEPTH, d)) / MAX_DEPTH) * h;
}

/**
 * 단면에 넣을 위도 띠.
 *
 * 판은 위도마다 다르게 누워 있다. 창 전체를 한 단면에 겹치면 규슈 밑
 * 얕은 지진과 함경도 밑 600km가 같은 가로 위치에 찍혀 뭉갠다.
 */
export const BAND: [number, number] = [36, 44];
export const IN_BAND = (q: Quake) => q.lat >= BAND[0] && q.lat <= BAND[1];
export const PROFILE: Quake[] = QUAKES.filter(IN_BAND);

/** 규모 → 반지름. 로그 척도라 그냥 쓰면 큰 것과 작은 것이 안 갈린다. */
export function radiusOf(m: number): number {
  return 1.6 + Math.pow(Math.max(0, m - 3.5), 1.45) * 1.15;
}

/** 깊이 → 색. 얕은 것과 깊은 것은 다른 현상이라 다른 색으로 둔다. */
export const SHALLOW = "#D4694F";
export const MID = "#C09240";
export const DEEP = "#7FA8C4";

export function colorOf(d: number): string {
  if (d < 70) return SHALLOW;
  if (d < 300) return MID;
  return DEEP;
}

/** 화면에 이름을 붙이는 지진들 */
export const MARKED = {
  deepest: QUAKES.reduce((a, b) => (b.d > a.d ? b : a)),
  tohoku: QUAKES.reduce((a, b) => (b.m > a.m ? b : a)),
  rajin: QUAKES.filter((q) => q.d >= 400 && q.lon <= 131.5 && q.lat <= 43.5)
    .reduce((a, b) => (b.m > a.m ? b : a)),
  gyeongju: QUAKES.filter(
    (q) => Math.abs(q.lon - 129.22) < 0.3 && Math.abs(q.lat - 35.78) < 0.3 && q.m >= 5.0
  ).reduce((a, b) => (b.m > a.m ? b : a)),
  pohang: QUAKES.filter(
    (q) => Math.abs(q.lon - 129.28) < 0.3 && Math.abs(q.lat - 36.07) < 0.3 && q.m >= 5.0
  ).reduce((a, b) => (b.m > a.m ? b : a)),
};

/** 일본해구 — 태평양판이 들어가는 자리 */
export const TRENCH_LON = 143.7;
/** 해구에서 잰 수평거리(대권, km) */
export const KM_TO_DEEP = 1156;
export const KM_TO_SEOUL = 1472;

export const SEOUL = { lon: 126.978, lat: 37.5665 };

export interface QEvent {
  /** 화면 오른쪽 위 연도 */
  year: number;
  kicker: string;
  title: string;
  detail: string;
  impact?: number;
  /** 단면을 세우는가 */
  profile?: boolean;
  /** 카메라 */
  cx: number;
  cy: number;
  z: number;
  /** 이 비트에서 이름표를 다는 지진 */
  mark?: keyof typeof MARKED;
  /** 해구 표시 */
  trench?: boolean;
  /** 단면 아래에 재는 구간 — 해구에서 어디까지인가 */
  span?: "deep" | "seoul";
}

const P = px;

export const Q_EVENTS: QEvent[] = [
  {
    year: 2017,
    kicker: "2016년 경주 · 2017년 포항",
    title: "깊이 13km와 10km",
    detail: "한반도 지진은 대개 이 정도 얕은 자리",
    cx: P(128.8, 36.4).x, cy: P(128.8, 36.4).y, z: 3.6, impact: 0.8, mark: "gyeongju",
  },
  {
    year: 2023,
    kicker: "2023년 9월 6일 · 함경북도 앞바다",
    title: "깊이 645km",
    detail: "M4.9 · 한반도 지각 두께의 스무 배 아래",
    cx: P(130.1, 41.5).x, cy: P(130.1, 41.5).y, z: 3.6, impact: 1, mark: "deepest",
  },
  {
    year: 1917,
    kicker: "1917년 7월 31일 · 나진",
    title: "깊이 460km에서 M7.4",
    detail: "한반도 상자 안 최대 · 이것도 얕은 지진이 아님",
    cx: P(130.2, 42.2).x, cy: P(130.2, 42.2).y, z: 3.6, impact: 1, mark: "rajin",
  },
  {
    year: 2025,
    kicker: "왜 동북쪽 끝만 깊은가",
    title: "동서로 자른 단면",
    detail: "북위 36~44도 · 진앙을 깊이 자리에 찍은 단면",
    cx: 500, cy: 400, z: 1.0, impact: 1, profile: true,
  },
  {
    year: 2025,
    kicker: "일본해구에서 한반도까지",
    title: "동쪽이 얕고 서쪽이 깊음",
    detail: "143°E 25km · 134°E 381km · 130°E 566km",
    cx: 500, cy: 400, z: 1.0, impact: 1, profile: true,
  },
  {
    year: 2011,
    kicker: "동경 143.7도 · 일본해구",
    title: "태평양판이 들어가는 입구",
    detail: "2011년 도호쿠 M9.1도 여기 · 깊이 29km",
    cx: 500, cy: 400, z: 1.0, impact: 1, profile: true, mark: "tohoku", trench: true,
  },
  {
    year: 2025,
    kicker: "해구에서 함경북도까지",
    title: "수평 1,156km",
    detail: "그사이 645km를 내려감 · 기울기 약 29도",
    cx: 500, cy: 400, z: 1.0, impact: 1, profile: true, trench: true, span: "deep",
  },
  {
    year: 2025,
    kicker: "서울",
    title: "판 경계에서 1,472km",
    detail: "지진으로 알 수 있는 건 여기까지",
    cx: 500, cy: 400, z: 1.0, impact: 1, profile: true, trench: true, span: "seoul",
  },
];

/** 마무리 — 두 가지 지진 */
export const KINDS = [
  { who: "한반도의 지진", where: "깊이 10~20km", ex: "경주 M5.4 · 포항 M5.5", near: true },
  { who: "판의 지진", where: "깊이 400~645km", ex: "나진 M7.4", near: false },
];
