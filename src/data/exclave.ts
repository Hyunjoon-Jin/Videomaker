/**
 * 같은 시·군 땅인데 가려면 남의 동네를 지나야 하는 곳 9군데
 * (scripts/prep-exclave.py 산출물).
 *
 * 좌표는 korea-paths.json과 같은 0..1000 투영이라 전국 지도 위에
 * 그대로 얹힌다.
 */
import raw from "./exclave.json";

export interface Through {
  /** 길이 지나는 남의 시·군 */
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
  /** 나머지 땅까지 직선 km */
  dist: number;
  /** 나머지 땅까지 도로 km — 이 편의 큰 숫자 */
  road: number;
  /** 그만큼 차로 걸리는 분 */
  min: number;
  /** 도로 ÷ 직선 */
  ratio: number;
  /** 그 길이 남의 동네를 지나는 거리 km */
  other: number;
  /** 그 길이 바다·호수 위를 지나는 거리 km (다리) */
  sea: number;
  /** 지나는 남의 동네 */
  names: Through[];
  /** 떨어진 땅 SVG path */
  piece: string;
  /** 그 시·군의 나머지 땅 SVG path */
  main: string;
  /** 직선 두 끝 */
  line: [number, number][];
  /** 실제로 달리는 길 */
  path: [number, number][];
  /** 150m 안으로 맞닿은 남의 시·군 */
  nb: string[];
}

export interface Case {
  pieces: Piece[];
  cam: { cx: number; cy: number; z: number };
  /** 이 화면에서 따로 칠할, 길이 지나는 남의 동네 */
  nbNames: string[];
}

export interface Row {
  name: string;
  sido: string;
  area: number;
  pct: number;
  dist: number;
  road: number;
  min: number;
  ratio: number;
  other: number;
}

/** 도로 거리가 짧은 것에서 긴 것으로 */
export const CASES = raw.cases as unknown as Case[];
export const TABLE = raw.table as unknown as Row[];
/** 길이 지나는 남의 동네 겉모양 */
export const SHAPES = raw.shapes as Record<string, string>;
export const COUNT: number = raw.count;

/**
 * 자막.
 *
 * 계기판이 이름·도로·직선·시간을 이미 세운다. 이 줄은 숫자를 다시
 * 읽지 않고 '그래서 그게 무슨 자리인가'만 말한다.
 *
 * 어려운 말을 안 쓴다. '본체'는 '나머지 땅', '조각'은 '떨어진 땅',
 * '월경지'는 아예 안 쓴다.
 *
 * 줄바꿈은 브라우저에 맡기지 않는다. 어절 단위로 아무 데서나 끊겨
 * 뜻이 갈린다 — 18편에서 배운 것이다.
 */
export const LINES: string[][] = [
  ["평택항 매립지 0.59km²", "9곳 중 제일 가까운 땅"],
  ["부안 옆에 붙은 군산시 땅"],
  ["여수와 순천 사이 광양시 땅", "가는 길에 순천 1.2km"],
  ["해남 쪽에 붙은 완도군 땅", "직선 0.4km인데 차로 7분"],
  ["대구 달성군 다사읍·하빈면", "74.7km² · 9곳 중 제일 넓은 땅"],
  ["전주를 건너야 닿는 완주군 땅", "12.6km 중 8.2km가 전주"],
  ["인천 중구는 영종도가 나머지 땅", "다리로 돌아 20km"],
  ["안산시 대부도 · 안산 땅의 34%", "시화방조제 타고 시흥 10.4km"],
  ["맨 처음 나온 평택 조각 바로 옆", "그런데 자기 시까지 25.9km"],
];

/** 한 자리에 머무는 시간(초) */
export const HOLD = [3.4, 3.4, 3.6, 3.6, 5.4, 4.6, 4.8, 5.0, 6.4];

/**
 * 아래 눈금 — 9곳을 도로 거리 순으로 세운 막대.
 *
 * 면적 때는 제곱근을 썼다. 0.59와 74.74가 한 줄에 있어서다. 도로는
 * 0.8에서 25.9까지라 그대로 비례시켜도 제일 짧은 것이 안 사라진다.
 * 누르지 않아도 되면 누르지 않는다.
 */
export const RANK = CASES.map((c) => c.pieces[0]);

/** 전국 구도 */
export const WIDE = { cx: 435, cy: 500, z: 1.72 };

/**
 * 길을 진행도만큼만 그린다.
 *
 * 길이 한 번에 나타나면 '돌아간다'가 안 보인다. 직선은 이미 그어져
 * 있고 그 위로 길이 뻗어 나가야 두 거리가 비교된다.
 */
export function partial(path: [number, number][], t: number): string {
  if (path.length < 2) return "";
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    seg.push(d);
    total += d;
  }
  const want = total * Math.max(0, Math.min(1, t));
  let acc = 0;
  const out = [`M${path[0][0]} ${path[0][1]}`];
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] <= want) {
      out.push(`L${path[i + 1][0]} ${path[i + 1][1]}`);
      acc += seg[i];
      continue;
    }
    const k = seg[i] === 0 ? 0 : (want - acc) / seg[i];
    out.push(
      `L${(path[i][0] + (path[i + 1][0] - path[i][0]) * k).toFixed(1)} ` +
        `${(path[i][1] + (path[i + 1][1] - path[i][1]) * k).toFixed(1)}`
    );
    break;
  }
  return out.join("");
}
