/**
 * 서울에서 지하철로 가장 많이 돌아가는 두 역 (scripts/prep-metro.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./metro.json";
import voice from "./voice-metro.json";

export interface Stop {
  name: string;
  x: number;
  y: number;
}

export interface Pair {
  a: string;
  b: string;
  lineA: string[];
  lineB: string[];
  /** 두 역 사이 직선 */
  straightKm: number;
  /** 노선을 따라 정거장 사이 직선을 더한 값. 선로 길이가 아니다 */
  railKm: number;
  hops: number;
  ratio: number;
  path: Stop[];
}

/** 노선망. 지도 바탕이다 */
export const SEG = raw.seg as [number, number, number, number][];
export const SEOUL_STATIONS = raw.seoulStations as number;
/**
 * 직선 하한.
 *
 * 이보다 가까우면 걸어가는 거리라 「돌아간다」는 말이 안 선다.
 */
export const FLOOR_KM = raw.floorKm as number;
/** 다 재 본 쌍의 수. 닫힌 집합이라는 근거다 */
export const PAIRS = raw.pairs as number;
/**
 * 1~3등.
 *
 * **한 역은 한 번만 쓴다.** 안 그러면 낙성대·남성·사당이 서로
 * 얽혀 같은 자리 이야기가 세 번 나온다.
 */
export const TOP = raw.top as Pair[];
export const ONE = TOP[0];

export interface Line {
  file: string;
  text: string;
  sec: number;
}
export const VOICE = voice.lines as Line[];
export const VOICE_ESTIMATED = voice.estimated as boolean;

/** 말끝에 두는 여유 */
const PAD = 0.55;
const FLOOR = 3.6;

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = [0, 1, 2, 3, 4].map((i) =>
  Math.max(VOICE[i + 1].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[6].sec + 0.7;
