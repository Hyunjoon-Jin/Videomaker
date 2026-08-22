/**
 * 2010년, 좌표가 365m 움직였다 — 투영과 비트.
 *
 * 야마: 100년 동안 우리 땅의 좌표는 도쿄를 기준으로 매겨져 있었다.
 * 기준을 바꾸자 전국의 좌표가 한꺼번에 365m 움직였다. 땅은 그대로인데.
 *
 * 숫자는 전부 scripts/prep-datum.py가 계산한 것이다. 여기서는 화면에
 * 쓸 모양으로만 바꾼다.
 */
import raw from "./datum.json";
import { project } from "./places";

export interface Site {
  name: string;
  short: string;
  lat: number;
  lon: number;
  /** 세계측지계로 옮겼을 때 위·경도가 몇 초 커지는가 */
  dLat: number;
  dLon: number;
  /** 같은 것을 미터로. 북이 +, 동이 + */
  north: number;
  east: number;
  dist: number;
  /** 반도 투영 좌표 */
  x: number;
  y: number;
}

export const SITES: Site[] = raw.sites.map((s) => ({ ...s, ...project(s.lon, s.lat) }));

/** 확대해서 볼 지점. SITES의 첫 항목이다 — prep-datum.py와 약속돼 있다. */
export const FOCUS: Site = SITES[0];

export const SPAN = raw.span;
export const PARAMS = raw.params;

/**
 * 화살표 과장 배율.
 *
 * 반도 투영은 지도 1단위가 약 1.1km다. 365m는 0.33단위라 선으로 그리면
 * 점 안에 묻힌다. 그래서 방향을 보이는 화살표는 과장해서 그리고, 배율을
 * 화면에 적는다. 적지 않고 과장하면 그건 그냥 틀린 그림이다.
 */
export const ARROW_X = 100;

/** 지도 1단위가 몇 m인가 — 위도 37도 기준. places.ts의 KY에서 나온다. */
export const M_PER_UNIT = 1089;

export interface DatumBeat {
  /** 계기판에 걸리는 연도 */
  year: number;
  kicker: string;
  title: string;
  detail: string;
  impact: number;
  /** 이 비트에서 근정전 확대가 열린다 */
  zoom?: boolean;
  /** 이 비트에서 전국 화살표가 켜진다 */
  arrows?: boolean;
}

/**
 * 비트.
 *
 * 1910에서 2001까지 91년이 한 번의 이동으로 지나간다. 그 구간에 사건을
 * 끼워 넣고 싶었지만, 아무 일도 안 일어난 것이 이 편의 사실이다. 계기판이
 * 90년을 훑고 지나가는 그 동작 자체가 '그동안 그대로였다'를 말한다.
 *
 * 확인 근거는 셋이다.
 *  · 측량법 제5조제1항제2호 <개정 2001.12.19> — 국가법령정보센터
 *  · 부칙(법률 제9774호, 2009.6.9.) 제5조 제1항·제2항 — 같은 곳
 *  · 국토교통부 지적재조사기획단 보도자료 2015.3.6.
 * docs/plan-datum.md에 원문을 옮겨 뒀다.
 */
export const DATUM_BEATS: DatumBeat[] = [
  {
    year: 1910,
    kicker: "1910년 토지조사사업",
    title: "좌표의 기준점은 일본 도쿄",
    detail: "타원체도 일본이 쓰던 베셀 1841",
    impact: 0.9,
  },
  {
    year: 2001,
    kicker: "2001년 12월 측량법 개정",
    title: "기준을 지구 질량중심으로",
    detail: "세계측지계, 타원체는 GRS80",
    impact: 0.9,
  },
  {
    year: 2010,
    kicker: "2010년",
    title: "지도가 한꺼번에 바뀐 해",
    detail: "같은 자리인데 위도 +10초, 경도 -8초",
    impact: 1,
    zoom: true,
  },
  {
    year: 2011,
    kicker: "옛 좌표를 새 지도에 찍으면",
    title: "남동쪽으로 365m 어긋남",
    detail: "땅은 그대로, 움직인 건 좌표뿐",
    impact: 1,
    arrows: true,
  },
  {
    year: 2015,
    kicker: "2015년 지적 변환 본사업",
    title: "땅문서는 10년을 더 씀",
    detail: "2015년 한 해에만 300만 필지",
    impact: 0.5,
    arrows: true,
  },
  {
    year: 2020,
    kicker: "2020년 12월 31일",
    title: "동경측지계를 쓸 수 있는 마지막 날",
    detail: "토지조사사업으로부터 110년",
    impact: 1,
    arrows: true,
  },
];

/** 계기판이 훑는 구간 */
export const YEAR_FROM = DATUM_BEATS[0].year;
export const YEAR_TO = DATUM_BEATS[DATUM_BEATS.length - 1].year;

/** 초 단위를 화면 표기로 — 부호를 붙여 방향이 읽히게 한다 */
export function sec(v: number): string {
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(1)}″`;
}
