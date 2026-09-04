/**
 * 시각마다 부푸는 서울 지하철 (scripts/prep-rush.py 산출물).
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
   * 시간대별 승차·하차 인원. **13-14시간대는 `null`이다** —
   * 그 칸이 오염돼 있다(`scripts/fetch-rush.py` 참고).
   */
  on: (number | null)[];
  off: (number | null)[];
}

export interface Beat {
  /** 시간대 번호 */
  hour: number;
  /** 승차를 세는 걸음인가 */
  on: boolean;
  lead: string;
  leadN: number;
  second: string;
  secondN: number;
  starN: number;
  starRank: number;
}

export const HOURS = raw.hours as string[];
export const DAYS = raw.days as number;
export const STATIONS = raw.stations as Station[];
/** 노선망. `[x1, y1, x2, y2, 호선]`. **배경으로만 깐다** */
export const SEG = raw.seg as [number, number, number, number, string][];
/** 노선망이 닿는 시군구. 교통공사 구간은 하남까지 뻗는다 */
export const LAND = raw.land as string[];
export const SEOUL = raw.seoul as string[];

/** 이 편의 주인공 */
export const STAR = raw.star as string;
export const PEAK_HOUR = raw.peakHour as number;
export const PEAK_N = raw.peakN as number;
export const PEAK_PER_SEC = raw.peakPerSec as number;
/** 같은 시각 241역 평균. **이 편의 자다** */
export const AVG_N = raw.avgN as number;
export const AVG_PER_SEC = raw.avgPerSec as number;
export const GANGNAM_N = raw.gangnamN as number;
/** 하루 총량으로는 12위다. 붐빔이 총량이 아니라 시각에 있다는 증거 */
export const DAY_RANK = raw.dayRank as number;
export const BEATS = raw.beats as Beat[];

/** 「08-09시간대」에서 「8시」만 뽑는다 */
export const hourLabel = (i: number) => {
  const m = /^(\d+)-/.exec(HOURS[i]);
  return m ? `${Number(m[1])}시` : HOURS[i];
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

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = BEATS.map((_, i) =>
  Math.max(VOICE[i + 1].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[VOICE.length - 1].sec + 0.7;
