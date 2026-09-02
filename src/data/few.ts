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
  /**
   * 사람이 안 살아 점이 안 찍히는 딴 섬.
   *
   * 카메라를 점에 맞추니 화면 밖으로 잘린다. **울릉군은 독도까지가
   * 울릉군이라** 한켠에 따로 그린다. 좌표는 그 섬 한가운데가 원점이다.
   */
  away?: { label: string; km: number; w: number; d: string[] };
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
/**
 * 전국에서 사람이 가장 많은 동.
 *
 * **한가운데(중앙값)로 견주다가 접었다.** 「동 하나가 보통 만 7천
 * 명」은 통계지 그림이 아니다. 보는 사람 머릿속에 아무것도 안
 * 그려진다.
 *
 * 이름이 있는 진짜 동네라야 「저기 하나에 울릉군이 열두 개」가 선다.
 */
export const TOP_DONG = raw.topDong as {
  sido: string;
  sigungu: string;
  name: string;
  pop: number;
};

/** 울릉군 한 개에 견줘 몇 배인가 */
export const TIMES = Math.round(TOP_DONG.pop / FEW[0].pop);

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
 * 마무리에서 견주는 「가장 큰 동」의 점 개수. 1,056개다.
 *
 * **세 번 고쳤다.**
 *
 * 1. 수원시(11,853점) — 나레이션은 동네를 말하는데 그림은 시를
 *    보여 줬다. 눈과 귀가 딴 데를 봤다.
 * 2. 읍·면·동을 다 섞은 한가운데(10,481명)를 「행정동 하나」라고
 *    불렀다. 이름이 틀렸고(3,619개는 읍·면·동 전체다) 면이 섞여
 *    값도 낮았다.
 * 3. 동만 세서 한가운데 17,389명. 이름은 맞았지만 **여전히
 *    통계였다.** 「보통 동 하나」가 머릿속에 안 그려진다.
 *
 * 이름이 있는 진짜 동네로 바꿨다.
 */
export const TOP_DOTS = Math.round(TOP_DONG.pop / PER_DOT);
