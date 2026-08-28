/**
 * 같은 시·군 땅인데 가려면 남의 동네를 지나야 하는 곳 9군데
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

/**
 * 안 센 섬 — [x, y, 넓이km²].
 *
 * '그럼 흑산도나 백령도는 왜 안 세느냐'에 답이 있어야 한다.
 * 그냥 세면 1,049곳이다. 섬이 자기 시·군과 안 붙어 있는 것은
 * 사방이 바다라 그런 것이고, 이 편이 묻는 것은 땅으로는 남의
 * 시·군과 이어졌는데 자기 시·군과는 안 이어진 곳이다.
 *
 * 울릉도는 아예 안 걸린다. 울릉군의 나머지 땅이 아니라 울릉군
 * 그 자체이기 때문이다.
 */
export const ISLANDS = raw.islands as [number, number, number][];
export const ISLAND_COUNT: number = raw.islandCount;

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
  "",                    // 군산 — 이름표가 다 말한다
  "",                    // 완도
  "",                    // 광양
  "평택항 매립지",
  "넓은 쪽이 영종도",      // 시·군 이름표만으로는 안 읽힌다
  "당진항 매립지",
  "다사읍 · 하빈면",
  "",                    // 완주
  "대부도",
];

/** 한 자리에 머무는 시간(초) */
export const HOLD = [3.4, 3.4, 3.4, 3.6, 4.6, 4.4, 5.4, 4.6, 6.0];

/**
 * 아래 눈금 — 9곳을 떨어진 거리 순으로 세운 막대.
 *
 * 넓이로 세울 때는 제곱근을 썼다. 0.59와 74.74가 한 줄에 있어서다.
 * 거리는 0.36에서 7.75까지라 그대로 비례시켜도 제일 짧은 것이 안
 * 사라진다. 누르지 않아도 되면 누르지 않는다.
 */
export const RANK = CASES.map((c) => c.pieces[0]);

/** 전국 구도 */
export const WIDE = { cx: 435, cy: 500, z: 1.72 };
