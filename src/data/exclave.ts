/**
 * 걸어서 갈 수 있는데 가는 길이 전부 남의 동네인 땅 2곳
 * (scripts/prep-exclave.py 산출물).
 *
 * 좌표는 korea-paths.json과 같은 0..1000 투영이라 전국 지도 위에
 * 그대로 얹힌다.
 */
import raw from "./exclave.json";

export interface Between {
  /** 최단선이 지나는 곳. 남의 시·군 이름, 또는 '바다' */
  name: string;
  km: number;
}

export interface Piece {
  /** 화면에 쓰는 이름. 겹치는 이름만 시도가 붙는다(인천 중구) */
  name: string;
  sido: string;
  /** 떨어진 땅의 넓이 km² (계산값) */
  area: number;
  /** 그 시·군 전체 넓이 km² (계산값) */
  total: number;
  /** 떨어진 땅이 차지하는 비율 % */
  pct: number;
  /** 나머지 땅까지 직선 km — 이 편의 큰 숫자 */
  dist: number;
  /** 그 직선이 무엇 위를 지나는지 */
  between: Between[];
  /** 떨어진 땅 SVG path */
  piece: string;
  /** 그 시·군의 나머지 땅 SVG path */
  main: string;
  /** 직선 두 끝 */
  line: [number, number][];
  /** 150m 안으로 맞닿은 남의 시·군 */
  nb: string[];
}

export interface Label {
  text: string;
  /** piece = 떨어진 땅, main = 나머지 땅, neigh = 사이에 낀 남의 동네 */
  kind: "piece" | "main" | "neigh";
  x: number;
  y: number;
}

export interface Case {
  pieces: Piece[];
  cam: { cx: number; cy: number; z: number };
  /** 이 화면에서 따로 칠할, 최단선이 지나는 남의 동네 */
  nbNames: string[];
  /**
   * 지도에 앉히는 이름표.
   *
   * 색만 칠해두면 어느 게 어디 땅인지 알 수가 없다. 자리는
   * prep-exclave.py가 카메라 안을 격자로 훑어 그 땅 위에서 고른다.
   */
  labels: Label[];
}

export interface Row {
  name: string;
  sido: string;
  area: number;
  pct: number;
  dist: number;
  nb: number;
}

/** 떨어진 거리가 짧은 것에서 긴 것으로 */
export const CASES = raw.cases as unknown as Case[];
export const TABLE = raw.table as unknown as Row[];
/** 최단선이 지나는 남의 동네 겉모양 */
export const SHAPES = raw.shapes as Record<string, string>;
export const COUNT: number = raw.count;

/** 이웃과 아예 안 닿는 덩어리 — 흑산도·돌산도·교동도·연평도 같은 것 */
export const ISLAND_COUNT: number = raw.islandCount;
/** 이웃과는 닿지만 사람이 안 사는 것 — 방조제와 항만 매립지 */
export const EMPTY_COUNT: number = raw.emptyCount;
/** 사람은 살지만 사이가 바다인 것 — 대부도와 내륙 중구 */
export const SEA_COUNT: number = raw.seaCount;

/**
 * 자막.
 *
 * 지도에 이름표가 붙은 뒤로 자막이 같은 말을 두 번 하고 있었다.
 * '부안 옆에 붙은 군산시 땅'은 이름표 두 개(군산시 떨어진 땅·부안군)와
 * 같은 말이다. 계기판이 거리·넓이·비율을 세우고 지도가 어디인지를
 * 말하므로, 자막은 **둘 다 못 주는 것**만 적는다 — 읍·면 이름,
 * 섬 이름, 매립지 이름.
 *
 * 할 말이 없으면 비운다. 채우려고 쓰지 않는다.
 */
export const LINES: string[] = [
  "다사읍 · 하빈면",
  "이서면",   // OSM 마을 이름이 금계리·남계리·이성리·이문리 — 이서면이다
];

/** 한 자리에 머무는 시간(초) */
export const HOLD = [9.4, 8.6];

/** 전국 구도 */
export const WIDE = { cx: 435, cy: 500, z: 1.72 };
