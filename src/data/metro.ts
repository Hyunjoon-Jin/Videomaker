/**
 * 수도권 전철 노선망과 네 끝 (scripts/prep-metro.py 산출물).
 *
 * 좌표는 전국 지도(`korea-paths.json`)와 같은 0..1000 상자다.
 */
import raw from "./metro.json";
import voice from "./voice-metro.json";

export interface Place {
  name: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
  sido: string;
  sigungu: string;
}

export const STATIONS = raw.stations as number;
export const SEGMENTS = raw.segments as number;
export const LINES = raw.lines as number;
/** 그리기용 선분 [x1,y1,x2,y2] */
export const SEG = raw.seg as [number, number, number, number][];

/**
 * 2호선 순환선. **이 편의 자다.**
 *
 * 수도권에 사는 사람은 한 바퀴가 얼마인지 몸으로 안다. 바깥에서
 * 빌린 자가 아니라 같은 노선망 안에 있는 자라서 설명이 한 줄도
 * 안 붙는다.
 */
export const LOOP = raw.loop as [number, number][];
export const LOOP_STATIONS = raw.loopStations as number;
export const LOOP_KM = raw.loopKm as number;

export const SOUTH = raw.south as Place;
export const NORTH = raw.north as Place;
export const EAST = raw.east as Place;
export const WEST = raw.west as Place;
/**
 * 실제로 가장 동쪽에 있는 역.
 *
 * 경춘선 종점은 춘천인데 **남춘천이 0.007도 더 동쪽**이다.
 * 화면에는 종점 이름을 쓰고 이 값은 고정댓글에서 밝힌다.
 */
export const EAST_MOST = raw.eastMost as string;

/** 신창 ↔ 연천 직선. 선로 길이가 아니라 계산값이다 */
export const SPAN_KM = raw.spanKm as number;
export const LAPS = raw.laps as number;
/** 1호선 완행으로 신창에서 연천까지 */
export const PATH_STATIONS = raw.pathStations as number;

/** 서울·경기·인천 밖에 있는 역 */
export const OUTSIDE = raw.outside as {
  sido: string;
  sigungu: string;
  name: string;
}[];
export const BY_SIDO = raw.bySido as Record<string, number>;

export interface Line {
  file: string;
  text: string;
  sec: number;
}
export const VOICE = voice.lines as Line[];
export const VOICE_ESTIMATED = voice.estimated as boolean;

/** 말끝에 두는 여유 */
const PAD = 0.55;
/** 걸음 최소 길이. 카메라가 날아가 앉을 시간은 준다 */
const FLOOR = 3.6;

export const HOOK_SEC = VOICE[0].sec + 0.4;
export const HOLD = [0, 1, 2, 3, 4].map((i) =>
  Math.max(VOICE[i + 1].sec + PAD, FLOOR)
);
export const OUTRO_SEC = VOICE[6].sec + 0.7;
