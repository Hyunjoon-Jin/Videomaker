/**
 * 사람의 한가운데 (scripts/prep-center.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./center.json";
import voice from "./voice-center.json";

export interface Dot {
  sido: string;
  name: string;
  x: number;
  y: number;
  pop: number;
}

export interface Point {
  x: number;
  y: number;
  lat: number;
  lon: number;
  /** 이 점이 든 시·군·구 */
  where: string;
}

export interface Pull {
  sido: string;
  pop: number;
  /** 이 시도를 빼면 중심이 이만큼 움직인다 */
  km: number;
  /**
   * 빼면 북으로 가나. **`true`면 그 시도가 남으로 당기고 있었다는
   * 뜻이다** — 수도권만 당기는 게 아니라는 증거다.
   */
  north: boolean;
  x: number;
  y: number;
  where: string;
}

export const AS_OF = raw.asOf as string;
export const TOTAL = raw.total as number;
export const PLACES = raw.places as number;
/** 시·군 162자리. 인구만큼 거품으로 깐다 */
export const DOTS = raw.dots as Dot[];

/** 땅만 놓고 잰 무게중심 */
export const LAND = raw.land as Point;
/** 인구를 실어 잰 무게중심. 이 편의 주인공 */
export const PPL = raw.ppl as Point;

/** 두 한가운데 사이. **이 편의 몸에 닿는 수치다** */
export const DIST_KM = raw.distKm as number;
export const NORTH_KM = raw.northKm as number;
export const WEST_KM = raw.westKm as number;
/** 국토 남북 길이. **자가 자료 안에 있다** */
export const SPAN_KM = raw.spanKm as number;
export const PCT_OF_SPAN = raw.pctOfSpan as number;

export const TO_SEOUL = raw.toSeoul as number;
export const TO_BUSAN = raw.toBusan as number;
export const CAP_POP = raw.capPop as number;
export const CAP_PCT = raw.capPct as number;

/** 시도를 빼면 중심이 얼마나 움직이나. 큰 순서 */
export const PULLS = raw.pulls as Pull[];
export const pullOf = (sido: string) => PULLS.find((p) => p.sido === sido)!;

/** 광역시를 한 점으로 본 근사가 몇 km인가. **화면에 적는다** */
export const APPROX_KM = raw.approxKm as number;

export interface Line {
  file: string;
  text: string;
  sec: number;
}
export const VOICE = voice.lines as Line[];
export const VOICE_ESTIMATED = voice.estimated as boolean;

/** 말끝에 두는 여유 */
const PAD = 0.55;
const FLOOR = 3.4;

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = [0, 1, 2, 3, 4, 5].map((i) =>
  Math.max(VOICE[i + 1].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[VOICE.length - 1].sec + 0.7;
