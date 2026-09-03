/**
 * 밀물이 서해를 올라오는 시각 (scripts/prep-tide.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./tide.json";
import voice from "./voice-tide.json";

export interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
  side: string;
  /**
   * 그날 조차(m).
   *
   * **관측소끼리 조위 높이를 견주면 안 된다.** 기준면이 저마다
   * 달라서 인천 9.56m와 진도 3.47m는 같은 자 위의 값이 아니다.
   * 견줄 수 있는 것은 이 조차와 시각뿐이다.
   */
  range: number;
  highs: string[];
  lows: string[];
  /**
   * 하루치 조위를 0~1로 눌러 담은 값. 1분 간격 1,441개.
   *
   * 그 관측소 **자기 범위 안의 비율**이라 서로 견줄 수 있다.
   * 극값 사이는 반주기 코사인으로 이었다.
   */
  level: number[];
}

export const DAY = raw.day as string;
/** 남에서 북으로. 위도 순서와 만조 순서가 어긋나지 않게 고른 11곳 */
export const ST = raw.stations as Station[];

/** 만조에서 다음 만조까지. 이 편의 자다 */
export const PERIOD_MIN = raw.periodMin as number;
export const HALF_MIN = raw.halfMin as number;
/** 첫 번째 멈춤 — 밀물이 진도에서 인천까지 올라오는 데 걸린 시간 */
export const RISE = raw.rise as { south: string; north: string; min: number };
/** 두 번째 멈춤 — 같은 시각, 정반대 */
export const FLIP = raw.flip as {
  southHigh: string;
  northLow: string;
  min: number;
  northHighM: number;
  northLowM: number;
};
/** 하루짜리 우연이 아니라는 근거. 연중 705번 잰 평균 */
export const LAG_MEAN_MIN = raw.lagMeanMin as number;
export const LAG_N = raw.lagN as number;

export const SOUTH = ST[0];
export const NORTH = ST[ST.length - 2];

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(
    Math.round(m) % 60
  ).padStart(2, "0")}`;
export const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
/** 「5시간 57분」. 숫자는 아라비아 숫자로 적는다 */
export const dur = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;

export interface Line {
  file: string;
  text: string;
  sec: number;
}
export const VOICE = voice.lines as Line[];
export const VOICE_ESTIMATED = voice.estimated as boolean;

/** 말끝에 두는 여유 */
const PAD = 0.55;

/**
 * 걸음. 시계를 어디까지 돌리고 무엇을 적는가.
 *
 * **걸음 4는 시계가 멈춘다.** 자를 대는 자리라 그림이 움직이면
 * 안 된다. 마침 06:30은 위쪽(인천)이 만조, 아래쪽(진도)이 저조라
 * 「정반대」가 화면에 이미 그려져 있다.
 */
export const STOPS = [
  toMin(RISE.south), // 00:33  진도 만조
  toMin("05:02"), // 보령까지 올라온 자리
  toMin(RISE.north), // 06:30  인천 만조
  toMin(RISE.north), // 멈춤 — 자를 댄다
  toMin(FLIP.northLow), // 12:53  인천 간조
];

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = STOPS.map((_, i) => VOICE[i + 1].sec + PAD);
export const OUTRO_SEC = VOICE[6].sec + 0.7;
