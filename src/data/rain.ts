/**
 * 1시간에 가장 많이 내린 비.
 *
 * 야마: 152.2mm. 그날 당일 누적 258.6mm의 59%가 그 1시간에 왔다.
 * 2025년 9월 7일 군산. 1시간 최대가 나머지 23시간보다 많다.
 *
 * 화면의 자는 바깥에서 빌려 온 것이 아니라 **그날 당일 누적**이다.
 * 막대 하나가 당일 누적 강수량이고 아래쪽 색칠한 만큼이 1시간
 * 최대라 단위가 사라진다 — 전국 5위부터 1위까지 다섯을 나란히 두면
 * 같은 순위 안에서도 몫이 19%에서 63%까지 벌어지는 것이 보인다.
 *
 * 화면 문구는 '1시간 최대'와 '당일 누적 강수량' 둘로만 쓴다. 숫자는
 * 한글로 적지 않는다 — '스물세 시간'이 아니라 '23시간'이다.
 *
 * 숫자는 전부 scripts/prep-rain.py가 낸 것이다.
 */
import raw from "./rain.json";

/** 화면이 세우는 날 */
export interface Case {
  name: string;
  /** 그날 */
  d: string;
  /** 관측 시작 연도 */
  y0: number;
  lat: number;
  lon: number;
  /** 투영 좌표(places.ts와 같은 식) */
  x: number;
  y: number;
  /** 1시간 최대(mm) — 1시간 최다강수량 */
  hour: number;
  /** 당일 누적 강수량(mm) — 일강수량 */
  day: number;
  /** hour / day, 퍼센트로 반올림한 값 */
  pct: number;
  /** 1시간 최다강수량 전국 순위. 0이면 10위 밖이다. */
  rank: number;
  /** 그날 일강수량이 그 지점 안에서 몇 위인지 */
  dayRank: number;
  /** 같은 날 이웃 지점 — 비가 한 점에 몰렸다는 증거 */
  near: Array<{ name: string; v: number; km: number }>;
}

export const CASES: Case[] = raw.cases;
/** 1시간 최다강수량 전국 10위 */
export const TOP: Array<{ rank: number; name: string; v: number; d: string; y0: number }> =
  raw.top;
/** 전국 1위가 갈아치워진 자취. held는 다음 기록까지 버틴 기간이다. */
export const PROG: Array<{ d: string; name: string; v: number; held?: string }> = raw.prog;

export const N_SITES: number = raw.nSites;
/** 지점당 상위 10건만 받았을 때 숨을 수 있는 값의 상한 */
export const HIDDEN_MAX: number = raw.hiddenMax;
/** 막대 눈금의 위 끝(mm) */
export const SCALE: number = raw.scale;
/** 호우특보 기준(3시간 누적, mm) — 기상청 기상특보 발표기준 */
export const HEAVY_WATCH3: number = raw.heavyWatch3;
export const HEAVY_WARN3: number = raw.heavyWarn3;

/** 1위 */
export const HERO: Case = CASES[CASES.length - 1];
/** 당일 누적에서 1시간 최대를 뺀 나머지(mm) */
export const rest = (c: Case): number => Math.round((c.day - c.hour) * 10) / 10;

/**
 * 화면에 없는 것 한 줄.
 *
 * 앞의 날과 견주는 자리다. 숫자를 두 번 읽히지 않게, 막대가 이미
 * 말하는 것은 빼고 어긋나는 데만 적는다.
 */
export const LINES: string[] = [
  "1961년 관측 시작 · 57년 만의 그 지점 1위",
  "종일 내린 비 · 1시간 몫은 26%뿐",
  "당일 누적 654mm · 전국 일강수량 3위인 날",
  "당일 누적은 거제의 1/3 · 1시간 최대는 더 위",
  "30km 옆 부안은 70.6mm · 절반도 안 되는 양",
];

/** `2025-09-07` → `2025년 9월 7일` */
export function fmt(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${y}년 ${Number(m)}월 ${Number(dd)}일`;
}
