/**
 * 역대 최대 적설 — 사람 키를 자로 놓고 잰다.
 *
 * 야마: 하루에 눈이 어른 키만큼 온 곳이 있다.
 *
 *   울릉도  150.9cm  1955-01-20   키 170cm 사람이 목까지 잠긴다
 *   대관령   92.0cm  1992-01-31   1위의 61%
 *
 * cm는 감이 안 온다. 그렇다고 서울을 자로 쓰면 서울 중심이 된다.
 * 자는 사람 키여야 한다 — 그건 누구에게나 같다.
 *
 * 숫자는 전부 scripts/prep-snow.py가 낸 것이다.
 */
import raw from "./snow.json";
import { project } from "./places";

export interface Site {
  id: string;
  /** 92곳 중 몇 위 */
  rank: number;
  /** 서울 2010-01-04의 몇 배 */
  ratio: number;
  /** 키 170cm의 몇 배. 1.0이면 통째로 잠긴다. */
  body: number;
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
export const SEOUL = by("서울");
export const DAEGU = by("대구");
export const BIGGEST = SITES[0];
/** 자 — 서울도 대관령도 아닌 사람 키 */
export const BODY_CM: number = raw.bodyCm;
export const TOP_N: number = raw.topN;

/** 화면이 세우는 차례 — 전국 10위에서 1위로 */
export const CAST: Site[] = (raw.cast as Array<{ name: string }>).map((c) => by(c.name));
/** 광역시 일곱. 세종은 관측소가 없다. */
export const METRO: Site[] = (raw.metro as Array<{ name: string }>).map((m) => by(m.name));

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
