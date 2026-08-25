/**
 * 관측 이래 우리나라에서 가장 센 바람.
 *
 * 야마: 초속 63.7m, 시속 229km. 2006년 10월 23일 속초.
 * 강풍경보 기준(순간 26m/s)의 2.45배다.
 *
 * 지도는 provinces.json(시도 경계)이 아니라 시군구 경계다. 5위 안에
 * 섬이 넷인데 시도 경계에서는 울릉도와 흑산도가 최소 면적 필터에
 * 걸려 빠져 있다 — 클로즈업하면 빈 바다에 점만 남는다.
 *
 * 숫자는 전부 scripts/prep-wind.py가 낸 것이다.
 */
import raw from "./wind.json";

export interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
  /** 관측 시작 연도 */
  y0: number;
  /** 최대순간풍속(m/s)과 그 날 */
  v: number;
  d: string;
  /** 시속 */
  kmh: number;
  /** 강풍경보 기준(순간 26m/s)의 몇 배 */
  warn: number;
  /** 1㎡에 걸리는 힘(kgf). 동압 ½ρv²를 무게로 옮긴 값. */
  kgf: number;
  rank: number;
}

export const SITES: Site[] = raw.sites;
/** 관측 이래 5위. 값 내림차순이다. */
export const TOP: Site[] = raw.top;
export const MAP: Array<{ n: string; d: string }> = raw.map;

export const GUST_WATCH: number = raw.gustWatch;
export const GUST_WARN: number = raw.gustWarn;
export const CAR_KMH: number = raw.carKmh;
export const KTX_KMH: number = raw.ktxKmh;
export const N_SITES: number = raw.nSites;
export const PERSON_KG: number = raw.personKg;
export const RHO: number = raw.rho;
/** 1위가 세워진 날 */
export const DAY: string = raw.day;
/** 그날 걸린 기록들 — 바람만이 아니다 */
export const DAY_HITS: Array<{
  name: string; kind: string; unit: string; v: number; rank: number;
}> = raw.dayHits;

/** 풍속(m/s) → 1㎡에 걸리는 힘(kgf) */
export function forceOf(v: number): number {
  return (0.5 * RHO * v * v) / 9.80665;
}
/** 강풍경보 기준의 힘 */
export const WARN_KGF = forceOf(GUST_WARN);

/**
 * 화면이 세우는 차례 — 5위에서 1위로.
 *
 * 2·3위(제주·고산)는 같은 값, 같은 날, 같은 섬이다. 따로 세우면
 * 같은 화면을 두 번 보는 셈이라 한 걸음에 묶는다.
 */
export interface Step {
  /** 이 걸음이 세우는 지점. 둘이면 같이 뜬다. */
  sites: Site[];
  /** 카메라 중심과 폭(투영 px) */
  cx: number;
  cy: number;
  w: number;
  /** 화면에 없는 것 한 줄 */
  line: string;
  /** 그날 걸린 기록을 펴는 판 */
  day?: boolean;
}

const by = (n: string) => TOP.find((s) => s.name === n)!;
export const SOKCHO = by("속초");
export const ULLEUNG = by("울릉도");

/** 두 지점의 가운데 */
const mid = (a: Site, b: Site) => ({ cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 });

export const STEPS: Step[] = [
  {
    sites: [by("울릉도")],
    cx: by("울릉도").x,
    cy: by("울릉도").y,
    // 울릉도 본섬이 투영에서 10px밖에 안 된다. 화면 폭의 절반쯤
    // 차지하도록 잡아야 '섬'으로 보인다.
    w: 23,
    line: "동해 한복판 · 1938년부터 관측",
  },
  {
    sites: [by("흑산도")],
    cx: by("흑산도").x,
    cy: by("흑산도").y,
    // 흑산도는 6px. 주변 다물도·대둔도까지 들어오게 조금 넓게.
    w: 26,
    line: "목포에서 서쪽으로 90km",
  },
  {
    sites: [by("제주"), by("고산")],
    ...mid(by("제주"), by("고산")),
    // 제주도 전체(폭 60)와 두 지점이 같이 보이는 폭
    w: 96,
    line: "같은 날 같은 섬 · 태풍 매미가 지나간 날",
  },
  {
    sites: [by("속초")],
    cx: by("속초").x,
    cy: by("속초").y,
    // 육지라 해안선이 보여야 어디인지 안다
    w: 66,
    line: "태풍 매미가 세운 2위보다 센 바람 · 10월",
  },
  {
    // 그날 판. 카메라는 속초에 그대로 둔다.
    sites: [by("속초")],
    cx: by("속초").x,
    cy: by("속초").y,
    w: 66,
    line: "강릉은 그날 하루에 304mm — 강릉 역대 3위",
    day: true,
  },
];

/**
 * 전국이 다 들어오는 카메라.
 *
 * 남한은 x 230~790(울릉도까지), y 450~1020이다. 세로가 긴 화면이라
 * 가로를 기준으로 잡는다 — 700으로 두면 반도가 화면의 절반도 못 찬다.
 */
export const WIDE = { cx: 510, cy: 740, w: 585 };

/** `2006-10-23` → `2006년 10월 23일` */
export function fmt(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${y}년 ${Number(m)}월 ${Number(dd)}일`;
}
