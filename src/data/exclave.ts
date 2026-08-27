/**
 * 자기 시·군과 땅이 안 이어진 조각 9곳 (scripts/prep-exclave.py 산출물).
 *
 * 좌표는 korea-paths.json과 같은 0..1000 투영이라 전국 지도 위에
 * 그대로 얹힌다.
 */
import raw from "./exclave.json";

export interface Between {
  /** 시·군 이름, 또는 '바다' */
  name: string;
  km: number;
}

export interface Piece {
  /** 화면에 쓰는 이름. 겹치는 이름만 시도가 붙는다(인천 중구) */
  name: string;
  sido: string;
  /** 조각 면적 km² (계산값) */
  area: number;
  /** 그 시·군 전체 면적 km² (계산값) */
  total: number;
  /** 조각이 차지하는 비율 % */
  pct: number;
  /** 본체까지 직선 km */
  dist: number;
  /** 조각 SVG path */
  piece: string;
  /** 본체 SVG path */
  main: string;
  /** 최단선 두 끝 */
  line: [number, number][];
  /** 150m 안으로 맞닿은 남의 시·군 */
  nb: string[];
  /** 최단선이 지나는 땅 */
  between: Between[];
}

export interface Case {
  pieces: Piece[];
  cam: { cx: number; cy: number; z: number };
  /** 이 화면에서 따로 칠할 이웃 */
  nbNames: string[];
}

export interface Row {
  name: string;
  sido: string;
  area: number;
  pct: number;
  dist: number;
  /** 맞닿은 시·군 수 */
  nb: number;
}

export const CASES = raw.cases as unknown as Case[];
/** 면적 큰 순 9줄 — 마무리 표 */
export const TABLE = raw.table as unknown as Row[];
/** 이웃 시·군 겉모양 */
export const SHAPES = raw.shapes as Record<string, string>;
export const COUNT: number = raw.count;

/**
 * 자막.
 *
 * 계기판이 이름·면적·비율·거리를 이미 세운다. 이 줄은 숫자를 다시
 * 읽지 않고 '그래서 그게 무슨 자리인가'만 말한다.
 *
 * 줄바꿈은 브라우저에 맡기지 않는다. 어절 단위로 아무 데서나 끊겨
 * 뜻이 갈린다 — 18편에서 배운 것이다.
 */
export const LINES: string[][] = [
  ["평택항과 당진항 사이 매립지", "당진 0.97km² · 평택 0.59km²"],
  ["완도군 땅인데 해남에 붙은 조각"],
  ["군산시 땅인데 부안에 붙은 조각"],
  ["광양시 땅인데 여수와 순천 사이"],
  ["인천 중구는 영종도 쪽이 본체", "내륙 쪽이 떨어져 나온 조각"],
  ["전주를 건너야 닿는 완주 땅"],
  ["대부도", "본토로 가려면 시흥이나 화성"],
  ["다사읍과 하빈면", "둘러싼 시·군·구 6곳"],
];

/** 한 자리에 머무는 시간(초) */
export const HOLD = [4.4, 3.6, 3.6, 3.6, 4.8, 4.4, 5.2, 6.4];

/**
 * 아래 눈금에 세우는 9조각 — 작은 것에서 큰 것으로.
 *
 * 막대 길이는 면적의 제곱근이다. 면적에 비례시키면 0.59km²가 74.74km²
 * 옆에서 1픽셀이 되고, 로그로 누르면 74.74가 안 커 보인다. 제곱근은
 * '한 변의 길이'라 눈이 재는 것과 맞는다.
 */
export const RANK = [...TABLE].sort((a, b) => a.area - b.area);
/** 걸음 → 그 걸음에서 켜지는 눈금 자리 */
export const RANK_OF: number[][] = LINES.map((_, i) =>
  CASES[i].pieces.map((p) => RANK.findIndex((r) => r.name === p.name && r.area === p.area))
);

/**
 * 전국 구도.
 *
 * 투영 상자 0..1000은 독도(동경 131.9)와 백령도(124.6)까지 담느라
 * 가로가 늘어나 있다. 그대로 놓으면 육지가 왼쪽에 몰린 작은 덩어리가
 * 된다. 시군구 경계 점의 0.5~99.5% 구간(x 95~670, y 82~934)에 맞춰
 * 잘라 앉힌다.
 */
export const WIDE = { cx: 435, cy: 500, z: 1.72 };
