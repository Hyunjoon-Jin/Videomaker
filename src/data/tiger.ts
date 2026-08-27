/**
 * 虎入 — 조선의 도성과 궁궐에 들어온 호랑이.
 *
 * 야마: 조선 왕이 사는 궁궐 안에 호랑이가 들어왔다. 1751년 6월 9일
 * 경복궁. 실록 원문이 네 글자다 — 虎入舊闕.
 *
 * 화면 큰 글씨는 **번역**이다. 한자 원문을 크게 띄웠더니 무슨 말인지
 * 하나도 안 읽혔다. 원문은 그 아래 작게 한 줄로만 남긴다.
 *
 * 그리고 어디에 나타나 무엇을 했는지가 적힌 기사를 앞에 세운다.
 * 짧고 센 '虎入城內' 네 글자짜리는 그날 무슨 일이 있었는지가 없다.
 *
 * **줄바꿈은 prep-tiger.py에서 직접 나눠 둔 것이다.** 브라우저에
 * 맡기면 '포도장에게 / 수색해'처럼 뜻이 갈리는 자리에서 끊긴다.
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
  /** 화면 큰 글씨. 번역이고, 줄바꿈을 직접 나눠 둔 것이다. */
  say: string[];
  /** 그 아래 작게 붙는 원문 */
  han: string;
  /** 국역 전문 */
  ko: string;
  /** 원문 전문 */
  full: string;
  /** 원문에서 뽑은 '虎入…' 구절. 마무리 표에서 쓴다. */
  key: string;
  /** 투영 좌표. null이면 자리를 모르는 기록이다. */
  x: number | null;
  y: number | null;
  /** 클로즈업에서 칠할 궁궐 담장 이름. null이면 도성 전체다. */
  poly: string | null;
  /** 이 걸음의 카메라 */
  cam: { cx: number; cy: number; w: number };
}

export const BEATS: Beat[] = raw.beats as Beat[];
/** 한양도성 성곽 path. OSM에서 받은 75조각이다. */
export const WALLS: string[] = raw.walls;
/** 궁궐 담장 폴리곤. OSM 관계·way가 정의한 경계다. */
export const POLYS: Record<string, string> = raw.polys;
/** 도성이 다 들어오는 카메라 */
export const WIDE: { cx: number; cy: number; w: number } = raw.wide;
/** 궁궐·산·문 자리 */
export const MARKS: Record<string, number[]> = raw.marks;
/** 마무리 판에 글자로만 적는 날들 */
export const TAIL: Array<{ ce: string; when: string; where: string; say: string }> =
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
/** 카메라 폭에서 높이 — 지도 자리의 종횡비 */
export const ASPECT = 585 / 573;

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
  { k: "인왕산", dx: 14, dy: 24 },
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
