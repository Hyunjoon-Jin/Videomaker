/**
 * 임진왜란·정유재란 7년 (1592.5 ~ 1598.12).
 *
 * ── 왜 "전선(前線)" 모델인가 ─────────────────────────────
 * 시군구 단위 점령 여부는 7년치를 신뢰할 만하게 구할 수 없다.
 * 대신 사료가 분명히 말해주는 것 — 일본군이 어디까지 올라갔는가 — 을
 * 위도 하나로 모델링한다. 이건 검증 가능하고, 밀고 밀리는 전쟁의
 * 구조를 그대로 드러낸다. 화면에도 "최대 진출선"이라고 명시한다.
 *
 * ── 날짜 표기 ──────────────────────────────────────────
 * 7년을 다루면 음/양력 환산 오차가 누적된다. 여기서는 한국 사료의 관행대로
 * 음력 기준 연·월을 쓰고 화면에 그렇게 밝힌다. 20일 파일럿처럼 일 단위
 * 정밀도를 주장하지 않는다 — 7년을 40초에 담으면 일 단위는 보이지도 않는다.
 *
 * cy 좌표계는 src/data/peninsula.json과 같다(0=최북단, 1000=최남단).
 * 환산: cy = 1000 - (위도 - 33.20) × 101.9
 *   평양 39.02N→407 · 한양 37.57N→555 · 부산 35.10N→806
 */

/**
 * 개월 인덱스 0 = 1592년 4월(음력) — 부산 상륙 달.
 * 사건 표기가 전부 음력이므로 축도 음력에 맞춘다.
 * (양력이면 1592년 5월이지만, 둘을 섞으면 20일 파일럿에서 겪은 함정이 재발한다.)
 */
export const START_YM = { y: 1592, m: 4 };
export const TOTAL_MONTHS = 79; // 1592.4 → 1598.11(음력)

export function monthLabel(idx: number): string {
  const t = START_YM.m - 1 + Math.floor(idx);
  return `${START_YM.y + Math.floor(t / 12)}년 ${(t % 12) + 1}월`;
}

/** 전선 키프레임: [개월 인덱스, cy] — cy가 작을수록 북쪽 */
const FRONT: Array<[number, number]> = [
  [0, 900],   // 1592.05 부산 상륙 (남단)
  [1, 555],   // 1592.06 한양 함락
  [2, 407],   // 1592.07 평양 함락
  [3, 250],   // 1592.08 함경도까지 — 최대 진출
  [7, 250],   // 1592.12 교착
  [8, 430],   // 1593.01 조명연합군 평양 탈환
  [10, 545],  // 1593.03 행주대첩 이후 한양 압박
  [11, 780],  // 1593.04 일본군 한양 철수, 남해안 왜성으로
  [56, 790],  // 1594~1596 강화 협상, 소강
  [63, 640],  // 1597.08 정유재란 — 남원·전주 함락
  [64, 600],  // 1597.09 직산까지 북상
  [66, 780],  // 1597.11 명량 이후 남하
  [78, 800],  // 1598.11
  [79, 1010], // 1598.12 철수 — 지도 밖으로
];

/** 개월 인덱스 → 전선 cy. 키프레임 사이는 선형 보간. */
export function frontAt(month: number): number {
  if (month <= FRONT[0][0]) return FRONT[0][1];
  for (let i = 1; i < FRONT.length; i++) {
    const [m1, v1] = FRONT[i];
    if (month <= m1) {
      const [m0, v0] = FRONT[i - 1];
      const t = (month - m0) / (m1 - m0);
      return v0 + (v1 - v0) * t;
    }
  }
  return FRONT[FRONT.length - 1][1];
}

export interface WarEvent {
  /** 개월 인덱스 */
  month: number;
  date: string;
  title: string;
  detail: string;
  /** 조선측 승전이면 true — 색이 갈린다 */
  win?: boolean;
  /** 해전이면 지도 위 마커 좌표(peninsula 좌표계) */
  sea?: { x: number; y: number };
  impact?: number;
}

export const WAR_EVENTS: WarEvent[] = [
  { month: 0, date: "1592년 4월", title: "부산 상륙", detail: "왜군 20만, 조선 침공 개시", impact: 0.6 },
  { month: 1, date: "1592년 5월", title: "한양 함락", detail: "상륙 20일 만에 수도 함락", impact: 0.9 },
  { month: 1.2, date: "1592년 5월", title: "옥포 해전", detail: "이순신 첫 승리 — 바다를 막다", win: true, sea: { x: 590, y: 830 }, impact: 0.5 },
  { month: 2, date: "1592년 6월", title: "평양 함락", detail: "선조는 의주까지 피난", impact: 0.8 },
  { month: 3, date: "1592년 7월", title: "한산도 대첩", detail: "학익진 — 제해권 장악", win: true, sea: { x: 560, y: 845 }, impact: 1 },
  { month: 8, date: "1593년 1월", title: "평양성 탈환", detail: "조명연합군 반격 시작", win: true, impact: 0.9 },
  { month: 10, date: "1593년 2월", title: "행주대첩", detail: "권율, 한양 코앞에서 대승", win: true, impact: 1 },
  { month: 11, date: "1593년 4월", title: "한양 수복", detail: "왜군, 남해안 왜성으로 후퇴", win: true, impact: 0.7 },
  { month: 30, date: "1594~1596", title: "강화 협상", detail: "3년간의 교착", },
  { month: 63, date: "1597년 7월", title: "정유재란", detail: "칠천량에서 조선 수군 궤멸", impact: 0.9 },
  { month: 64, date: "1597년 9월", title: "명량 대첩", detail: "13척으로 133척을 막다", win: true, sea: { x: 435, y: 905 }, impact: 1 },
  { month: 76, date: "1598년 8월", title: "도요토미 사망", detail: "일본군 철수 결정", },
  { month: 79, date: "1598년 11월", title: "노량 해전", detail: "이순신 전사 — 7년 전쟁 종결", win: true, sea: { x: 520, y: 862 }, impact: 1 },
];

export function warEventAt(month: number): WarEvent | null {
  let cur: WarEvent | null = null;
  for (const e of WAR_EVENTS) if (e.month <= month) cur = e;
  return cur;
}

/** month 시점까지 벌어진 해전 마커 */
export function seaWinsUpTo(month: number) {
  return WAR_EVENTS.filter((e) => e.sea && e.month <= month);
}
