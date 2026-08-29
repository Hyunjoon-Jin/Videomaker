/**
 * 바다에서 가장 먼 지자체 (scripts/rank-inland.py 산출물).
 *
 * 좌표는 korea-paths.json과 같은 0..1000 투영이라 전국 지도 위에
 * 그대로 얹힌다.
 */
import raw from "./inland.json";

export interface Touch {
  /** 그 바다까지 km */
  km: number;
  x: number;
  y: number;
}

export interface Case {
  /** 1이 가장 먼 곳 */
  rank: number;
  /** 시도를 붙인 지자체 이름 */
  name: string;
  /** 최원점이 든 읍면동 */
  emd: string;
  /** 바다까지 km (반올림) */
  km: number;
  /** 최원점 */
  x: number;
  y: number;
  /** 그 거리를 투영 단위로 옮긴 원의 반지름 */
  r: number;
  /** 그 지자체 전체 SVG path */
  d: string;
  west: Touch;
  east: Touch;
}

export interface Row {
  rank: number;
  name: string;
  emd: string;
  km: number;
  west: number;
  east: number;
}

/**
 * 해안선.
 *
 * 시군구 폴리곤만 그리면 금강 하구나 아산만 같은 물길이 안 보인다.
 * 원이 닿는 자리가 육지 한복판처럼 보여서 못 믿을 그림이 된다.
 * 바탕색으로 가늘게 그어 그 물길을 판다.
 */
export const COAST = raw.coast as string;

/** 5위에서 1위로 */
export const CASES = raw.cases as unknown as Case[];
export const TABLE = raw.table as unknown as Row[];

/** 1km가 몇 투영 단위인지 */
export const UNIT_KM = raw.unitKm as number;

/** 한 자리에 머무는 시간(초) */
export const HOLD = [6.0, 5.8, 5.8, 5.8, 7.2];

/**
 * 전국 구도. 고정이다.
 *
 * 이 편은 원의 크기가 자다. 카메라가 움직이면 못 견준다. 그리고
 * 원이 서해와 동해에 동시에 닿는 것이 그림이라 두 바다가 늘 한
 * 화면에 있어야 한다.
 */
export const WIDE = { cx: 500, cy: 470, z: 1.0 };
