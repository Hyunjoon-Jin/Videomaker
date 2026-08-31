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
  /** 조각마다 path 하나. 전국 지도와 같은 0..1000 상자 좌표다 */
  d: string[];
  /** 그 자리의 한가운데. 카메라가 여기로 날아간다 */
  cx: number;
  cy: number;
}

export const DAY = raw.day as string;
/** 일반구를 시로 묶어 센 시·군·구 수 */
export const UNITS = raw.units as number;
/** 지도 1단위가 몇 km인가. 배율이 고정이라 이 값으로 격자를 깐다 */
export const KMU = raw.kmPerUnit as number;
export const SMALL = raw.small as unknown as Unit[];
/**
 * 걸음 차례. **5위에서 1위로 올라간다.**
 *
 * 순위 편은 작은 쪽으로 좁혀 들어가야 마지막에 힘이 실린다.
 */
export const STEPS = [...SMALL].reverse();
/** 가장 큰 곳. 마무리에서 빠져나와 이 안에 다섯을 넣는다 */
export const BIG = raw.big as unknown as Unit;
/** 여섯째. 화면에는 안 쓰고 다섯에서 끊은 까닭을 고정댓글에서 댄다 */
export const SIXTH = raw.sixth as { sido: string; name: string; area: number };

/**
 * 1km에 해당하는 화면 px. **다섯 걸음 내내 고정이다.**
 *
 * 배율이 걸음마다 달라지면 크기를 못 견준다. 가장 넓은 4위 서울
 * 중구가 가로 5.72km라 화면 폭 1080에 넉넉히 들어가려면 128까지
 * 쓸 수 있다.
 */
export const PXKM = 128;

export const HOLD = STEPS.map(() => 5.6);
