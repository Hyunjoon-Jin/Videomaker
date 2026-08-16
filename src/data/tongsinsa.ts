/**
 * 조선통신사 — 1763~64년 계미사행.
 *
 * 질문 하나: 한양에서 에도까지 가는 데 얼마나 걸렸나.
 *
 * 열두 번의 사행을 다 그리면 아무것도 안 남는다. 기록이 제일 두꺼운
 * 한 번만 끝까지 따라간다. 정사 조엄 『해사일기』, 제술관 남옥 『일관기』,
 * 서기 김인겸 『일동장유가』가 같은 길을 각자 적었다.
 *
 * ── 날짜 ────────────────────────────────────────────
 * 사행록의 날짜는 전부 음력이다. 임진왜란 편에서 정한 규칙대로 두 역법을
 * 섞지 않는다. 다만 화면이 '출발 후 며칠'을 세므로 음력 날짜를 일수로
 * 옮겨야 했고, 그러려면 달의 크기(29일/30일)를 알아야 한다.
 *
 * 삭(朔)으로 달의 시작을, 중기(中氣)로 달의 번호를 정했다. 중기가 없는
 * 달이 윤달이라는 무중치윤법이고, 동지가 든 달이 11월이다. 시헌력이
 * 북경 기준이므로 북경 지방시로 계산했다(scripts/lunar-1763.py).
 * 이 구간에 윤달은 없다.
 *
 * 검산이 하나 붙는다. 이렇게 세면 한양 출발부터 복명까지가 331일인데,
 * 사행을 '11개월 332일'로 적은 연구가 있다. 시작일을 하루로 세면 332일이다.
 *
 * ── 정직하게 ────────────────────────────────────────
 * 날짜가 붙은 지점은 기록값이다. 그 사이 위치는 거리에 비례시킨 보간이라,
 * 이 영상이 특정 날짜의 사행 위치를 주장하지는 않는다. 실제로는 포구마다
 * 바람을 기다리며 멈춰 있었으므로 사이 구간은 등속이 아니었다.
 */
import { eaProject } from "./typhoon";

/** 음력 달의 크기. 1763년 8월부터 1764년 7월까지, 초하루의 출발 후 일수. */
const MONTHS: Array<{ year: number; month: number; first: number; len: number }> = [
  { year: 1763, month: 8, first: -2, len: 30 },
  { year: 1763, month: 9, first: 28, len: 29 },
  { year: 1763, month: 10, first: 57, len: 30 },
  { year: 1763, month: 11, first: 87, len: 29 },
  { year: 1763, month: 12, first: 116, len: 30 },
  { year: 1764, month: 1, first: 146, len: 30 },
  { year: 1764, month: 2, first: 176, len: 29 },
  { year: 1764, month: 3, first: 205, len: 30 },
  { year: 1764, month: 4, first: 235, len: 30 },
  { year: 1764, month: 5, first: 265, len: 29 },
  { year: 1764, month: 6, first: 294, len: 30 },
  { year: 1764, month: 7, first: 324, len: 29 },
];

/** 출발 후 일수 → 음력 날짜. */
export function lunarLabel(day: number): string {
  const d = Math.floor(day);
  let cur = MONTHS[0];
  for (const m of MONTHS) if (m.first <= d) cur = m;
  return `음력 ${cur.year}. ${cur.month}. ${d - cur.first + 1}`;
}

export const TOTAL_DAYS = 331;

export interface Stop {
  name: string;
  lon: number;
  lat: number;
  /** 기록에 날짜가 남은 지점. 없으면 앞뒤 기록 사이에서 거리로 보간한다. */
  day?: number;
  /** 이 지점까지 오는 방법. 첫 지점은 무시된다. */
  by: "land" | "sea";
  /** 지도에 이름을 띄울지. 옛 지명이 지금 어디인지 확실한 곳만 띄운다. */
  show?: boolean;
  /**
   * 이 배율보다 물러서면 이름을 감춘다.
   * 국내 구간은 고을이 촘촘해서 전체가 보이는 구도에서는 이름이 서로
   * 겹친다. 겹친 이름은 없느니만 못하다.
   */
  minZ?: number;
  side?: "left" | "right";
  dy?: number;
}

/**
 * 노정.
 *
 * 국내 구간은 남옥 『일관기』가 적은 서른 곳을 그대로 쓴다. 옛 지명이
 * 지금 어디인지 확실한 곳만 화면에 이름을 띄우고, 나머지는 선의 모양을
 * 잡는 데만 쓴다. 길이 굽은 자리가 곧 그 고을이다.
 *
 * 일본 구간은 사행록에 남은 기항지 순서다. 아카마가세키가 시모노세키,
 * 후추가 이즈하라다.
 */
export const ROUTE: Stop[] = [
  { name: "한양", lon: 126.98, lat: 37.57, day: 0, by: "land", show: true, side: "left" },
  { name: "양재", lon: 127.03, lat: 37.48, by: "land" },
  { name: "판교", lon: 127.10, lat: 37.39, by: "land" },
  { name: "용인", lon: 127.18, lat: 37.24, by: "land" },
  { name: "양지", lon: 127.29, lat: 37.15, by: "land" },
  { name: "죽산", lon: 127.42, lat: 37.07, by: "land" },
  { name: "무극", lon: 127.55, lat: 36.95, by: "land" },
  { name: "숭선", lon: 127.75, lat: 36.98, by: "land" },
  { name: "충주", lon: 127.93, lat: 36.99, by: "land", show: true, minZ: 2.2, side: "left" },
  { name: "안보", lon: 128.02, lat: 36.85, by: "land" },
  { name: "문경", lon: 128.19, lat: 36.73, by: "land", show: true, minZ: 2.2, side: "left" },
  { name: "유곡", lon: 128.20, lat: 36.65, by: "land" },
  { name: "용궁", lon: 128.35, lat: 36.60, by: "land" },
  { name: "예천", lon: 128.45, lat: 36.66, by: "land" },
  { name: "풍산", lon: 128.62, lat: 36.60, by: "land" },
  { name: "안동", lon: 128.73, lat: 36.57, by: "land", show: true, minZ: 2.2, side: "right" },
  { name: "일직", lon: 128.72, lat: 36.46, by: "land" },
  { name: "의성", lon: 128.70, lat: 36.35, by: "land" },
  { name: "청로", lon: 128.72, lat: 36.25, by: "land" },
  { name: "의흥", lon: 128.70, lat: 36.15, by: "land" },
  { name: "신녕", lon: 128.83, lat: 36.02, by: "land" },
  { name: "영천", lon: 128.94, lat: 35.97, by: "land", show: true, minZ: 2.4, side: "right" },
  { name: "모량", lon: 129.16, lat: 35.83, by: "land" },
  { name: "경주", lon: 129.22, lat: 35.84, by: "land", show: true, minZ: 2.4, side: "right", dy: 26 },
  { name: "구어", lon: 129.29, lat: 35.72, by: "land" },
  { name: "울산", lon: 129.31, lat: 35.54, by: "land", show: true, minZ: 2.4, side: "right" },
  { name: "동래", lon: 129.09, lat: 35.20, by: "land" },
  // 배를 탄 곳. 20일에 닿아 62일에 떠난다 — 여기 붙은 날짜는 떠난 날이다.
  { name: "부산", lon: 129.04, lat: 35.11, day: 62, by: "land", show: true, side: "left", dy: 14 },

  { name: "사스나", lon: 129.30, lat: 34.63, day: 63, by: "sea" },
  { name: "쓰시마", lon: 129.29, lat: 34.20, by: "sea", show: true, minZ: 1.7, side: "left" },
  { name: "이키", lon: 129.69, lat: 33.85, by: "sea", show: true, minZ: 2.4, side: "left" },
  { name: "아이노시마", lon: 130.43, lat: 33.77, by: "sea" },
  { name: "시모노세키", lon: 130.94, lat: 33.95, by: "sea", show: true, minZ: 2.0, side: "left", dy: 20 },
  { name: "가미노세키", lon: 132.10, lat: 33.83, by: "sea" },
  { name: "가마가리", lon: 132.68, lat: 34.19, by: "sea" },
  { name: "도모노우라", lon: 133.38, lat: 34.38, by: "sea" },
  { name: "우시마도", lon: 134.17, lat: 34.61, by: "sea" },
  { name: "무로쓰", lon: 134.49, lat: 34.75, by: "sea" },
  { name: "효고", lon: 135.18, lat: 34.67, by: "sea" },
  { name: "오사카", lon: 135.47, lat: 34.65, day: 166, by: "sea", show: true, side: "left", dy: 26 },

  { name: "요도", lon: 135.73, lat: 34.90, by: "land" },
  { name: "교토", lon: 135.77, lat: 35.01, by: "land", show: true, minZ: 2.0, side: "left" },
  { name: "오미하치만", lon: 136.10, lat: 35.13, by: "land" },
  { name: "히코네", lon: 136.25, lat: 35.27, by: "land" },
  { name: "오가키", lon: 136.62, lat: 35.36, by: "land" },
  { name: "나고야", lon: 136.90, lat: 35.18, by: "land", show: true, minZ: 2.0, side: "right", dy: 24 },
  { name: "오카자키", lon: 137.17, lat: 34.96, by: "land" },
  { name: "아라이", lon: 137.58, lat: 34.74, by: "land" },
  { name: "하마마쓰", lon: 137.73, lat: 34.71, by: "land" },
  { name: "슨푸", lon: 138.38, lat: 34.98, by: "land" },
  { name: "하코네", lon: 139.03, lat: 35.23, by: "land" },
  { name: "오다와라", lon: 139.16, lat: 35.26, by: "land" },
  { name: "에도", lon: 139.77, lat: 35.68, day: 191, by: "land", show: true, side: "right" },
];

export const XY = ROUTE.map((s) => ({ ...s, ...eaProject(s.lon, s.lat) }));

/** 구간 길이와 누적 길이 */
const SEG: number[] = [];
for (let i = 1; i < XY.length; i++) {
  SEG.push(Math.hypot(XY[i].x - XY[i - 1].x, XY[i].y - XY[i - 1].y));
}
const CUM = [0];
for (const s of SEG) CUM.push(CUM[CUM.length - 1] + s);

/**
 * 지점마다 '출발 후 며칠'을 매긴다.
 *
 * 날짜가 기록된 지점 사이는 거리에 비례시킨다. 실제로는 포구마다 바람을
 * 기다렸으므로 등속이 아니었지만, 그걸 재현할 근거가 없다. 봉수 편에서
 * 쓴 것과 같은 방식이고 화면에 그렇게 밝힌다.
 */
export const DAY_AT: number[] = (() => {
  const out = new Array<number>(XY.length).fill(0);
  const anchors = XY.map((s, i) => (s.day != null ? i : -1)).filter((i) => i >= 0);
  for (let a = 0; a < anchors.length - 1; a++) {
    const i0 = anchors[a];
    const i1 = anchors[a + 1];
    const d0 = XY[i0].day!;
    const d1 = XY[i1].day!;
    const l0 = CUM[i0];
    const span = CUM[i1] - l0;
    for (let i = i0; i <= i1; i++) {
      out[i] = span === 0 ? d0 : d0 + ((CUM[i] - l0) / span) * (d1 - d0);
    }
  }
  return out;
})();

/** 부산에 닿은 날과 배를 탄 날. 그 사이가 이 편에서 제일 긴 정지다. */
export const BUSAN_IN = 20;
export const BUSAN_OUT = 62;
export const WAIT_DAYS = BUSAN_OUT - BUSAN_IN;
export const EDO_IN = 191;
export const EDO_OUT = 215;
export const EDO_STAY = EDO_OUT - EDO_IN;

/**
 * 날짜 → 노정 위치(0..1의 진행도).
 *
 * 가는 길과 오는 길이 같으므로 값 하나로 왕복을 다 그린다. 에도에 있는
 * 동안은 1에 머물고, 그 뒤에는 되짚어 내려온다.
 */
export function progressAt(day: number): number {
  if (day <= BUSAN_OUT) {
    // 부산까지는 걷고, 부산에서는 멈춰 있다
    const d = Math.min(day, BUSAN_IN);
    const iBusan = ROUTE.findIndex((s) => s.name === "부산");
    const p = (d / BUSAN_IN) * (CUM[iBusan] / CUM[CUM.length - 1]);
    return p;
  }
  if (day <= EDO_IN) {
    let i = 0;
    while (i < DAY_AT.length - 1 && DAY_AT[i + 1] < day) i++;
    const d0 = DAY_AT[i];
    const d1 = DAY_AT[Math.min(i + 1, DAY_AT.length - 1)];
    const t = d1 === d0 ? 0 : (day - d0) / (d1 - d0);
    const l = CUM[i] + (CUM[Math.min(i + 1, CUM.length - 1)] - CUM[i]) * t;
    return l / CUM[CUM.length - 1];
  }
  if (day <= EDO_OUT) return 1;
  // 돌아오는 길 — 오사카(4월 7일)를 지나 한양(7월 8일)까지
  const back: Array<[number, number]> = [
    [EDO_OUT, 1],
    [241, CUM[ROUTE.findIndex((s) => s.name === "오사카")] / CUM[CUM.length - 1]],
    [266, CUM[ROUTE.findIndex((s) => s.name === "오사카")] / CUM[CUM.length - 1]],
    [TOTAL_DAYS, 0],
  ];
  for (let i = 0; i < back.length - 1; i++) {
    const [d0, p0] = back[i];
    const [d1, p1] = back[i + 1];
    if (day <= d1) return p0 + ((day - d0) / (d1 - d0)) * (p1 - p0);
  }
  return 0;
}

/** 진행도 → 지도 좌표 */
export function pointAt(p: number): { x: number; y: number; sea: boolean } {
  const target = p * CUM[CUM.length - 1];
  let i = 0;
  while (i < CUM.length - 2 && CUM[i + 1] < target) i++;
  const t = SEG[i] === 0 ? 0 : (target - CUM[i]) / SEG[i];
  // 지점 위에 정확히 서 있을 때는 '들어온 길'을 따른다. 오사카는 배로
  // 들어와서 걸어 나가는 곳이라, 도착한 순간에 뭍길로 바뀌면 배가 사라진다.
  const sea = t < 0.02 && i > 0 ? XY[i].by === "sea" : XY[i + 1].by === "sea";
  return {
    x: XY[i].x + (XY[i + 1].x - XY[i].x) * t,
    y: XY[i].y + (XY[i + 1].y - XY[i].y) * t,
    sea,
  };
}

/**
 * 지나온 길을 육로와 해로로 나눠 그린다.
 *
 * 이 구분이 이 편의 답이기도 하다. 여섯 달이 걸린 이유의 절반이 바다다.
 */
export function traveled(p: number): { land: string; sea: string } {
  const target = p * CUM[CUM.length - 1];
  const parts: Record<"land" | "sea", string[]> = { land: [], sea: [] };
  let cur: "land" | "sea" | null = null;
  let d = "";
  const flush = () => {
    if (cur && d) parts[cur].push(d);
    d = "";
  };
  for (let i = 0; i < XY.length - 1; i++) {
    if (CUM[i] >= target) break;
    const mode = XY[i + 1].by;
    if (mode !== cur) {
      flush();
      cur = mode;
      d = `M${XY[i].x.toFixed(1)} ${XY[i].y.toFixed(1)}`;
    }
    const t = Math.min(1, (target - CUM[i]) / (SEG[i] || 1));
    const x = XY[i].x + (XY[i + 1].x - XY[i].x) * t;
    const y = XY[i].y + (XY[i + 1].y - XY[i].y) * t;
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  flush();
  return { land: parts.land.join(" "), sea: parts.sea.join(" ") };
}

/** 전체 노정 — 앞으로 갈 길을 옅게 깔아둔다 */
export const FULL_PATH = XY.map(
  (s, i) => `${i ? "L" : "M"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`
).join("");

export interface TEvent {
  day: number;
  title: string;
  detail: string;
  impact?: number;
  /** 카메라가 볼 곳. 없으면 사행 위치를 따라간다. */
  focus?: [number, number];
  zoom?: number;
  /** 돌아오는 길이면 true — 화면 색이 바뀐다 */
  back?: boolean;
}

/**
 * 자막은 문장으로 쓴다.
 *
 * 두 번 고쳤다. 처음에는 사실만 순서대로 적었다 — '쓰시마까지 하루 /
 * 부산에서 배로 24시간이다'. 틀린 데는 없는데 아무 데서도 안 걸린다.
 *
 * 그래서 대조를 넣었더니 이번엔 토막이 됐다 — '걸은 20일의 다섯 배를
 * 바다에서'. 뜻은 통하는데 사람이 하는 말이 아니다. 줄을 짧게 만들려고
 * 조사를 떼고 서술어를 버린 것이라, 읽으면 문장이 아니라 메모가 나온다.
 *
 * 셋째 판이 지금 것이다. 규칙 둘.
 *
 *  1. 둘째 줄은 **끝나는 문장**으로 쓴다. '~다'로 닫고 명사로 끊지 않는다.
 *     '항구마다 바람 때를 기다렸다'지 '바람 대기 103일'이 아니다.
 *  2. 그러면서 앞의 숫자와 부딪히게 둔다. 42일을 본 사람에게 '하루 만에
 *     건넜다'는 그냥 짧다는 뜻이 아니다.
 *
 * 글자 수는 늘었지만 beatFor가 길이를 보고 체류 시간을 정하므로 읽을
 * 시간은 알아서 따라온다. 짧게 쓰는 것이 목적이었던 적은 없다.
 */
export const T_EVENTS: TEvent[] = [
  { day: 0, title: "477명이 한양을 떠났다", detail: "국서를 전하러 에도로 간다", impact: 0.9, zoom: 3.2 },
  { day: 20, title: "부산까지 걸어서 20일", detail: "서른 고을을 지나 440km를 갔다", impact: 0.7, zoom: 3.0 },
  { day: 62, title: "여기서 42일을 더 기다렸다", detail: "걸어온 날의 두 배를 항구에서 보냈다", impact: 1, zoom: 3.4 },
  { day: 63, title: "쓰시마까지는 하루였다", detail: "42일을 기다려 하루 만에 건넜다", impact: 0.8, zoom: 3.0 },
  { day: 166, title: "오사카까지 103일이 걸렸다", detail: "항구마다 바람 때를 기다렸다", impact: 0.9, zoom: 1.9 },
  { day: 191, title: "여섯 달 열사흘 만에 에도다", detail: "106명은 오사카에 남고 371명이 들어갔다", impact: 1, zoom: 2.6 },
  { day: 215, title: "24일 만에 에도를 떠났다", detail: "여섯 달을 와서 스무나흘을 머물렀다", impact: 1, zoom: 2.6 },
  { day: 241, title: "오사카에서 사람이 죽었다", detail: "도훈도 최천종이 4월 7일 살해됐다", impact: 0.9, zoom: 2.4, back: true },
  { day: 266, title: "한 달을 더 못 떠났다", detail: "범인이 처형된 5월 2일까지 묶여 있었다", impact: 0.8, zoom: 2.4, back: true },
  { day: TOTAL_DAYS, title: "331일 만에 한양으로 돌아왔다", detail: "국서를 전하고 회답을 받아 왔다", impact: 1, zoom: 1.5, back: true },
];

/**
 * 마무리.
 *
 * 처음엔 열두 번을 연표로 세우고 그 아래 '부산에서 도쿄까지 8일이
 * 걸렸다'를 붙였다. 보고 "이게 뭐 어쩌라는 거냐"는 말을 들었는데
 * 맞는 말이었다. 8일이 누구 얘긴지를 보는 사람이 연표에서 찾아
 * 올려다봐야 알 수 있었다. 마무리가 숙제를 내면 안 된다.
 *
 * 그래서 연표를 버리고 두 줄만 나란히 세웠다. 같은 출발지, 같은 형식,
 * 다른 숫자. 읽는 게 아니라 보면 된다.
 *
 *   1763  통신사   부산 → 에도   129일
 *   1876  수신사   부산 → 도쿄     8일
 *
 * 1876년 제1차 수신사 김기수는 음력 4월 29일 부산에서 일본 기선을 타고
 * 5월 7일 도쿄에 닿았다. 여드레다(scripts/lunar.py로 확인).
 */
export interface Voyage {
  year: string;
  who: string;
  from: string;
  to: string;
  days: string;
  now?: boolean;
}

export const VOYAGES: Voyage[] = [
  { year: "1763", who: "통신사", from: "부산", to: "에도", days: "129일", now: true },
  { year: "1876", who: "수신사", from: "부산", to: "도쿄", days: "8일" },
];
