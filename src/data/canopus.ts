/**
 * 노인성이 보이는 경계선 — 투영과 비트.
 *
 * 야마: 노인성(카노푸스)은 북위 37.3도 아래에서만 지평선 위로
 * 올라온다. 그 선이 서울과 수원 사이를 지난다.
 *
 * 숫자는 전부 scripts/prep-canopus.py가 계산한 것이다.
 */
import raw from "./canopus.json";
import { project } from "./places";

export interface Site {
  name: string;
  lat: number;
  lon: number;
  /** 남중고도(도). 음수면 지평선 아래 */
  alt: number;
  /** 대기 굴절을 넣은 겉보기 고도 */
  altRef: number;
  /** 지평선 위로 올라오나 */
  up: boolean;
  x: number;
  y: number;
}

const place = <T extends { lat: number; lon: number }>(s: T) => ({
  ...s,
  ...project(s.lon, s.lat),
});

/**
 * 지도에 찍는 지점.
 *
 * 인천(37.478)과 원주(37.338)를 뺐다. 서울·수원과 위도가 0.1도 안에
 * 몰려 있어 지도에서 라벨이 통째로 겹친다. 이 편이 다루는 차이가
 * 0.3도라 전국 지도의 축척으로는 애초에 안 벌어진다 — 그래서 경계선
 * 언저리는 확대 판이 따로 맡는다.
 */
const HIDE = ["인천", "원주", "서귀포"];
export const SITES: Site[] = raw.sites.filter((s) => !HIDE.includes(s.name)).map(place);
/** 확대 판에는 다 나온다 */
export const ALL_SITES: Site[] = raw.sites.map(place);
export const PEAKS = raw.peaks.map(place);
export const STAR = raw.star;
export const NOW: number = raw.now;
export const FROM: number = raw.from;
/** 지금의 한계 위도 */
export const LIMIT: number = raw.limit;
export const LIMIT_DMS: string = raw.limitDms;
export const REFRACTION: number = raw.refraction;
export const DRIFT = raw.drift;
export const SEOUL_GAP = raw.seoulGapKm;
/** 25년 간격의 한계 위도 자취 */
export const TRACK: Array<{ y: number; lim: number }> = raw.track;

const byName = (n: string) => ALL_SITES.find((s) => s.name === n)!;
export const SEOUL = byName("서울");
export const SUWON = byName("수원");
export const JEJU = byName("제주");

/** 위도 → 지도 y. places.ts의 투영식과 같은 것이다. */
export function latY(lat: number): number {
  return project(127, lat).y;
}

/** 그 해의 한계 위도 — TRACK을 사이 보간해서 쓴다 */
export function limitAt(year: number): number {
  if (year <= TRACK[0].y) return TRACK[0].lim;
  const last = TRACK[TRACK.length - 1];
  if (year >= last.y) return last.lim;
  for (let i = 1; i < TRACK.length; i++) {
    if (year <= TRACK[i].y) {
      const a = TRACK[i - 1];
      const b = TRACK[i];
      return a.lim + ((b.lim - a.lim) * (year - a.y)) / (b.y - a.y);
    }
  }
  return last.lim;
}

/** 위도 1도를 111.0km로 본다 — prep-canopus.py와 같은 값 */
export function gapKm(lat: number, year: number): number {
  return (lat - limitAt(year)) * 111.0;
}

/** 도 표기. 음수면 부호를 붙여 지평선 아래임을 보인다. */
export function deg(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}°`;
}

export interface CanBeat {
  /** 화면에 없는 것 한 줄. 없으면 자막을 안 띄운다. */
  line: string;
  impact: number;
  /** 이 비트에서 켜지는 지점 수. SITES 앞에서부터 센다. */
  n: number;
  /** 경계선 언저리를 확대하는 비트 */
  zoom?: boolean;
  /** 남쪽 하늘 판으로 넘어가는 비트 */
  sky?: boolean;
  /** 경계선이 내려오는 비트 — 계기판이 연도로 바뀐다 */
  drift?: boolean;
}

/**
 * 비트.
 *
 * 13편에서 배운 것을 그대로 쓴다. 순위·이름·값이 화면에 있으면
 * 자막은 화면에 없는 것 한 줄만 말한다.
 */
export const CAN_BEATS: CanBeat[] = [
  { line: "노인성 — 시리우스 다음으로 밝은 별", impact: 0.9, n: 0 },
  { line: "선 아래에서만 지평선 위로 올라옴", impact: 1, n: 8 },
  { line: "서울과 수원은 30km 거리", impact: 1, n: 8, zoom: true },
  { line: "같은 시각, 같은 남쪽 하늘", impact: 1, n: 8, sky: true },
  { line: "자전축이 돌아 선이 내려오는 중", impact: 1, n: 8, drift: true },
];
