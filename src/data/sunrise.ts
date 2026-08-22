/**
 * 해가 가장 먼저 뜨는 곳 — 투영과 비트.
 *
 * 야마: '가장 먼저 해 뜨는 곳'은 한 곳이 아니라 1년에 여섯 번 자리를
 * 옮긴다. 그리고 마지막에 뒤집는다 — 사실 1등은 사철 독도다.
 *
 * 숫자는 전부 scripts/prep-sunrise.py가 계산한 것이다. 여기서는 화면에
 * 쓸 모양으로만 바꾼다.
 */
import raw from "./sunrise.json";
import { project } from "./places";

export interface Spot {
  name: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
}

const spot = (s: { name: string; lat: number; lon: number }): Spot => ({
  ...s,
  ...project(s.lon, s.lat),
});

/** 육지 넷. 배열 순서가 곧 데이터의 열 순서다 — 바꾸면 안 된다. */
export const LAND: Spot[] = raw.land.map(spot);
/** 마무리에서만 켠다 */
export const ISLANDS: Spot[] = raw.islands.map(spot);

export interface Day {
  /** "01-01" */
  md: string;
  /** 육지 넷의 일출 시각(KST 자정부터 분). LAND와 같은 순서. */
  t: number[];
  /** 그날 1등인 곳의 인덱스 */
  first: number;
  /** 섬들의 일출 시각 */
  isl: number[];
}

export const DAYS: Day[] = raw.days;
export const YEAR: number = raw.year;
/** 육지 넷이 1등이었던 날수 */
export const SHARE: number[] = raw.share;
/** 독도가 1등이었던 날수 — 365다 */
export const ISLAND_WINS: number = raw.islandWins;
/** 독도가 육지 1등을 앞선 분 [최소, 최대] */
export const ISLAND_LEAD: number[] = raw.islandLeadMin;

/** "01-01" → "1월 1일" */
export function mdLabel(md: string): string {
  const [m, d] = md.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** 분 → "07:32" */
export function hm(t: number): string {
  const v = Math.round(t) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/**
 * 그날의 순위. 시각이 빠른 순으로 LAND 인덱스를 늘어놓는다.
 *
 * 이 편의 그림은 이 배열이 날마다 바뀌는 것이다. 값이 아니라 순서가
 * 주인공이라, 화면에서 줄이 자리를 옮기는 애니메이션의 근거가 여기다.
 */
export function orderAt(i: number): number[] {
  const d = DAYS[Math.max(0, Math.min(DAYS.length - 1, i))];
  return d.t.map((v, k) => [v, k] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, k]) => k);
}

export function dayAt(i: number): Day {
  return DAYS[Math.max(0, Math.min(DAYS.length - 1, i))];
}

export interface SunBeat {
  /** DAYS의 인덱스 */
  at: number;
  kicker: string;
  title: string;
  detail: string;
  impact: number;
  /** 이 비트에서 동지 순위를 겹쳐 보여줄지 — 꼭짓점에서만 쓴다 */
  compare?: boolean;
}

const idx = (md: string) => DAYS.findIndex((d) => d.md === md);

/**
 * 비트 일곱 — 1등이 이어지는 구간을 그대로 쓴다.
 *
 * prep-sunrise.py가 뽑은 runs와 하나씩 대응한다. 손으로 고른 것이 아니라
 * 계산이 정해준 자리라 자막이 화면과 어긋날 수가 없다.
 *
 * ── 머리말이 날짜가 아니라 기간인 이유 ──
 *
 * 처음에 여섯 비트로 잡고 머리말에 '7월 3일'처럼 하루를 적었다. 그런데
 * 이 편은 체류 중에도 날짜가 흘러야 순위표가 계속 미끄러지므로 creep이
 * 0.35다. 그러면 계기판이 8월 5일을 가리키는데 자막은 7월 3일이라고
 * 적혀 있다. 표준시 편에서 '자막과 계기가 서로를 부정한다'고 적고 피했던
 * 바로 그 자리다.
 *
 * 머리말을 구간으로 바꾸면 계기판의 날짜가 언제나 그 구간 안에 있다.
 * 그리고 구간을 쓰려면 일곱 개가 다 있어야 한다 — 여섯으로 줄이면
 * 8월 25일~10월 23일이 비어서 그동안 계기판과 자막이 또 어긋난다.
 *
 * 넷째(6월 12일, 고성)가 꼭짓점이다. 동지 순위와 정확히 반대가 되는
 * 화면이라 거기서만 겨울 순위를 겹쳐 보여준다.
 */
export const SUN_BEATS: SunBeat[] = [
  {
    at: idx("01-01"),
    kicker: "1월 1일 ~ 2월 20일",
    title: "간절곶",
    detail: "새해 첫 해는 호미곶과 1분 차이",
    impact: 1,
  },
  {
    at: idx("02-21"),
    kicker: "2월 21일 ~ 4월 20일",
    title: "호미곶이 앞섬",
    detail: "해가 북으로 올라오며 순서가 흔들림",
    impact: 0.9,
  },
  {
    at: idx("04-21"),
    kicker: "4월 21일 ~ 6월 11일",
    title: "정동진으로",
    detail: "이제 위도가 경도를 이김",
    impact: 0.9,
  },
  {
    at: idx("06-12"),
    kicker: "6월 12일 ~ 7월 2일",
    title: "고성이 1등",
    detail: "겨울에 꼴찌였던 자리",
    impact: 1,
    compare: true,
  },
  {
    at: idx("07-03"),
    kicker: "7월 3일 ~ 8월 24일",
    title: "다시 정동진",
    detail: "고성이 1등인 날은 스물하루뿐",
    impact: 0.8,
  },
  {
    at: idx("08-25"),
    kicker: "8월 25일 ~ 10월 23일",
    title: "호미곶으로 내려옴",
    detail: "올라갈 때와 같은 순서를 거꾸로",
    impact: 0.8,
  },
  {
    at: idx("10-24"),
    kicker: "10월 24일 ~ 12월 31일",
    title: "간절곶으로 복귀",
    detail: "한 해에 여섯 번 바뀐 자리",
    impact: 1,
  },
];

/** 동지 순위 — 꼭짓점 비트에서 옆에 겹쳐 보여준다 */
export const WINTER = (() => {
  const i = idx("12-22");
  return { i, order: orderAt(i), day: DAYS[i] };
})();
