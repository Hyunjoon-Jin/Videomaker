/**
 * 임진왜란·정유재란 7년 (1592~1598) — 팔도 단위 점령 추이.
 *
 * ── 왜 가로 전선을 버렸나 ────────────────────────────────
 * 위도 가로줄로 그리면 전라도가 1592년에 점령된 것으로 나온다. 정반대다.
 * 전라도는 1차 침공에서 끝까지 지켜낸 유일한 도이고, 그 덕에 이순신의
 * 수군 기지와 조선의 곡창이 살아남았다. 이건 임진왜란 서사의 핵심이라
 * 뭉개면 안 된다. 그리고 1597년 정유재란에서 바로 그 전라도가 첫 표적이
 * 되는 반전도 도 단위로 그려야 보인다.
 *
 * ── 날짜 ────────────────────────────────────────────
 * 전부 음력. 개월 인덱스 0 = 1592년 4월(부산 상륙).
 * 7년치 음/양 환산은 오차가 누적되므로 한국 사료 관행대로 음력으로 통일한다.
 */

import { SEA_BATTLES } from "./places";

export const START_YM = { y: 1592, m: 4 };
export const TOTAL_MONTHS = 79; // 1592.4 → 1598.11

export function monthLabel(idx: number): string {
  const t = START_YM.m - 1 + Math.floor(idx);
  return `${START_YM.y + Math.floor(t / 12)}년 ${(t % 12) + 1}월`;
}

export type ProvinceId =
  | "gyeonggi" | "chungcheong" | "gyeongsang" | "jeolla"
  | "gangwon" | "hwanghae" | "pyeongan" | "hamgyeong" | "jeju";

/** [개월, 도, 일본군 점령 여부] — 상태가 바뀌는 시점만 적는다 */
const CHANGES: Array<[number, ProvinceId, boolean]> = [
  // ── 1592 일본군 북상 ──
  [0, "gyeongsang", true],    // 4월 부산 상륙
  [1, "gyeonggi", true],      // 5월 한양 함락
  [2, "gangwon", true],
  [2, "chungcheong", true],
  [2, "hwanghae", true],
  [2, "pyeongan", true],      // 6월 평양 함락
  [3, "hamgyeong", true],     // 7월 함경도 — 최대 진출
  // 전라도는 끝내 뚫리지 않는다 (이치 전투 · 진주대첩)

  // ── 1593 조명연합군 반격 ──
  [9, "pyeongan", false],     // 1593.1 평양성 탈환
  [10, "hwanghae", false],
  [10, "hamgyeong", false],
  [12, "gyeonggi", false],    // 1593.4 한양 수복
  [12, "gangwon", false],
  [12, "chungcheong", false],
  // 이후 경상 남해안 왜성만 유지 → gyeongsang은 계속 true

  // ── 1597 정유재란 ──
  [64, "jeolla", true],       // 8월 남원 함락 — 1592년에 지킨 그곳
  [65, "chungcheong", true],  // 9월 직산까지 북상
  [66, "chungcheong", false], // 명량 이후 남하
  [78, "jeolla", false],

  // ── 1598 종전 ──
  [79, "gyeongsang", false],
];

/** month 시점에 일본군이 점령한 도 집합 */
export function occupiedAt(month: number): Set<ProvinceId> {
  const s = new Set<ProvinceId>();
  for (const [m, id, on] of CHANGES) {
    if (m > month) break;
    if (on) s.add(id);
    else s.delete(id);
  }
  return s;
}

/** 점령 상태가 바뀌는 데 걸리는 시간(개월). 색이 툭 끊기지 않게 한다. */
const RAMP = 0.5;

/**
 * month 시점 도의 점령도 0..1.
 * 0=조선, 1=일본군. 사이 값은 전환 중.
 */
export function occupationLevel(month: number, id: ProvinceId): number {
  let prev = 0;
  let cur = 0;
  let at = -Infinity;
  for (const [m, pid, on] of CHANGES) {
    if (pid !== id) continue;
    if (m > month) break;
    prev = cur;
    cur = on ? 1 : 0;
    at = m;
  }
  if (at === -Infinity) return 0;
  const t = Math.min(1, Math.max(0, (month - at) / RAMP));
  return prev + (cur - prev) * t;
}

export interface WarEvent {
  month: number;
  date: string;
  title: string;
  detail: string;
  /** 조선측 승전 */
  win?: boolean;
  /** 해전 이름 — places.ts의 SEA_BATTLES 키 */
  sea?: keyof typeof SEA_BATTLES;
  impact?: number;
}

export const WAR_EVENTS: WarEvent[] = [
  { month: 0, date: "1592년 4월", title: "부산 상륙", detail: "왜군 20만, 조선 침공", impact: 0.6 },
  { month: 1, date: "1592년 5월", title: "한양 함락", detail: "상륙 20일 만에 수도 함락", impact: 0.9 },
  { month: 1.4, date: "1592년 5월", title: "옥포 해전", detail: "이순신 첫 승리", win: true, sea: "옥포", impact: 0.5 },
  { month: 2, date: "1592년 6월", title: "평양 함락", detail: "선조는 의주까지 피난", impact: 0.85 },
  { month: 3, date: "1592년 7월", title: "한산도 대첩", detail: "학익진 — 제해권 장악", win: true, sea: "한산도", impact: 1 },
  { month: 3.6, date: "1592년 7월", title: "이치 전투", detail: "전라도 방어선을 지켜내다", win: true, impact: 0.6 },
  { month: 6, date: "1592년 10월", title: "진주대첩", detail: "김시민, 전라 진입을 막다", win: true, impact: 0.8 },
  { month: 9, date: "1593년 1월", title: "평양성 탈환", detail: "조명연합군 반격 개시", win: true, impact: 0.9 },
  { month: 10.5, date: "1593년 2월", title: "행주대첩", detail: "권율, 한양 코앞에서 대승", win: true, impact: 1 },
  { month: 12, date: "1593년 4월", title: "한양 수복", detail: "왜군, 남해안 왜성으로 후퇴", win: true, impact: 0.7 },
  { month: 30, date: "1594~1596", title: "강화 협상", detail: "3년간의 교착" },
  { month: 63, date: "1597년 7월", title: "칠천량 패전", detail: "조선 수군 궤멸 — 정유재란", impact: 0.9 },
  { month: 64, date: "1597년 8월", title: "남원 함락", detail: "지켜냈던 전라도가 뚫리다", impact: 1 },
  { month: 65, date: "1597년 9월", title: "명량 대첩", detail: "13척으로 133척을 막다", win: true, sea: "명량", impact: 1 },
  { month: 76, date: "1598년 8월", title: "도요토미 사망", detail: "일본군 철수 결정" },
  { month: 79, date: "1598년 11월", title: "노량 해전", detail: "이순신 전사 — 7년 전쟁 종결", win: true, sea: "노량", impact: 1 },
];

export function warEventAt(month: number): WarEvent | null {
  let cur: WarEvent | null = null;
  for (const e of WAR_EVENTS) if (e.month <= month) cur = e;
  return cur;
}

export function seaWinsUpTo(month: number) {
  return WAR_EVENTS.filter((e) => e.sea && e.month <= month);
}

/** 점령된 도의 수 — 화면 카운터용 */
export function occupiedCount(month: number): number {
  return occupiedAt(month).size;
}
