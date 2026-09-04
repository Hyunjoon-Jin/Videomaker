/**
 * 서울 지하철 음영지역 (scripts/prep-metro.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./metro.json";
import voice from "./voice-metro.json";

export interface Shadow {
  name: string;
  gu: string;
  /**
   * 동 안 격자의 **중앙값** 거리.
   *
   * 「동 안에서 가장 먼 자리」로 세우면 산이 큰 동이 다 이긴다 —
   * 그건 음영지역 순위가 아니라 산 순위다. 중앙값이면 「동 절반이
   * 이만큼 넘게 걸어야 한다」가 되어 사는 이야기가 된다.
   */
  km: number;
  pop: number | null;
  /** 동 경계 SVG path */
  d: string;
  /** 거리가 딱 중앙값인 자리 */
  x: number;
  y: number;
  /** 거기서 가장 가까운 역 */
  near: string;
  nx: number;
  ny: number;
}

/** 노선망. `[x1, y1, x2, y2, 호선]`. **배경으로만 깐다** */
export const SEG = raw.seg as [number, number, number, number, string][];
/** 역세권 원을 그릴 자리 */
export const STATIONS = raw.stations as [number, number][];
/** 지도 1단위가 몇 km인가. 역세권 원 반지름을 여기서 만든다 */
export const KM_PER_UNIT = raw.kmPerUnit as number;
export const NEAR_KM = raw.nearKm as number;
/** 서울 25개 구 경계. 역세권 원을 여기에 가둔다 */
export const SEOUL = raw.seoul as string[];

export const DONGS = raw.dongs as number;
export const GRID = raw.grid as number;
export const STEP_M = raw.stepM as number;
/** 서울 땅 가운데 역에서 1km 밖인 비율 */
export const FAR_PCT = raw.farPct as number;
/** 서울 424개 동 중앙값의 중앙값. 이 편의 자다 */
export const MEDIAN_KM = raw.medianKm as number;

/** 5위에서 1위로 올라간다 */
export const TOP = raw.top as Shadow[];
export const ONE = TOP[TOP.length - 1];
export const TOP_POP = raw.topPop as number;

/** 화면에 쓰는 km. 소수 두 자리까지 그대로 쓴다 */
export const km2 = (v: number) => v.toFixed(2);

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
