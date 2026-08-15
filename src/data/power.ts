/**
 * 1948년 5·14 단전 — 북에서 오던 전기가 끊긴 날.
 *
 * 이 편을 고른 이유는 아는 사람이 거의 없어서다. 분단은 다들 알지만,
 * 분단 3년째에 남한 전체가 실제로 어두워졌다는 것은 잘 모른다.
 *
 * ── 이 편의 뼈대 ──────────────────────────────────────
 * 해방 당시 한반도 발전설비는 172만 3천kW였다. 그중 남한 몫은
 * 19만 9천kW — 11.5%뿐이었다. 수력 158만 6천kW 가운데 남한에 있던 것은
 * 6만 2천kW였고, 화력 13만 7천kW는 전부 남쪽에 있었다.
 *
 * 압록강 수풍발전소 하나가 60만kW다. 남한 전체의 세 배다.
 *
 * 1948년 5월 10일 제헌국회의원 선거가 치러지자, 북조선인민위원회는
 * 전기요금 미지급을 구실로 5월 14일 정오에 송전을 끊었다. 그때까지
 * 남한이 낸 요금은 총액의 35%였다.
 *
 * 전차가 길 위에 섰고 공장이 멈췄다. 모내기철과 겹쳐 관개용 전력이
 * 공급되지 않아 쌀 약 55만 석이 덜 났다.
 *
 * ── 정직하게 ──────────────────────────────────────────
 * 발전소 좌표는 댐과 발전소가 있던 자리다. 북한 수력은 계단식으로 여러
 * 발전소가 이어져 있어 대표 지점 하나로 찍었다.
 *
 * 영월화력은 처음에 1937년 10만 7천kW로 적었다가 고쳤다. 조선전업주식회사가
 * 1935년 7월 착공해 1941년 3월 준공했고, 2만 5천kW 4기로 10만kW다.
 * 부산화력도 넣었다가 뺐다 — 감천동 부산화력은 1964년 것이라 이 편의
 * 지도에 있으면 안 된다.
 *
 * 송전선은 실제 선로가 아니다. 어디서 어디로 전기가 갔는지를 나타낸
 * 선이고, 실제 철탑 경로와는 다르다. 화면에 그렇게 적는다.
 */
import { project } from "./places";

/** 해방 당시 한반도 발전설비 (kW) */
export const TOTAL_KW = 1_723_000;
/** 그중 남한 몫 */
export const SOUTH_KW = 199_000;

export interface Plant {
  name: string;
  where: string;
  lon: number;
  lat: number;
  /** 설비용량 kW */
  kw: number;
  /** 준공/가동 연도 — 이 해부터 지도에 뜬다 */
  from: number;
  north: boolean;
  /** 화력인가 (해방 당시 화력은 전부 남쪽에 있었다) */
  thermal?: boolean;
  /** 배에 실린 발전소 */
  ship?: boolean;
  side?: "left" | "right";
  dy?: number;
}

export const PLANTS: Plant[] = [
  { name: "부전강", where: "함남", lon: 127.45, lat: 40.20, kw: 200_000, from: 1929, north: true, side: "right" },
  { name: "장진강", where: "함남", lon: 127.25, lat: 40.32, kw: 334_000, from: 1935, north: true, side: "left" },
  { name: "허천강", where: "함남", lon: 128.35, lat: 40.58, kw: 338_080, from: 1940, north: true, side: "right" },
  { name: "수풍", where: "평북 삭주", lon: 124.95, lat: 40.45, kw: 600_000, from: 1944, north: true, side: "right" },

  { name: "당인리", where: "서울 마포", lon: 126.90, lat: 37.545, kw: 22_500, from: 1930, north: false, thermal: true, side: "left" },
  { name: "영월화력", where: "강원", lon: 128.47, lat: 37.185, kw: 100_000, from: 1941, north: false, thermal: true, side: "right" },
  { name: "청평", where: "경기 가평", lon: 127.42, lat: 37.735, kw: 39_600, from: 1943, north: false, side: "right", dy: -14 },

  // 배에 실린 발전소. 단전에 대한 미군정의 임시 대응이다.
  { name: "자코나", where: "부산항 · 발전함", lon: 129.04, lat: 35.10, kw: 20_000, from: 1948.2, north: false, ship: true, side: "left", dy: 22 },
  { name: "엘렉트라", where: "인천항 · 발전함", lon: 126.61, lat: 37.46, kw: 6_900, from: 1948.5, north: false, ship: true, side: "left" },
];

export const PLANT_XY = PLANTS.map((p) => ({ ...p, ...project(p.lon, p.lat) }));

/** 단전 시각 — 1948년 5월 14일 정오 */
export const CUT = 1948 + (31 + 29 + 31 + 30 + 14) / 366;

/**
 * 설비용량 → 원 반지름.
 *
 * 60만kW와 6,900kW를 같은 자에 올려야 한다. 선형으로 그리면 발전함이
 * 점 하나로 사라지고, 로그로 그리면 수풍이 안 커 보인다. 제곱근이
 * 면적 비례라 눈으로 읽기에 제일 정직하다.
 */
export function radiusOf(kw: number): number {
  return Math.sqrt(kw / 600_000) * 34;
}

/** 연도 → 화면 표기 */
export function yearLabel(y: number): string {
  if (y >= CUT && y < CUT + 0.02) return "1948. 5. 14. 정오";
  return `${Math.floor(y)}년`;
}

/**
 * 북에서 남으로 오던 전기.
 *
 * 실제 송전선이 아니라 공급 관계를 나타낸 선이다. 수풍과 함남 수력에서
 * 서울로 이었다. 단전 뒤에는 회색으로 끊어진 채 남긴다 — 선로가 사라진
 * 것이 아니라 전기가 안 온 것이기 때문이다.
 */
const SEOUL = project(126.98, 37.55);
export const FEEDS = PLANTS.filter((p) => p.north).map((p) => {
  const a = project(p.lon, p.lat);
  return { id: p.name, from: p.from, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${SEOUL.x.toFixed(1)} ${SEOUL.y.toFixed(1)}` };
});

/* ── 연표 ───────────────────────────────────────────── */

export interface PEvent {
  year: number;
  title: string;
  detail?: string;
  impact?: number;
  /** 이 사건이 단전이면 화면이 한 번 꺼진다 */
  cut?: boolean;
  focus?: [number, number];
  zoom?: number;
}

export const P_EVENTS: PEvent[] = [
  { year: 1929, title: "부전강 20만kW", detail: "함경도 산속에 대형 수력이 들어서기 시작한다", impact: 0.6, focus: [127.45, 40.20], zoom: 2.4 },
  { year: 1930, title: "당인리 2만kW", detail: "남쪽은 화력이다. 수력을 놓을 강이 마땅치 않다", impact: 0.5, focus: [126.95, 37.55], zoom: 3.0 },
  { year: 1935, title: "장진강 33만kW", impact: 0.6, focus: [127.25, 40.32], zoom: 2.4 },
  { year: 1940, title: "허천강 33만kW", impact: 0.6, focus: [128.35, 40.58], zoom: 2.4 },
  { year: 1941, title: "영월화력 10만kW", detail: "남한에서 제일 큰 발전소가 이것이었다", impact: 0.5, focus: [128.47, 37.185], zoom: 2.8 },
  { year: 1944, title: "수풍 60만kW", detail: "이 하나가 남한 전체 발전설비의 세 배다", impact: 1, focus: [125.70, 40.20], zoom: 2.2 },
  { year: 1945, title: "해방", detail: "172만kW 가운데 남한에 남은 것은 19만kW", impact: 0.9, focus: [127.30, 38.60], zoom: 1.6 },
  { year: 1948.2, title: "발전함 자코나", detail: "미 해군 발전함이 부산항에 닿아 2만kW를 낸다", impact: 0.6, focus: [129.04, 35.10], zoom: 3.0 },
  { year: CUT, title: "5·14 단전", detail: "북조선인민위원회, 전기요금을 구실로 송전을 끊다", impact: 1, cut: true, focus: [127.00, 38.40], zoom: 1.8 },
  { year: 1948.45, title: "전차가 길에 섰다", detail: "공장이 멈추고 격일제 송전이 시작된다", impact: 0.9, focus: [126.98, 37.55], zoom: 2.6 },
  { year: 1948.55, title: "쌀 55만 석", detail: "모내기철과 겹쳐 관개용 전기가 가지 못했다", impact: 0.9, focus: [127.10, 36.60], zoom: 2.0 },
  { year: 1948.7, title: "발전함 엘렉트라", detail: "인천항에서 6,900kW. 수풍 하나의 1퍼센트다", impact: 0.7, focus: [126.61, 37.46], zoom: 3.0 },
];
