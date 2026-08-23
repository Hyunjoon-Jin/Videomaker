/**
 * 가장 더운 곳과 가장 추운 곳이 같은 곳 — 투영과 비트.
 *
 * 야마: 41.0도를 겪은 곳과 -28.1도를 겪은 곳이 같은 자리다. 홍천이다.
 * '제일 더운 곳'과 '제일 추운 곳'을 따로 찾는 것이 틀린 물음이었다.
 *
 * 숫자는 전부 scripts/prep-extremes.py가 기상청에서 받은 것이다.
 * 여기서는 화면에 쓸 모양으로만 바꾼다.
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
  /** 역대 일최고기온과 그날 */
  hi: number;
  hiDt: string;
  /** 역대 일최저기온과 그날 */
  lo: number;
  loDt: string;
  /** 최고 - 최저 */
  gap: number;
  /** 전체 기간 교차 순위 */
  rank: number;
  x: number;
  y: number;
}

const place = <T extends { lat: number; lon: number }>(s: T) => ({
  ...s,
  ...project(s.lon, s.lat),
});

/** 96개 지점 전부 — 마무리에서 전국 막대를 그린다 */
export const ALL: Stn[] = raw.all.map(place);

/** 본문에 세우는 일곱. 배열 순서가 곧 등장 순서다. */
export const CAST: Array<Stn & { why: string; commonRank: number | null }> =
  raw.cast.map(place);

/** 주인공 */
export const HERO = CAST[0];

export const RANK = raw.rank;
export const CORR = raw.corr;

/** 막대가 닿는 위·아래 끝. 전국 값이 다 들어가는 범위로 고정한다. */
export const T_MAX = 45;
export const T_MIN = -35;

/** 온도 → 0(=T_MIN)에서 1(=T_MAX) 사이 */
export function tNorm(t: number): number {
  return (t - T_MIN) / (T_MAX - T_MIN);
}

/** "2018-08-01" → "2018년 8월 1일" */
export function dLabel(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return `${y}년 ${m}월 ${dd}일`;
}

/** 소수 한 자리에 도 기호. 영하는 마이너스로 적는다 — 화면에서 '영하'는 길다. */
export function deg(t: number): string {
  return `${t.toFixed(1)}℃`;
}

export interface ExBeat {
  kicker: string;
  title: string;
  detail: string;
  impact: number;
  /** 이 비트에서 켜지는 지점 수. CAST 앞에서부터 센다. */
  cast: number;
  /** 계기판에 거는 날짜. 없으면 앞 비트 것을 유지한다. */
  date?: string;
  /** 여름 막대만 / 겨울 막대만 / 둘 다 */
  show: "hi" | "lo" | "both";
  /** 마무리 직전에 전국을 켠다 */
  nation?: boolean;
}

/**
 * 비트.
 *
 * 순서가 논증이다. 여름 기록을 먼저 보여주고(홍천이 오래 1위였다),
 * 겨울 기록을 켜면 같은 막대가 아래로도 뻗는다. 그 다음에 '한쪽만
 * 잘하는 곳'들을 옆에 세운다. 대관령은 아래만, 양산은 위만 길다.
 *
 * '전국 1위'라고 쓰지 않는다. 기준(전체 기간 / 1988년 이후 공통기간)에
 * 따라 양평과 홍천이 바뀐다. 기록값과 비교만 놓으면 순위를 말하지
 * 않고도 읽힌다. 기간 이야기는 고정댓글에 적는다.
 */
export const EX_BEATS: ExBeat[] = [
  {
    date: "2018-08-01",
    kicker: "2018년 8월 1일",
    title: "강원도 홍천 41.0℃",
    detail: "이날부터 8년간 우리나라 최고기온",
    impact: 1,
    cast: 1,
    show: "hi",
  },
  {
    date: "1981-01-05",
    kicker: "37년을 거슬러",
    title: "같은 홍천에서 -28.1℃",
    detail: "한 지점이 겪은 폭이 69.1℃",
    impact: 1,
    cast: 1,
    show: "both",
  },
  {
    kicker: "그럼 대관령은",
    title: "제일 높은데 여름에 짐",
    detail: "해발 772m, 역대 최고가 33.2℃",
    impact: 0.9,
    cast: 4,
    show: "both",
  },
  {
    kicker: "대프리카는",
    title: "여름은 40.0℃, 겨울이 멈춤",
    detail: "그 최고 기록도 1942년 것",
    impact: 0.5,
    cast: 5,
    show: "both",
  },
  {
    date: "2026-08-02",
    kicker: "2026년 8월 2일",
    title: "양산 42.5℃, 기록이 깨짐",
    detail: "그런데 이 동네 최저는 -11.7℃뿐",
    impact: 1,
    cast: 6,
    show: "both",
  },
  {
    kicker: "한쪽만 잘하면 못 이김",
    title: "양쪽 다 극단인 자리",
    detail: "해발 높이와는 거의 상관없음",
    impact: 0.9,
    cast: 7,
    show: "both",
    nation: true,
  },
];
