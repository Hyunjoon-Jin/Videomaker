/**
 * 虎入 — 조선의 도성과 궁궐에 들어온 호랑이.
 *
 * 야마: 조선 왕이 사는 궁궐 안에 호랑이가 들어왔다. 1751년 6월 9일
 * 경복궁. 실록 원문이 네 글자다 — 虎入舊闕.
 *
 * 화면에 큰 글씨로 쓰는 것은 번역문이 아니라 **원문 구절**이다.
 * 네 글자가 문장 하나보다 짧고, 실록을 보고 있다는 것이 한 번에
 * 전해진다.
 *
 * 자리를 아는 기록만 점을 찍는다. '성 안'·'도성 안'은 어디인지
 * 안 적혀 있어서 점 대신 성곽 전체가 켜진다 — 아는 것과 모르는
 * 것을 화면에서 가른다.
 *
 * 숫자와 글자는 전부 scripts/prep-tiger.py가 낸 것이다.
 */
import raw from "./tiger.json";

/** 화면이 세우는 날 */
export interface Beat {
  id: string;
  /** 서기 */
  ce: number;
  king: string;
  yr: number;
  mo: string;
  dy: number;
  /** 화면에 쓸 곳 이름 */
  label: string;
  /** 화면에 없는 것 한 줄 */
  line: string;
  /** 국역 전문 */
  ko: string;
  /** 원문 전문 */
  han: string;
  /** 원문에서 뽑은 '虎入…' 구절. 화면 큰 글씨다. */
  key: string;
  /** 투영 좌표. null이면 자리를 모르는 기록이다. */
  x: number | null;
  y: number | null;
}

export const BEATS: Beat[] = raw.beats as Beat[];
/** 한양도성 성곽 path. OSM에서 받은 75조각이다. */
export const WALLS: string[] = raw.walls;
/** 궁궐·산·문 자리 */
export const MARKS: Record<string, number[]> = raw.marks;
/** 마무리 판에 글자로만 적는 날들 */
export const TAIL: Array<{ ce: string; when: string; han: string; where: string }> =
  raw.tail;
/** 검색어별 기사 수 */
export const COUNTS: Record<string, number> = raw.counts;

/** 1751년 6월 9일 경복궁 */
export const HERO: Beat = BEATS.find((b) => b.ce === 1751)!;

/**
 * 지도가 들어갈 자리.
 *
 * 성곽이 투영에서 x 123~660, y 360~915다. 여백을 조금 얹어 정사각에
 * 가깝게 잡는다 — 도성은 남북으로 조금 길다.
 */
export const VIEW = "105 345 573 585";

/**
 * 화면에 이름을 적을 곳.
 *
 * 열일곱 곳을 다 적으면 도성이 글자로 덮인다. 편에 나오는 궁궐 셋과
 * 방향을 잡아주는 산 넷, 문 둘만 남긴다.
 */
export const NAMED: Array<{ k: string; dx?: number; dy?: number; anchor?: string }> = [
  { k: "경복궁", dx: -18, dy: -4, anchor: "end" },
  { k: "창덕궁", dx: -16, dy: -16, anchor: "end" },
  { k: "경덕궁", dx: -12, dy: 28, anchor: "end" },
  { k: "인왕산", dx: 12, dy: -6 },
  { k: "북악산", dx: 0, dy: -22, anchor: "middle" },
  { k: "남산", dx: 0, dy: -14, anchor: "middle" },
  { k: "낙산", dx: 16, dy: 6 },
  { k: "숭례문", dx: -14, dy: 8, anchor: "end" },
  { k: "흥인지문", dx: 14, dy: 8 },
];

/** `윤12` → `윤12월` 같은 표기를 그대로 살린다 */
export function when(b: Beat): string {
  return `${b.king} ${b.yr}년 ${b.mo}월 ${b.dy}일`;
}
