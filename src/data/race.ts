/**
 * 기온 폭 순위 레이스 — 데이터와 화면 셈.
 *
 * 야마: 우리나라에서 기온이 가장 크게 벌어지는 동네가 88년 동안
 * 어떻게 바뀌었나. 서울에서 춘천으로, 춘천에서 양평으로.
 *
 * 앞판은 최종 순위 다섯 개를 세워 놓고 끝이었다. 결과는 맞지만
 * 화면이 정지해 있었다. 순위표가 처음부터 끝까지 그대로면 볼 이유가
 * 없다. 그래서 해마다 순위를 다시 낸다.
 *
 * 숫자는 전부 scripts/prep-race.py가 기상청에서 받은 것이다.
 */
import raw from "./race.json";
import { project } from "./places";

export interface Row {
  stn: string;
  name: string;
  /** 그 해까지의 역대 최고 */
  hi: number;
  /** 그 해까지의 역대 최저 */
  lo: number;
  /** 최고 − 최저 */
  gap: number;
}

export interface YearRow {
  y: number;
  /** 그 해에 관측 중이던 지점 수 */
  n: number;
  top: Row[];
}

export const YEARS: YearRow[] = raw.years;
export const FROM: number = raw.from;
export const TO: number = raw.to;
export const TOP_N: number = raw.topN;
export const LEAD_CHANGES: number = raw.leadChanges;

/** 순위표에 한 번이라도 오른 지점의 지도 좌표 */
export const SPOTS: Record<string, { name: string; x: number; y: number }> =
  Object.fromEntries(
    Object.entries(
      raw.stations as Record<string, { name: string; lat: number; lon: number }>
    ).map(([k, v]) => [k, { name: v.name, ...project(v.lon, v.lat) }])
  );

/**
 * 막대는 0에서 시작하지 않는다.
 *
 * 이 값은 길이가 아니라 **구간**이다. 그 지점이 겪은 최저부터 최고까지
 * 온도축 위에 그대로 눕힌다. 왼쪽 끝이 겨울 기록, 오른쪽 끝이 여름
 * 기록이고, 길이가 곧 순위다. 0에서 시작하는 막대로 그리면 42도와
 * 73도가 둘 다 그냥 긴 막대라 차이가 안 보인다.
 */
export const AX_MIN = -36;
export const AX_MAX = 46;

/** 해마다 몇 프레임을 주나. 이동은 앞 TRANS 프레임에만. */
export const PER_YEAR = 13;
export const TRANS = 8;

export interface Frame {
  /** 화면에 걸리는 연도 */
  year: number;
  /** 그 해 관측 지점 수 */
  n: number;
  /** 지점번호 → 그 해 순위(0부터). 순위표 밖이면 TOP_N */
  rank: Record<string, number>;
  /** 지점번호 → 그 해 값 */
  row: Record<string, Row>;
}

function frameOf(i: number): Frame {
  const y = YEARS[Math.max(0, Math.min(YEARS.length - 1, i))];
  const rank: Record<string, number> = {};
  const row: Record<string, Row> = {};
  y.top.forEach((r, k) => {
    rank[r.stn] = k;
    row[r.stn] = r;
  });
  return { year: y.y, n: y.n, rank, row };
}

const FRAMES: Frame[] = YEARS.map((_, i) => frameOf(i));

/**
 * 지금 화면.
 *
 * 해마다 PER_YEAR 프레임을 주고, 그중 앞 TRANS 프레임에만 줄이
 * 움직인다. 나머지는 서 있다. 값은 새 해 것으로 바로 갈아 끼운다 —
 * 기록은 깨질 때 계단으로 뛰는 값이라 중간값을 보여주면 없던 숫자가
 * 뜬다. 움직이는 것은 줄의 자리와 막대의 끝이지 숫자가 아니다.
 */
export function raceAt(t: number): {
  frame: Frame;
  prev: Frame;
  /** 0이면 앞 해 자리, 1이면 이 해 자리 */
  p: number;
} {
  const i = Math.max(0, Math.min(YEARS.length - 1, Math.floor(t / PER_YEAR)));
  const k = Math.max(0, Math.min(1, (t - i * PER_YEAR) / TRANS));
  return {
    frame: FRAMES[i],
    prev: FRAMES[Math.max(0, i - 1)],
    p: k * k * (3 - 2 * k),
  };
}

export const BODY_FRAMES = YEARS.length * PER_YEAR;

/** 이 프레임에 그려야 하는 지점들 — 지금 순위표에 있거나 방금 밀려난 것 */
export function castAt(f: Frame, prev: Frame): string[] {
  const s = new Set([...Object.keys(f.rank), ...Object.keys(prev.rank)]);
  return [...s];
}

/** 순위 — 표 밖이면 한 칸 아래로 보내 화면 밖으로 흘린다 */
export function rankOf(f: Frame, stn: string): number {
  return f.rank[stn] ?? TOP_N;
}
