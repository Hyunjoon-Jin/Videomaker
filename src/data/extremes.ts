/**
 * 역대 기온 폭 순위 — 투영과 비트.
 *
 * 야마: 우리나라에서 기온이 가장 크게 벌어지는 곳은 대구도 대관령도
 * 아니다. 5위부터 거꾸로 세어 1위를 맨 마지막에 놓는다.
 *
 * '기온 폭'은 그 지점이 관측을 시작한 뒤 겪은 역대 최고에서 역대
 * 최저를 뺀 값이다. 연교차(달 평균의 차)와는 다른 것이라 화면에서도
 * 연교차라고 쓰지 않는다.
 *
 * 숫자는 전부 scripts/prep-extremes.py가 기상청에서 받은 것이다.
 */
import raw from "./extremes.json";
import { project } from "./places";

export interface Stn {
  stn: string;
  name: string;
  lat: number;
  lon: number;
  /** 해발고도(m) */
  alt: number;
  /** 관측 시작일 "1971-09-27" */
  start: string;
  hi: number;
  hiDt: string;
  lo: number;
  loDt: string;
  /** 최고 - 최저 */
  gap: number;
  /** 전체 기간 순위 */
  rank: number;
  x: number;
  y: number;
}

const place = <T extends { lat: number; lon: number }>(s: T) => ({
  ...s,
  ...project(s.lon, s.lat),
});

/** 96개 전부 — 마지막에 전국 분포를 깐다 */
export const ALL: Stn[] = raw.all.map(place);

/** 1위부터 5위까지. 화면은 이걸 거꾸로 읽는다. */
export const TOP: Stn[] = raw.top.map(place);

/** 순위 밖인데 이름값은 제일 큰 둘 — 대구, 대관령 */
export const FOILS: Stn[] = raw.foils.map(place);

/** 카운트다운 순서 — 5위, 4위, 3위, 2위, 1위 */
export const COUNTDOWN: Stn[] = [...TOP].reverse();

export const RANK = raw.rank;
export const CORR = raw.corr;

/** 막대가 닿는 위·아래 끝 */
export const T_MAX = 45;
export const T_MIN = -35;

export function tNorm(t: number): number {
  return (t - T_MIN) / (T_MAX - T_MIN);
}

export function deg(t: number): string {
  return `${t.toFixed(1)}℃`;
}

/**
 * 비트.
 *
 * 자막을 한 줄로 줄였다.
 *
 * 앞판은 kicker(순위) + title(지점명) + detail 세 줄이었는데, 순위도
 * 지점명도 두 숫자도 전부 막대에 이미 적혀 있다. 자막이 화면을 두 번
 * 말하고 있었다. 읽을 것이 늘었을 뿐 아는 것은 안 늘었다.
 *
 * 그래서 자막은 **화면에 없는 것 한 가지만** 말한다. 날짜, 순위 밖의
 * 사실, 그 지점에 대해 숫자가 말 못 하는 것. 한 줄, 스무 자 안쪽이다.
 */
export interface ExBeat {
  /** 화면에 없는 것 한 가지 */
  line: string;
  impact: number;
  /** 순위 밖 둘(대구·대관령)을 세우는 비트 */
  foil?: boolean;
  /** 이 비트에서 보이는 카운트다운 칸 수 */
  n: number;
}

export const EX_BEATS: ExBeat[] = [
  { line: "대구는 31위, 대관령은 22위", impact: 0.9, foil: true, n: 0 },
  { line: "-27.9℃는 1969년 2월", impact: 0.5, n: 1 },
  { line: "겨울만으로 4위", impact: 0.5, n: 2 },
  { line: "1981년 1월 5일의 기록", impact: 0.5, n: 3 },
  { line: "2018년 8월, 8년간 전국 최고", impact: 0.9, n: 4 },
  // 1·2·3위(양평·홍천·충주)의 최저 기록이 전부 1981-01-05이다.
  { line: "1·2·3위가 같은 날 얼었음", impact: 1, n: 5 },
];
