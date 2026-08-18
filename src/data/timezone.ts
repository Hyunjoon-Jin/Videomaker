/**
 * 한국 표준시 — 1908~2018.
 *
 * 질문 하나: 우리 시계는 어느 자오선에 맞춰져 있나.
 *
 * ── 왜 이 소재인가 ──────────────────────────────────
 * 간척 편이 막힌 이유는 그릴 것의 경계가 기록으로 확인이 안 돼서였다.
 * 옛 해안선 자료가 없으니 손으로 찍을 수밖에 없었고, 손으로 찍은 선은
 * 아무리 넓이를 맞춰도 실제와 다른 선이다.
 *
 * 이 편에는 그럴 자리가 없다. 화면에 그리는 것이 넷뿐이다.
 *
 *   1. 동아시아 해안선 — 이미 쓰던 검증된 데이터(eastasia.json)
 *   2. 자오선 두 개 — 경도 127.5°와 135°. 투영식에 넣으면 나오는
 *      수학이라 추정이 낄 자리가 없다
 *   3. 도시 점 세 개 — 서울·평양·아카시의 경위도
 *   4. 날짜와 법령 번호 — 전부 기록값
 *
 * ── 확인한 것 ───────────────────────────────────────
 * 1908. 4. 1  대한제국, 동경 127.5° (UTC+8:30). 칙령 제5호, 관보 제3994호
 * 1912. 1. 1  조선총독부, 동경 135° (UTC+9:00). 관보 제367호 고시 제338호
 * 1954. 3. 21 동경 127.5° 환원. 대통령령 제876호(3월 17일 공포)
 * 1961. 8. 10 동경 135°. 법률 제676호(8월 7일 공포). 지금까지 그대로
 * 2015. 8. 15 북한, 평양시간 동경 127.5°. 광복 70주년에 맞췄다
 * 2018. 5.  5 북한, 동경 135° 환원. 4월 27일 판문점 선언 뒤다
 *
 * 그 사이 2년 9개월 동안 남과 북의 시계가 30분 어긋나 있었다.
 *
 * 1961년 것은 시계를 앞으로 돌린 변경이라 30분이 통째로 사라졌고, 1954년
 * 것은 뒤로 돌린 변경이라 30분이 한 번 더 흘렀다.
 *
 * 사라진 30분이 며칠 몇 시였는지는 화면에 적지 않았다. 신문 기사는
 * 8월 9일 밤 11시 30분이 10일 0시가 되었다고 하고, tz 데이터베이스는
 * 10일 0시가 0시 30분이 되었다고 해서 둘이 30분 어긋난다. 어느 쪽이
 * 맞는지 여기서는 확인할 방법이 없으므로, 확인된 것만 적는다 —
 * 시계를 30분 앞당겼다는 것.
 *
 * ── 계산한 것 ───────────────────────────────────────
 * 32분은 기록이 아니라 계산값이다. 경도 1도가 4분이므로
 * (135° − 126.978°) × 4 = 32.1분이다. 화면에서 기록값과 구분해 적는다.
 *
 * 이것은 평균태양시 기준이다. 지구 궤도가 타원이고 자전축이 기울어
 * 실제 남중 시각은 균시차만큼(연중 −14분 ~ +16분) 앞뒤로 움직인다.
 * 그래서 서울의 실제 남중은 12시 18분에서 12시 46분 사이를 오간다.
 * 고지 문구에 적어둔다.
 */
import { eaProject } from "./typhoon";

/** 두 자오선. 이 편에서 오가는 값은 이 둘뿐이다. */
export type Meridian = 127.5 | 135;
export const MERIDIANS: Meridian[] = [127.5, 135];

export const SEOUL_LON = 126.978;

/** 경도 1도는 4분이다. 도시가 자오선에서 얼마나 떨어졌는지가 곧 시차다. */
export function lagMin(lon: number, meridian: number): number {
  return (meridian - lon) * 4;
}

/** 서울과 동경 135° 사이 — 이 편의 답 */
export const LAG_MIN = Math.round(lagMin(SEOUL_LON, 135));

export function degLabel(m: Meridian): string {
  return `동경 ${m}도`;
}

export function utcLabel(m: Meridian): string {
  return m === 135 ? "UTC+9:00" : "UTC+8:30";
}

/**
 * 자오선을 지도 위 세로선으로.
 * eastasia.json의 위도 범위(10~46°) 끝에서 끝까지 긋는다.
 */
export function meridianPath(lon: number): string {
  const top = eaProject(lon, 46);
  const bot = eaProject(lon, 10);
  return `M${top.x.toFixed(1)} ${top.y.toFixed(1)}L${bot.x.toFixed(1)} ${bot.y.toFixed(1)}`;
}

export function meridianX(lon: number): number {
  return eaProject(lon, 37).x;
}

export interface City {
  name: string;
  lon: number;
  lat: number;
  x: number;
  y: number;
}

function city(name: string, lon: number, lat: number): City {
  const q = eaProject(lon, lat);
  return { name, lon, lat, x: q.x, y: q.y };
}

export const SEOUL = city("서울", SEOUL_LON, 37.5665);
export const PYONGYANG = city("평양", 125.7381, 39.0392);
/** 아카시(明石) — 일본 표준시 자오선이 지나는 도시 */
export const AKASHI = city("아카시", 134.9973, 34.6431);

export interface TEvent {
  /** 소수점 연도 — 화면의 연도 표시가 이 값을 센다 */
  year: number;
  /** 자막 머리 — 날짜와 주체 */
  kicker: string;
  title: string;
  detail: string;
  /** 이 시점부터 남(대한민국)이 쓰는 자오선 */
  south: Meridian;
  /** 북이 쓰는 자오선. 1948년 전에는 하나였으므로 남과 같다. */
  north: Meridian;
  impact?: number;
  /** 남북이 갈린 구간 — 화면에 두 줄을 세운다 */
  split?: boolean;
}

/**
 * 연도의 소수점 자리는 그해 며칠째인지를 넣었다.
 * 1912년 1월 1일이 1912.0이고 1961년 8월 10일이 1961.605다.
 * 화면에는 정수부만 '년'을 붙여 띄운다.
 */
export const TZ_EVENTS: TEvent[] = [
  {
    year: 1908 + 91 / 366,
    kicker: "1908년 4월 1일 · 대한제국",
    title: "동경 127.5도",
    detail: "칙령 제5호 · 한반도 한가운데를 지나는 자오선",
    south: 127.5, north: 127.5, impact: 0.9,
  },
  {
    year: 1912,
    kicker: "1912년 1월 1일 · 조선총독부",
    title: "동경 135도",
    detail: "관보 고시 제338호 · 일본 표준시와 같은 선",
    south: 135, north: 135, impact: 1,
  },
  {
    year: 1954 + 79 / 365,
    kicker: "1954년 3월 21일 · 대한민국",
    title: "동경 127.5도 환원",
    detail: "대통령령 제876호 · 42년 만에 시계를 30분 늦춤",
    south: 127.5, north: 127.5, impact: 0.9,
  },
  {
    year: 1961 + 221 / 365,
    kicker: "1961년 8월 10일 · 대한민국",
    title: "동경 135도",
    detail: "법률 제676호 · 7년 만에 되돌림. 지금까지 그대로",
    south: 135, north: 135, impact: 1,
  },
  {
    year: 2015 + 226 / 365,
    kicker: "2015년 8월 15일 · 북한",
    title: "평양시간 127.5도",
    detail: "광복 70주년 · 남북의 시계가 30분 차이",
    south: 135, north: 127.5, impact: 1, split: true,
  },
  {
    year: 2018 + 124 / 365,
    kicker: "2018년 5월 5일 · 북한",
    title: "동경 135도 환원",
    detail: "4월 27일 판문점 선언 뒤 · 남북의 시계가 다시 하나",
    south: 135, north: 135, impact: 1,
  },
];

export const FIRST_YEAR = TZ_EVENTS[0].year;
export const LAST_YEAR = TZ_EVENTS[TZ_EVENTS.length - 1].year;

/** 그 시점에 남이 쓰던 자오선 */
export function southAt(year: number): Meridian {
  let v = TZ_EVENTS[0].south;
  for (const e of TZ_EVENTS) if (e.year <= year + 1e-9) v = e.south;
  return v;
}

export function northAt(year: number): Meridian {
  let v = TZ_EVENTS[0].north;
  for (const e of TZ_EVENTS) if (e.year <= year + 1e-9) v = e.north;
  return v;
}

/** 남북이 갈려 있는 구간인가 */
export function splitAt(year: number): boolean {
  return southAt(year) !== northAt(year);
}

/**
 * 마무리 표 — 두 자오선을 나란히 세운다.
 * 시차는 적어두지 않고 경도에서 뽑는다. 손으로 적으면 언젠가 어긋난다.
 */
export const M_ROWS = MERIDIANS.map((m) => ({
  m,
  deg: `동경 ${m}°`,
  where: m === 127.5 ? "한반도 한가운데" : "일본 아카시",
  lag: `서울과 ${Math.round(lagMin(SEOUL_LON, m))}분`,
}));
