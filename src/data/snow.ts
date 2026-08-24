/**
 * 역대 최대 적설이 세워진 날 — 투영과 타임라인.
 *
 * 야마: 한 동네의 눈 기록은 그 동네가 겪은 수백 번의 겨울이 만든 것이
 * 아니라 딱 하루가 만든다. 92곳의 기록이 54일에 걸려 있고, 그중 하루가
 * 여덟 곳을 한꺼번에 세웠다 — 2004년 3월 5일.
 *
 * 숫자는 전부 scripts/prep-snow.py가 낸 것이다.
 */
import raw from "./snow.json";
import { project } from "./places";

export interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alt: number;
  /** 관측 시작 연도 */
  y0: number;
  /** 역대 1위 일 최심신적설(cm)과 그 날 */
  v: number;
  d: string;
  /** 2위. 하루가 얼마나 튀는지는 2위와 견줘야 보인다. */
  v2: number | null;
  d2: string | null;
  x: number;
  y: number;
}

export const SITES: Site[] = raw.sites.map((s) => ({ ...s, ...project(s.lon, s.lat) }));

export interface Step {
  /** YYYY-MM-DD */
  d: string;
  /** 그날 역대 1위를 세운 지점 이름 */
  names: string[];
  n: number;
  /** 그날까지 세워진 누적 지점 수 */
  seen: number;
}

export const TIMELINE: Step[] = raw.timeline;
export const DAY: string = raw.day;
export const EVE: string = raw.eve;
export const DAY_NAMES: string[] = raw.dayNames;
export const MONTH: Record<string, number> = raw.month;
export const N_SITES: number = raw.nSites;
export const N_DAYS: number = raw.nDays;
export const N_MULTI_DAYS: number = raw.nMultiDays;
export const N_FROM_MULTI: number = raw.nFromMulti;

const by = (n: string) => SITES.find((s) => s.name === n)!;
/** 대전 — 49.0cm. 2위 25.2cm의 1.94배다. 이 한 장이 야마를 증명한다. */
export const DAEJEON = by("대전");
export const BIGGEST = SITES[0];

/** 그날 여덟 곳. 값이 큰 순이다. */
export const EIGHT: Site[] = DAY_NAMES.map(by);

/** 그 이틀에 걸린 것 전부 — 1위가 아닌 지점까지 */
export interface Hit {
  name: string;
  lat: number;
  lon: number;
  v: number;
  rank: number;
  x: number;
  y: number;
}
const hits = (d: string): Hit[] =>
  (raw.storm as Record<string, Array<Omit<Hit, "x" | "y">>>)[d].map((h) => ({
    ...h,
    ...project(h.lon, h.lat),
  }));
export const STORM_EVE = hits(EVE);
export const STORM_DAY = hits(DAY);

/** `2004-03-05` → `2004. 3. 5.` */
export function fmt(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${y}. ${Number(m)}. ${Number(dd)}.`;
}

/** 기록일이 몇 번째 겨울인지가 아니라 실제 연도. 진행 막대가 쓴다. */
export function yearOf(d: string): number {
  return Number(d.slice(0, 4));
}

export const Y_FROM = yearOf(TIMELINE[0].d);
export const Y_TO = yearOf(TIMELINE[TIMELINE.length - 1].d);

/** 그날의 걸음 번호 */
export const DAY_STEP = TIMELINE.findIndex((t) => t.d === DAY);
