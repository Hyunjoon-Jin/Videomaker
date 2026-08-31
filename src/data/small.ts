/**
 * 전국에서 가장 작은 시·군·구 (scripts/prep-small.py 산출물).
 *
 * 도형 좌표는 **km**다. 원점은 그 도형의 한가운데, y는 아래로.
 * 화면에 앉히는 일은 그리는 쪽에서 한다 — 다섯 걸음이 같은 축척을
 * 써야 크기 차가 보이기 때문이다.
 */
import raw from "./small.json";

export interface Unit {
  rank?: number;
  sido: string;
  name: string;
  /** 지적통계 면적(km²). 경계로 잰 값이 아니라 받아 쓴 기록값이다 */
  area: number;
  /** 조각마다 path 하나. 한 path로 이으면 감기 방향이 서로 지운다 */
  d: string[];
  w: number;
  h: number;
  /** 전국 지도(0..1000 상자)에서 이 곳의 자리. 훅에서 점을 찍는다 */
  at?: [number, number];
}

export const DAY = raw.day as string;
/** 일반구를 시로 묶어 센 시·군·구 수 */
export const UNITS = raw.units as number;
export const SMALL = raw.small as unknown as Unit[];
/**
 * 걸음 차례. **5위에서 1위로 올라간다.**
 *
 * 순위 편은 작은 쪽으로 좁혀 들어가야 마지막에 힘이 실린다.
 * 도형도 걸음마다 줄어들어 크기 차가 눈에 남는다.
 */
export const STEPS = [...SMALL].reverse();
/** 가장 큰 곳. 마무리에서 축척을 줄여 이 안에 다섯을 넣는다 */
export const BIG = raw.big as unknown as Unit;
/** 여섯째. 화면에는 안 쓰고 다섯에서 끊은 까닭을 고정댓글에서 댄다 */
export const SIXTH = raw.sixth as { sido: string; name: string; area: number };

/**
 * 1km에 해당하는 화면 px. **다섯 걸음 내내 고정이다.**
 *
 * 가장 넓은 4위 서울 중구가 5.72km라 800px에 들어가려면 140까지
 * 쓸 수 있는데, 5위 부산 동구가 세로 4.27km라 그러면 세로가 넘친다.
 * 128이면 가로 732px·세로 546px로 둘 다 들어간다.
 */
export const PXKM = 128;

/**
 * 한 자리에 머무는 시간(초).
 *
 * 도형이 커졌다 줄었다 하는 걸 보는 시간이다. 읽을 글자는 이름과
 * 넓이뿐이라 길 필요가 없다.
 */
export const HOLD = STEPS.map(() => 5.6);
