/**
 * 시간대별 승차 TOP 5 (scripts/prep-rush.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./rush.json";
import voice from "./voice-rush.json";

export interface Station {
  name: string;
  x: number;
  y: number;
  /**
   * 시간대별 승차 인원. **13-14시간대는 `null`이다** — 그 칸이
   * 오염돼 있다(`scripts/fetch-rush.py` 참고).
   */
  on: (number | null)[];
}

export interface Rank {
  name: string;
  n: number;
  x: number;
  y: number;
}

export interface Step {
  /** 시간대 번호 */
  hour: number;
  /**
   * 나레이션 줄 번호. 없으면 **스쳐 지나가는 칸**이다.
   *
   * 시간대를 건너뛰지 않는다 — 첫차부터 막차까지 열아홉 칸을 다
   * 지난다. 나레이션이 붙는 여섯 칸만 오래 머물고 나머지는 짧게
   * 지나가며 순위가 갈아엎힌다.
   */
  say: number | null;
  /** 그 시각 241역 평균. **이 편의 자다** — 순위표 밑에 같이 띄운다 */
  avg: number;
  top: Rank[];
}

export const HOURS = raw.hours as string[];
export const DAYS = raw.days as number;
export const STATIONS = raw.stations as Station[];
/** 노선망. `[x1, y1, x2, y2, 호선]`. **배경으로만 깐다** */
export const SEG = raw.seg as [number, number, number, number, string][];
/** 노선망이 닿는 시군구. 교통공사 구간은 하남까지 뻗는다 */
export const LAND = raw.land as string[];
export const SEOUL = raw.seoul as string[];

export const STEPS = raw.steps as Step[];
/** 하루 중 승차가 가장 몰리는 시간대 */
export const PEAK_HOUR = raw.peakHour as number;
export const PEAK_NAME = raw.peakName as string;
export const PEAK_N = raw.peakN as number;
export const PEAK_PER_SEC = raw.peakPerSec as number;
export const GANGNAM_N = raw.gangnamN as number;

/** 1위 자리를 나눠 갖는 역들. 이 편의 야마다 */
export const HOLDERS = raw.holders as string[];
export const HOLDER_PTS = raw.holderPts as { name: string; x: number; y: number }[];
/** 1위가 하루에 바뀌는 횟수 */
export const SWAPS = raw.swaps as number;

/** 「08-09시간대」에서 「8시」만 뽑는다. 첫 칸과 마지막 칸은 이름이 다르다 */
export const hourLabel = (i: number) => {
  const m = /^(\d+)-/.exec(HOURS[i]);
  if (m) return `${Number(m[1])}시`;
  return i === 0 ? "첫차" : "막차";
};

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
/** 나레이션이 안 붙는 칸에 머무는 시간. 순위가 갈아엎히는 게 보일 만큼만 */
const PASS = 0.7;

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = STEPS.map((s) =>
  s.say === null ? PASS : Math.max(VOICE[s.say].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[VOICE.length - 1].sec + 0.7;
