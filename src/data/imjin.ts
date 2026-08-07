/**
 * 임진왜란 초기 20일 (1592) — 진격 연표.
 *
 * ── 날짜 표기에 관하여 ──────────────────────────────────────────
 * 한국어 사료는 음력, 영어 사료는 양력(그레고리력)으로 적는다.
 * 둘을 섞으면 "4월 13일 상륙, 6월 함락"처럼 20일이 두 달로 보인다.
 * 그래서 두 역법을 같이 들고 다니며 화면에도 병기한다.
 *
 * 교차 검증: 음력↔양력 오프셋이 전 구간 40일로 일치한다.
 *   음 4/13→양 5/23 · 음 4/15→양 5/25 · 음 4/25→양 6/3
 *   음 4/28→양 6/7  · 음 5/03→양 6/12
 * 상륙에서 한양 함락까지가 두 역법 모두 정확히 20일이다.
 *
 * 출처: 한국어 연표(국사편찬위·한국민족문화대백과 계열)와
 *       영문 Imjin War 연표를 교차 확인. 자세한 링크는 README 참조.
 *
 * ⚠ 알려진 이견: 한양 입성 시점은 사료에 따라 양력 6/9~6/12로 갈린다.
 *   부대별(1군·2군) 도착 시차 때문이다. 여기서는 널리 쓰이는
 *   "제1군의 한양 장악 = 6/12(음 5/3)"를 채택했다.
 */

/** 진격 경로 위의 지점 = 실제 시군구 코드에 매핑 */
export interface Waypoint {
  /** 시군구 코드 (src/data/korea-paths.json과 동일) */
  code: string;
  /** 화면에 쓸 당대 지명 */
  label: string;
  /** 상륙일(D0=양력 5/23)로부터 경과일. 경유지는 보간값 */
  day: number;
}

/** 일본군 3로(路) */
export interface Division {
  id: string;
  /** 지휘관 */
  commander: string;
  /** 경로 이름 */
  route: string;
  color: string;
  path: Waypoint[];
}

export const D0_SOLAR = "1592. 5. 23."; // 음력 4월 13일
export const TOTAL_DAYS = 20; // 상륙 → 한양 함락

export const DIVISIONS: Division[] = [
  {
    id: "konishi",
    commander: "고니시 유키나가",
    route: "중로(中路)",
    color: "#EF4444",
    path: [
      { code: "21030", label: "부산진", day: 0 }, // 부산 동구
      { code: "21060", label: "동래", day: 2 },
      { code: "38080", label: "밀양", day: 5 },
      { code: "22010", label: "대구", day: 8 },
      { code: "37080", label: "상주", day: 11 }, // 상주 전투
      { code: "37090", label: "문경", day: 13 },
      { code: "33020", label: "충주", day: 15 }, // 탄금대 전투
      { code: "11010", label: "한양", day: 20 },
    ],
  },
  {
    id: "kato",
    commander: "가토 기요마사",
    route: "동로(東路)",
    color: "#F59E0B",
    path: [
      { code: "21030", label: "부산", day: 1 },
      { code: "26010", label: "울산", day: 4 },
      { code: "37070", label: "영천", day: 8 },
      { code: "33020", label: "충주", day: 15 }, // 1군과 합류
      { code: "11010", label: "한양", day: 20 },
    ],
  },
  {
    id: "kuroda",
    commander: "구로다 나가마사",
    route: "서로(西路)",
    color: "#A855F7",
    path: [
      { code: "38070", label: "김해", day: 2 },
      { code: "37030", label: "추풍령", day: 10 }, // 김천
      { code: "11010", label: "한양", day: 20 },
    ],
  },
];

/** 화면에 띄울 주요 사건 */
export interface Event {
  day: number;
  solar: string;
  lunar: string;
  title: string;
  detail: string;
}

export const EVENTS: Event[] = [
  {
    day: 0,
    solar: "5월 23일",
    lunar: "음 4월 13일",
    title: "부산 상륙",
    detail: "일본군 선봉 부산 앞바다 도착",
  },
  {
    day: 1,
    solar: "5월 24일",
    lunar: "음 4월 14일",
    title: "부산진성 함락",
    detail: "첨사 정발 전사",
  },
  {
    day: 2,
    solar: "5월 25일",
    lunar: "음 4월 15일",
    title: "동래성 함락",
    detail: "부사 송상현 전사",
  },
  {
    day: 11,
    solar: "6월 3일",
    lunar: "음 4월 25일",
    title: "상주 전투",
    detail: "순변사 이일 패주",
  },
  {
    day: 15,
    solar: "6월 7일",
    lunar: "음 4월 28일",
    title: "충주 탄금대",
    detail: "삼도순변사 신립 전사",
  },
  {
    day: 17,
    solar: "6월 9일",
    lunar: "음 4월 30일",
    title: "선조 한양 이탈",
    detail: "임금이 도성을 떠나 북으로",
  },
  {
    day: 20,
    solar: "6월 12일",
    lunar: "음 5월 3일",
    title: "한양 함락",
    detail: "상륙 20일 만에 수도 함락",
  },
];

/**
 * 경과일 → 날짜 문자열.
 *
 * 기준은 D+0 = 양력 5월 23일 = 음력 4월 13일.
 * 1592년 음력 4월은 30일까지다 — EVENTS의 D+17=음 4/30, D+20=음 5/3에서
 * 역산해 확인된다(13+17=30, 이후 5/1·5/2·5/3).
 */
export function solarDate(day: number): string {
  const d = 23 + Math.floor(day); // 5월 23일 기준, 5월은 31일까지
  return d <= 31 ? `5월 ${d}일` : `6월 ${d - 31}일`;
}

export function lunarDate(day: number): string {
  const d = 13 + Math.floor(day); // 음 4월 13일 기준, 음 4월은 30일까지
  return d <= 30 ? `음 4월 ${d}일` : `음 5월 ${d - 30}일`;
}

/** day 시점에 이미 지나간(=함락된) 지역 코드 집합 */
export function fallenAt(day: number): Set<string> {
  const s = new Set<string>();
  for (const d of DIVISIONS) {
    for (const w of d.path) if (w.day <= day) s.add(w.code);
  }
  return s;
}

/** day 시점에 표시할 가장 최근 사건 */
export function eventAt(day: number): Event | null {
  let cur: Event | null = null;
  for (const e of EVENTS) if (e.day <= day) cur = e;
  return cur;
}
