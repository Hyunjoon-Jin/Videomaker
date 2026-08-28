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
  /** 두 끝 이름 */
  ends: [string, string];
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
 * 계기판이 이름·지름·넓이·조각 수를 세우고 지도가 어디인지를
 * 말한다. 자막은 **두 끝이 어디인지**만 적는다 — 경계 자료에
 * 없는 것이라 이것만은 글자로 있어야 한다.
 */
export const LINES: string[] = CASES.map((c) =>
  c.name === RULER.name ? "남한에서 제일 넓은 군" : `${c.ends[0]} ↔ ${c.ends[1]}`
);

/** 한 자리에 머무는 시간(초) */
export const HOLD = [6.6, 6.2, 5.8, 6.2, 7.6];

/**
 * 전국 구도. 고정이다.
 *
 * 카메라가 움직이면 선 길이를 눈으로 못 견준다. 이 편은 선의
 * 길이가 전부라 한 구도로 간다. 독도(동경 131.9)와 백령도(124.6)가
 * 다 들어와야 해서 투영 상자를 통째로 담는다.
 */
export const WIDE = { cx: 500, cy: 520, z: 0.93 };
