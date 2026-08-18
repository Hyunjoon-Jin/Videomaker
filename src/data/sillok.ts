/**
 * 조선왕조실록 — 네 질 중 하나가 살아남은 길, 1592~1606.
 *
 * 질문 하나: 실록은 어떻게 살아남았나.
 *
 * ── 왜 이 소재인가 ──────────────────────────────────
 * 간척 편과 영해 편을 접은 기준이 그대로다. 화면에 그릴 것이 기록으로
 * 확인되지 않으면 만들지 않는다. 이 편이 그리는 것은 셋뿐이다.
 *
 *   1. 반도 해안·도계 — 이미 쓰던 provinces.json
 *   2. 점 열넷 — 사고 터와 피난지의 위경도
 *   3. 날짜와 일수 — 전부 기록값
 *
 * 좌표는 전부 OSM에서 확인한 현재 지명 위치다. 사고 터의 정확한 지점과
 * 수백 미터 차이가 날 수 있고, 은봉암 터는 위치가 확인되지 않아 내장사
 * 자리로 찍었다. 화면 고지에 그렇게 적는다.
 *
 * ── 확인한 것 ───────────────────────────────────────
 * 1439 세종 21년, 성주·전주에 사고 신설
 * 1445 11월까지 4부를 갖춰 춘추관·충주·전주·성주 4사고 체제
 * 1592. 4.13 임진왜란. 춘추관·충주·성주 사고가 모두 병화로 소실
 * 1592. 6.22 전주사고 실록과 태조 어진을 정읍현 내장산 은봉암으로 옮김
 *            60여 궤 · 실록 830책, 기타 전적 538책
 * 1592. 6.22~1593. 7. 9 안의·손홍록이 하루도 비우지 않고 지킴
 *            『임계기사』의 수직상체일기 — 안의 174일, 손홍록 143일,
 *            둘이 함께 53일. 합 370일
 * 1593. 7    2차 진주성 함락 뒤 정읍현으로, 아산현을 거쳐 해주로
 * 1593. 7. 9 아산에서 충청감사 이산보에게 인계
 * 1596 말    해주에서 강화도로
 * 1597. 9    정유재란. 묘향산 보현사로. 전란이 끝날 때까지
 * 1603~1606  전주본을 원본 삼아 3부를 더 찍어 모두 5부
 * 1606       춘추관·마니산·태백산·묘향산·오대산 5사고에 봉안
 *            마니산에 전주사고 원본, 오대산에 교정본, 나머지에 신인본
 *
 * ── 그 뒤 ───────────────────────────────────────────
 * 춘추관본  1624 이괄의 난, 1636 병자호란으로 소실
 * 마니산본  1660 정족산사고로 옮김 → 정족산본. 현존, 서울대 규장각
 * 태백산본  현존, 국가기록원 부산
 * 묘향산본  1633 적상산사고로 옮김 → 적상산본. 6·25 때 북으로
 * 오대산본  1913 일본 반출 → 1923 관동대지진으로 대부분 소실.
 *           남은 27책이 1932년 경성제대로, 지금 규장각
 *
 * 다섯으로 나눈 것이 네 번에 걸쳐 다시 줄었고, 남한에 온전히 남은 것은
 * 둘이다. 그중 정족산본이 두 사람이 지고 올라간 바로 그 책이다.
 *
 * ── 계산한 것 ───────────────────────────────────────
 * 370일은 계산이 아니라 수직상체일기의 일수 합계다(174+143+53).
 * 음력 1592년 6월 22일에서 1593년 7월 9일까지를 달력으로 재면 371일이라
 * 하루가 뜬다(scripts/lunar.py로 계산, 그 사이 윤달 없음). 지킨 날과
 * 머문 날은 다른 셈이므로 기록값을 그대로 쓰고 고정댓글에 적어둔다.
 */
import { project } from "./places";

export interface Site {
  name: string;
  /** 지금 어디인지 — 옛 이름만 두면 어디인지 감이 안 온다 */
  where: string;
  lon: number;
  lat: number;
  x: number;
  y: number;
  side?: "left" | "right";
  dy?: number;
  /**
   * 이 배율 아래에서는 이름표를 그리지 않는다.
   *
   * 정읍현은 내장산에서 9.8km 떨어져 있다. 지도 단위로 9밖에 안 되니
   * 반도 전체를 잡는 배율에서는 전주·정읍·내장산 이름표 셋이 한 덩어리로
   * 겹쳐 뭉갠다. 점은 찍되 이름은 가까이 갔을 때만 띄운다.
   */
  minZ?: number;
}

function site(
  name: string, where: string, lon: number, lat: number,
  side: "left" | "right" = "right", dy = 0, minZ?: number
): Site {
  return { name, where, lon, lat, ...project(lon, lat), side, dy, minZ };
}

/**
 * 임진왜란 전의 네 사고.
 * lost가 참인 셋은 1592년에 모두 병화로 탔다.
 */
export const OLD_SAGO: Array<Site & { lost: boolean }> = [
  { ...site("춘추관", "한양 경복궁", 126.9770, 37.5796, "left"), lost: true },
  { ...site("충주사고", "충주 관아", 127.9361, 36.9709, "right"), lost: true },
  { ...site("성주사고", "성주 관아", 128.2928, 35.9215, "right"), lost: true },
  { ...site("전주사고", "전주 경기전", 127.1498, 35.8157, "left"), lost: false },
];

/**
 * 전주사고본이 다닌 길.
 * 첫 점이 출발지이므로 구간은 여섯이다.
 */
export const FLIGHT: Array<Site & { when: string }> = [
  { ...site("전주사고", "전주 경기전", 127.1498, 35.8157, "left"), when: "1592년 6월" },
  { ...site("내장산", "정읍 은봉암", 126.9020, 35.4897, "left"), when: "1592년 6월 22일" },
  { ...site("정읍현", "정읍", 126.8560, 35.5699, "left", -30, 2.3), when: "1593년 7월" },
  { ...site("아산현", "아산 영인", 126.9578, 36.8808, "left"), when: "1593년 7월 9일" },
  { ...site("해주", "황해 해주", 125.7084, 38.0421, "left"), when: "1593년" },
  { ...site("강화", "강화도", 126.4846, 37.6320, "left", 26), when: "1596년 말" },
  { ...site("묘향산", "보현사", 126.2350, 40.0085, "left"), when: "1597년 9월" },
];

/** 1606년에 다섯 질을 나눠 둔 곳 */
export const NEW_SAGO: Site[] = [
  site("춘추관", "한양", 126.9770, 37.5796, "right"),
  site("마니산", "강화", 126.4846, 37.6320, "left", 26),
  site("태백산", "봉화 각화사", 128.9093, 36.9917, "right"),
  site("묘향산", "보현사", 126.2350, 40.0085, "left"),
  site("오대산", "평창 영감사", 128.5722, 37.7565, "right"),
];

/** 지나온 만큼의 경로 — p는 0..1 */
export function flightPathTo(p: number): string {
  const n = FLIGHT.length - 1;
  const t = Math.max(0, Math.min(1, p)) * n;
  const i = Math.min(n - 1, Math.floor(t));
  const f = t - i;
  const pts = FLIGHT.slice(0, i + 1).map((s) => `${s.x} ${s.y}`);
  const a = FLIGHT[i];
  const b = FLIGHT[i + 1];
  pts.push(`${(a.x + (b.x - a.x) * f).toFixed(1)} ${(a.y + (b.y - a.y) * f).toFixed(1)}`);
  return "M" + pts.join("L");
}

export function flightPointAt(p: number): { x: number; y: number } {
  const n = FLIGHT.length - 1;
  const t = Math.max(0, Math.min(1, p)) * n;
  const i = Math.min(n - 1, Math.floor(t));
  const f = t - i;
  const a = FLIGHT[i];
  const b = FLIGHT[i + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/**
 * 피난 경로의 길이 — 지점 사이 직선거리의 합(구면).
 *
 * 실제로 다닌 길은 이보다 길다. 배와 고갯길로 갔으므로 직선일 리가 없다.
 * 화면에는 이 값을 쓰되 '직선거리 합'이라고 밝힌다. 실제 노정을 모르면서
 * 실제 거리인 척하는 숫자가 제일 나쁘다.
 */
export const FLIGHT_KM = 715;

/** 수직상체일기의 일수 — 이 셋을 더하면 370이다 */
export const WATCH = [
  { who: "안의", days: 174 },
  { who: "손홍록", days: 143 },
  { who: "둘이 함께", days: 53 },
] as const;
export const WATCH_DAYS = WATCH.reduce((a, b) => a + b.days, 0);

export interface SEvent {
  /** 소수점 연도 — 화면의 연도 표시가 이 값을 센다 */
  year: number;
  kicker: string;
  title: string;
  detail: string;
  impact?: number;
  /** 화면이 이 국면에서 무엇을 그리는가 */
  phase: "sago" | "burn" | "flight" | "spread";
  /** flight 국면에서 경로의 어디까지 왔는가(FLIGHT 인덱스) */
  at?: number;
  /** 370일 계수기를 세우는 비트 */
  watch?: boolean;
  zoom?: number;
}

export const S_EVENTS: SEvent[] = [
  {
    year: 1445.85,
    kicker: "1445년 · 세종 27년",
    title: "실록을 네 곳에 나눴다",
    detail: "춘추관·충주·성주·전주 · 한 곳이 타도 남게",
    phase: "sago", impact: 0.7, zoom: 1.5,
  },
  {
    year: 1592.28,
    kicker: "1592년 4월 13일",
    title: "임진왜란",
    detail: "부산 상륙 · 스무날 만에 한양이 넘어갔다",
    phase: "sago", impact: 1, zoom: 1.6,
  },
  {
    year: 1592.42,
    kicker: "1592년",
    title: "셋이 탔다",
    detail: "춘추관·충주·성주 · 남은 것은 전주 하나",
    phase: "burn", impact: 1, zoom: 1.7,
  },
  {
    year: 1592.47,
    kicker: "1592년 6월 22일 · 정읍",
    title: "실록을 산으로 옮겼다",
    detail: "60여 궤 · 실록 830책과 태조 어진",
    phase: "flight", at: 1, impact: 1, zoom: 2.9,
  },
  {
    year: 1593.0,
    kicker: "내장산 은봉암",
    title: "하루도 자리를 비우지 않았다",
    detail: "『임계기사』 수직상체일기에 지킨 날짜가 남아 있다",
    phase: "flight", at: 1, watch: true, impact: 1, zoom: 3.2,
  },
  {
    year: 1593.52,
    kicker: "1593년 7월 9일 · 아산",
    title: "다시 관의 손으로",
    detail: "충청감사 이산보에게 · 2차 진주성 함락 뒤",
    phase: "flight", at: 3, impact: 0.9, zoom: 2.4,
  },
  {
    year: 1596.9,
    kicker: "1593~1596년",
    title: "해주에서 강화로",
    detail: "3년 사이 두 번 더 옮겼다",
    phase: "flight", at: 5, impact: 0.7, zoom: 2.2,
  },
  {
    year: 1597.7,
    kicker: "1597년 9월 · 정유재란",
    title: "묘향산 보현사",
    detail: "여섯 번 옮겨 715km · 전란이 끝날 때까지 여기 있었다",
    phase: "flight", at: 6, impact: 1, zoom: 1.9,
  },
  {
    year: 1606.0,
    kicker: "1603~1606년",
    title: "다섯 질이 되었다",
    detail: "살아남은 전주본을 원본 삼아 세 질을 더 찍었다",
    phase: "spread", impact: 1, zoom: 1.6,
  },
  {
    year: 1606.6,
    kicker: "1606년",
    title: "다시 다섯 곳에",
    detail: "춘추관·마니산·태백산·묘향산·오대산",
    phase: "spread", impact: 1, zoom: 1.45,
  },
];

/** 마무리 — 다섯 질이 지금 어디 있나 */
export const FATES: Array<{ name: string; where: string; alive: boolean }> = [
  { name: "정족산본", where: "서울대 규장각", alive: true },
  { name: "태백산본", where: "국가기록원 부산", alive: true },
  { name: "나머지 셋", where: "불탔거나 북에 있다", alive: false },
];

export function yearLabel(y: number): string {
  return `${Math.floor(y)}년`;
}
