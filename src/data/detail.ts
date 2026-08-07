/**
 * 전선·전투 위에 얹는 세부 레이어.
 *
 * 지금까지 지도가 말하지 않던 것들이다.
 *  - 의병: 관군이 무너진 뒤 전쟁을 버틴 축인데 통째로 빠져 있었다.
 *  - 왜성: 1594~96 소강기가 "아무 일 없음"으로 보이지만, 실제로는 남해안에
 *    왜성이 박혀 일본군이 눌러앉아 있던 시기다. 교착의 실체가 이 벨트다.
 *  - 파천·명군: 평양성을 "조명연합군"이 탈환했다고 자막만 뜨고 명군은
 *    지도에 존재하지 않았다. 선조가 의주까지 간 것도 선으로 보여야 한다.
 *
 * 좌표는 실제 위경도 → places.ts의 project()로 환산. 눈대중 없음.
 * month는 1592년 4월(음력) = 0.
 */
import { project } from "./places";

/* ── 의병 ─────────────────────────────────────────── */

export interface Militia {
  leader: string;
  place: string;
  month: number;
  x: number;
  y: number;
  /** 이름표를 붙일지 — 전부 붙이면 지도가 막힌다 */
  label?: boolean;
  side?: "left" | "right";
  dy?: number;
}

const M = (
  leader: string, place: string, month: number, lon: number, lat: number,
  opt: { label?: boolean; side?: "left" | "right"; dy?: number } = {}
): Militia => ({ leader, place, month, ...project(lon, lat), ...opt });

export const MILITIA: Militia[] = [
  // 곽재우 — 음 4월 22일 의령 기병. 개전 9일 만으로 전국에서 가장 빠르다.
  M("곽재우", "의령", 0.7, 128.26, 35.32, { label: true, side: "right" }),
  M("정인홍", "합천", 1.2, 128.17, 35.57),
  M("조헌", "옥천", 1.3, 127.57, 36.31, { label: true, side: "right" }),
  M("김천일", "나주", 1.5, 126.72, 35.02, { side: "left" }),
  M("고경명", "담양", 1.5, 126.99, 35.32, { label: true, side: "left", dy: 18 }),
  // 승병은 선조의 격문 이후 궐기. 휴정은 묘향산, 유정은 금강산으로
  // 기병지가 다르다 — 묶어 쓰면 곧바로 지적당한다.
  M("휴정", "묘향산", 3.2, 126.32, 40.00, { label: true, side: "right", dy: -6 }),
  M("유정", "금강산", 3.4, 128.15, 38.65, { side: "right" }),
  // 정문부 — 음 9월 함경도 경성 기병, 북관대첩으로 이어진다.
  M("정문부", "경성", 5.0, 129.60, 41.55, { label: true, side: "left" }),
];

/* ── 왜성 ─────────────────────────────────────────── */

export interface Fort {
  name: string;
  x: number;
  y: number;
}

const F = (name: string, lon: number, lat: number): Fort => ({ name, ...project(lon, lat) });

/** 남해안 왜성 벨트. 1593년 4월 한양 철수 이후 축조·주둔. */
export const FORTS: Fort[] = [
  F("서생포", 129.34, 35.40),
  F("울산", 129.35, 35.56),
  F("부산", 129.05, 35.13),
  F("양산", 129.03, 35.34),
  F("죽도", 128.87, 35.19),
  F("웅천", 128.71, 35.09),
  F("창원", 128.58, 35.19),
  F("영등포", 128.70, 34.95),
  F("고성", 128.32, 34.97),
  F("사천", 128.07, 35.02),
  F("남해", 127.92, 34.83),
  F("순천", 127.50, 34.88),
];

/** 왜성 등장/소멸 (한양 철수 ~ 종전) */
export const FORT_FROM = 12;
export const FORT_TO = 79;

/* ── 이동 경로 ─────────────────────────────────────── */

export interface Route {
  id: string;
  color: string;
  /** 시작·종료 개월 — 이 사이에 선이 자란다 */
  from: number;
  to: number;
  pts: Array<{ x: number; y: number }>;
}

const R = (lon: number, lat: number) => project(lon, lat);

export const ROUTES: Route[] = [
  {
    // 선조 파천: 한양 → 개성 → 평양 → 의주
    id: "seonjo",
    color: "#E5E7EB",
    from: 1,
    to: 2.6,
    pts: [R(126.98, 37.57), R(126.55, 37.97), R(125.75, 39.02), R(124.50, 40.10)],
  },
  {
    // 명군 남하: 의주 → 평양 → 개성 → 한양
    id: "ming",
    color: "#FCD34D",
    from: 8,
    to: 12,
    pts: [R(124.50, 40.10), R(125.75, 39.02), R(126.55, 37.97), R(126.98, 37.57)],
  },
];

/** month 시점에 경로가 얼마나 그려졌는지 0..1 */
export function routeProgress(r: Route, month: number): number {
  if (month <= r.from) return 0;
  if (month >= r.to) return 1;
  return (month - r.from) / (r.to - r.from);
}
