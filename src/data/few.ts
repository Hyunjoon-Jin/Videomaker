/**
 * 전국에서 인구가 가장 적은 지자체 (scripts/prep-few.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./few.json";
import voice from "./voice-few.json";

export interface Unit {
  rank?: number;
  sido: string;
  name: string;
  /** 주민등록 인구(명). 행정동을 더한 기록값이다 */
  pop: number;
  d: string[];
  /** 점 하나가 PER_DOT명. 경계 안에 넓이 비례로 뿌렸다 */
  dots: [number, number][];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const DAY = raw.day as string;
export const UNITS = raw.units as number;
export const PER_DOT = raw.perDot as number;
export const FEW = raw.few as unknown as Unit[];
/** 걸음 차례. 5위에서 1위로 좁혀 들어간다 */
export const STEPS = [...FEW].reverse();
/** 가장 많은 곳. 마무리에서 점이 쏟아진다 */
export const BIG = raw.big as unknown as Unit;
export const SIXTH = raw.sixth as { sido: string; name: string; pop: number };
/** 전국 행정동 3,619개의 한가운데 값. 마무리에서 쓰는 자다 */
export const DONG_MEDIAN = raw.dongMedian as number;
export const DONG_COUNT = raw.dongCount as number;

export interface Line {
  file: string;
  text: string;
  sec: number;
}
/**
 * 나레이션. 0번이 훅, 1~5번이 걸음, 6번이 마무리다.
 *
 * **걸음 길이를 목소리가 정한다.** 글자 수로 잡던 것을 말하는
 * 길이로 바꿨다. 화면을 먼저 짜고 목소리를 욱여넣으면 말이
 * 잘리거나 빈 화면이 남는다.
 */
export const VOICE = voice.lines as Line[];
/** 아직 진짜 음성이 없어 음절로 어림한 값인지 */
export const VOICE_ESTIMATED = voice.estimated as boolean;

/** 말끝에 두는 여유. 다음 걸음이 말을 밟지 않게 */
const PAD = 0.55;
/**
 * 걸음 최소 길이.
 *
 * 나레이션 길이만 따르면 양구군이 2.7초다. 점 200개를 찍고 이름을
 * 읽기에 모자라서 화면이 번쩍하고 지나간다. 말이 짧아도 그림이
 * 앉을 시간은 준다.
 */
const FLOOR = 3.4;

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = STEPS.map((_, i) =>
  Math.max(VOICE[i + 1].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[6].sec + 0.7;

/**
 * 마무리에서 견주는 「행정동 하나」의 점 개수.
 *
 * 전국 행정동 3,619개의 한가운데가 10,481명이다. 점 하나가 100명이니
 * 105개. 울릉군은 87개다 — **군 하나가 웬만한 동네 하나보다 적다.**
 *
 * 처음에는 수원시(11,853점)를 마무리에 뒀는데, 나레이션이 하는 말과
 * 화면이 어긋났다. 말은 「동네 하나보다 적다」인데 그림은 수원을
 * 보여 주니 눈과 귀가 딴 데를 봤다.
 */
export const MEDIAN_DOTS = Math.round(DONG_MEDIAN / PER_DOT);
