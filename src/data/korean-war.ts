/**
 * 6·25 전쟁 (1950.6.25 ~ 1953.7.27) — 전선 변천.
 *
 * 이 소재를 고른 이유는 전선이 네 번 뒤집히기 때문이다.
 *   남침 → 낙동강 → 압록강 → 1·4후퇴 → 38선 교착
 * 곡선이 위아래로 움직이는 포맷에 이만한 소재가 없다.
 *
 * ── 임진왜란과 다른 점 ────────────────────────────────
 * 북에서 내려오므로 "곡선 위"가 북한군·중국군 점령이다.
 * makeFront에 dir="north"를 넘겨 채우는 방향을 뒤집는다.
 *
 * 날짜는 전부 양력이라 음/양 환산 문제가 없다.
 * t = 1950년 6월 25일로부터의 경과일. 정전까지 1128일.
 *
 * ── 전선 키프레임의 근거 ──────────────────────────────
 * 초안은 눈대중으로 찍은 숫자였다. 지도에서 가장 큰 면적을 차지하는
 * 요소인데 출처가 없었다. 문헌으로 남은 전선의 실제 지점을 위경도에서
 * 환산해 다시 잡았다. 환산식: cy = 1000 - (위도-33.20)×101.94
 *
 *   38선          127.0E/38.0N   → (455, 511)
 *   낙동강 방어선   마산 (581, 797) · 왜관 (567, 716) · 영덕 (645, 672)
 *   최대 북진      청천강 (358, 317) · 초산 (358, 222)
 *                 장진 (471, 261) · 혜산 (549, 164)
 *   1951.1 최남단  평택 (462, 613) · 원주 (531, 577) · 삼척 (629, 567)
 *   휴전선        임진강하구 (429, 521) · 철원 (480, 485) · 고성 (573, 455)
 *
 * 제어점 사이는 여전히 보간이므로 전선의 세부 굴곡은 실제와 다르다.
 */
import { project } from "./places";

export const TOTAL_DAYS = 1128; // 1950.6.25 → 1953.7.27

/** 경과일 → 날짜 문자열 */
export function dateLabel(day: number): string {
  const base = new Date(Date.UTC(1950, 5, 25));
  const d = new Date(base.getTime() + Math.floor(day) * 86400000);
  return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`;
}

/** 전선 제어점 x — provinces.json과 같은 투영 */
export const FRONT_XS = [140, 280, 400, 510, 620, 730, 860];

/**
 * [경과일, 각 x의 전선 y] — 곡선 '위'가 북한군·중국군 점령.
 * 낙동강 방어선은 동남쪽 한 귀퉁이만 남은 형태라 서쪽 제어점이
 * 화면 아래(=완전 점령)로 내려간다. 그 급격한 굴곡이 그 시기의 그림이다.
 */
export const FRONT_KEYS: Array<[number, number[]]> = [
  // 개전 — 38선 (127.0E/38.0N → y 511)
  [0,   [511, 511, 511, 511, 511, 511, 511]],
  [3,   [530, 552, 562, 552, 540, 528, 518]],       // 6.28 서울 함락
  [25,  [664, 684, 698, 676, 652, 618, 588]],       // 7.20 대전 함락
  // 8.4 낙동강 방어선 — 마산(580,797) · 왜관(567,716) · 영덕(645,672).
  // 서쪽 제어점이 화면 밖으로 내려가야 '가로선'이 아니라 '방어선'이 된다.
  [40,  [1015, 1015, 1015, 1010, 700, 672, 700]],
  [82,  [1015, 1015, 1015, 1008, 698, 670, 698]],   // 9.15 인천상륙 직전
  [95,  [520, 521, 521, 500, 495, 490, 500]],       // 9.28 서울 수복 — 38선 부근
  [116, [372, 380, 400, 420, 430, 410, 430]],       // 10.19 평양
  // 11.24 최대 북진 — 청천강(358,317)·초산(358,222)·장진(471,261)·혜산(549,164)
  [152, [300, 260, 240, 250, 180, 165, 250]],
  [175, [360, 330, 315, 320, 270, 250, 320]],       // 12월 중공군 공세로 후퇴
  [193, [590, 610, 622, 600, 580, 560, 546]],       // 1951.1.4 서울 재함락
  // 1.25 최남단 — 평택(462,613)·원주(531,577)·삼척(629,567)
  [214, [630, 620, 613, 590, 570, 567, 572]],
  [262, [545, 535, 525, 505, 495, 490, 496]],       // 3.14 서울 재수복
  // 1951.11 이후 사실상 현 휴전선 — 임진강하구(429,521)·철원(480,485)·고성(573,455)
  [500, [534, 527, 521, 490, 458, 455, 460]],
  [1128,[534, 527, 521, 490, 458, 455, 460]],       // 1953.7.27 정전
];

/* ── 전투 ─────────────────────────────────────────── */

export type Side = "north" | "south";

export interface KWBattle {
  name: string;
  day: number;
  won: Side;
  sea?: boolean;
  major?: boolean;
  side?: "left" | "right";
  dy?: number;
  x: number;
  y: number;
}

const B = (
  name: string, day: number, won: Side, lon: number, lat: number,
  opt: { sea?: boolean; major?: boolean; side?: "left" | "right"; dy?: number } = {}
): KWBattle => ({ name, day, won, ...project(lon, lat), ...opt });

export const KW_BATTLES: KWBattle[] = [
  B("서울 함락", 3, "north", 126.98, 37.57, { major: true, side: "right", dy: -18 }),
  B("오산 죽미령", 10, "north", 127.06, 37.13, { side: "left" }),
  B("대전", 25, "north", 127.38, 36.35, { side: "left" }),
  B("다부동", 48, "south", 128.45, 36.13, { major: true, side: "right" }),
  B("인천상륙", 82, "south", 126.63, 37.47, { sea: true, major: true, side: "left", dy: 20 }),
  B("서울 수복", 95, "south", 126.98, 37.57, { major: true, side: "right", dy: 20 }),
  B("평양 점령", 116, "south", 125.75, 39.02, { major: true, side: "left" }),
  B("초산", 123, "south", 125.80, 40.83, { major: true, side: "right" }),
  B("운산", 122, "north", 125.75, 40.10, { side: "left" }),
  B("장진호", 155, "north", 127.20, 40.45, { major: true, side: "right" }),
  B("흥남 철수", 182, "south", 127.62, 39.83, { sea: true, major: true, side: "right" }),
  B("서울 재함락", 193, "north", 126.98, 37.57, { major: true, side: "right", dy: 58 }),
  B("서울 재수복", 262, "south", 126.98, 37.57, { side: "right", dy: 96 }),
  B("설마리", 300, "south", 126.90, 37.95, { side: "left" }),
  B("백마고지", 855, "south", 127.10, 38.28, { major: true, side: "right" }),
];

/* ── 주요 도시 ─────────────────────────────────────── */

export const KW_CITIES = [
  { ...project(126.98, 37.57), name: "서울", from: 0, side: "right" as const },
  { ...project(129.08, 35.18), name: "부산", from: 0, side: "right" as const },
  { ...project(125.75, 39.02), name: "평양", from: 0, side: "left" as const },
  { ...project(128.60, 35.87), name: "대구", from: 20, side: "right" as const },
  { ...project(126.63, 37.47), name: "인천", from: 70, side: "left" as const },
  { ...project(126.68, 37.95), name: "판문점", from: 380, side: "left" as const },
];

/* ── 사건 ─────────────────────────────────────────── */

export interface KWEvent {
  day: number;
  title: string;
  detail: string;
  /** 남측(한국·유엔) 국면이면 true */
  south?: boolean;
  impact?: number;
}

export const KW_EVENTS: KWEvent[] = [
  { day: 0, title: "남침", detail: "북한군, 38선 전역에서 남침", impact: 1 },
  { day: 3, title: "서울 함락", detail: "개전 사흘 만에 수도 함락", impact: 0.9 },
  { day: 25, title: "대전 함락", detail: "전선은 계속 남쪽으로", impact: 0.7 },
  { day: 52, title: "낙동강 방어선", detail: "국토의 10%만 남다", impact: 1 },
  { day: 82, title: "인천상륙작전", detail: "전세를 단번에 뒤집다", south: true, impact: 1 },
  { day: 95, title: "서울 수복", detail: "3개월 만에 수도를 되찾다", south: true, impact: 0.9 },
  { day: 116, title: "평양 점령", detail: "국군·유엔군 북진", south: true, impact: 0.8 },
  { day: 123, title: "압록강 도달", detail: "초산 — 전쟁의 최북단", south: true, impact: 1 },
  { day: 145, title: "중국군 참전", detail: "20만 대군, 전선이 다시 뒤집히다", impact: 1 },
  { day: 155, title: "장진호", detail: "영하 30도의 철수전", impact: 0.9 },
  { day: 182, title: "흥남 철수", detail: "피난민 9만여 명을 배에 태우다", south: true, impact: 0.9 },
  { day: 193, title: "1·4 후퇴", detail: "서울을 다시 내주다", impact: 1 },
  { day: 262, title: "서울 재수복", detail: "전선이 38선으로 돌아오다", south: true, impact: 0.8 },
  { day: 380, title: "휴전 회담", detail: "2년간의 고지전이 시작되다" },
  { day: 855, title: "백마고지", detail: "열흘간 주인이 스물네 번 바뀌다", south: true, impact: 0.9 },
  { day: 1128, title: "정전협정", detail: "3년 1개월 — 전선은 제자리로", impact: 1 },
];

export function kwEventAt(day: number): KWEvent | null {
  let cur: KWEvent | null = null;
  for (const e of KW_EVENTS) if (e.day <= day) cur = e;
  return cur;
}

export function kwBattlesUpTo(day: number): KWBattle[] {
  return KW_BATTLES.filter((b) => b.day <= day);
}
