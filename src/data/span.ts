/**
 * 같은 시·군의 이 끝에서 저 끝까지 (scripts/prep-span.py 산출물).
 *
 * 좌표는 korea-paths.json과 같은 0..1000 투영이라 전국 지도 위에
 * 그대로 얹힌다.
 */
import raw from "./span.json";

export interface Case {
  /** 시도를 붙인 이름 */
  name: string;
  /** 가장 먼 두 점 사이 km */
  span: number;
  /** 그 시·군 넓이 km² (계산값) */
  area: number;
  /** 떨어져 있는 덩어리 수 */
  parts: number;
  /** 그 시·군 전체 SVG path */
  d: string;
  /** 두 끝 */
  line: [number, number][];
  /** 두 끝 이름. 그림이 이미 말하는 자리는 빈 문자열 */
  ends: [string, string];
  /** 그 시·군에 붙는 카메라 */
  cam: { cx: number; cy: number; z: number };
}

export interface Row {
  name: string;
  span: number;
  area: number;
  parts: number;
}

/** 지름이 짧은 것에서 긴 것으로 */
export const CASES = raw.cases as unknown as Case[];
export const TABLE = raw.table as unknown as Row[];

/**
 * 자.
 *
 * 남한에서 제일 넓은 시·군이 첫 걸음이다. 그 지름을 화면에
 * 세로 눈금으로 남겨두면 뒤에 오는 것들이 얼마나 긴지가
 * 숫자 없이 보인다.
 */
export const RULER = CASES[0];

/** 막대에 쓰는 최대값 — 절정보다 조금 넉넉하게 */
export const MAXS = Math.ceil(Math.max(...CASES.map((c) => c.span)) / 10) * 10;

/**
 * 자막.
 *
 * 두 끝 이름은 이제 지도 위 이름표로 간다 — 카메라가 그 시·군에
 * 붙어 있으니 점 옆에 붙이는 편이 짧고 정확하다. 자막이 남는 자리는
 * 첫 걸음 하나뿐이다. 홍천군이 왜 자인지는 그림으로 안 나오니까.
 */
export const LINES: string[] = CASES.map((c) =>
  c.name === RULER.name ? "남한에서 제일 넓은 군" : ""
);

/** 한 자리에 머무는 시간(초) */
export const HOLD = [6.6, 6.2, 5.8, 6.2, 7.6];

/**
 * 전국 구도. 훅과 마무리에서만 쓴다.
 *
 * 독도(동경 131.9)와 백령도(124.6)가 다 들어와야 해서 투영 상자를
 * 통째로 담는다.
 *
 * 본문에서는 카메라가 시·군마다 붙는다. 선 길이를 눈으로 못 견주는
 * 것이 걸리지만, 그 일은 화면 가운데 가로 막대가 이미 맡고 있다.
 * 붙지 않으면 옹진군 76조각이 점 몇 개로만 보인다.
 */
export const WIDE = { cx: 500, cy: 520, z: 0.93 };

/**
 * 마무리 구도.
 *
 * 아래 절반은 표가 덮으니 반도를 위로 올려 앉힌다. 다섯 선이 한
 * 화면에 놓이는 것이 이 편의 마지막 그림이다.
 */
export const WIDE_OUT = { cx: 500, cy: 883, z: 0.944 };

/** 카메라가 다음 시·군으로 옮겨 앉는 데 걸리는 시간(초) */
export const FLY_SEC = 1.0;
