/**
 * 봉수 — 제2로 직봉, 부산 다대포에서 서울 목멱산까지.
 *
 * 앞의 네 편은 축이 개월·일·연이었다. 이 편은 시(hour)다. 같은 엔진인데
 * 처음 보는 속도가 된다.
 *
 * ── 이 편의 뼈대 ──────────────────────────────────────
 * 봉수는 어느 변경에서 올리든 대략 12시간이면 중앙에 닿아야 했다.
 * 그런데 중종 27년(1532)에는 변방에서 서울까지 5~6일이 걸렸다.
 * 봉수군의 태만과 봉수대 관리 소홀 때문이었다. (신편 한국사, 국사편찬위원회)
 *
 * 규정 12시간과 실제 5~6일. 열 배가 넘는다. 이 간극이 영상 전체다.
 *
 * ── 거화법 ────────────────────────────────────────────
 * 1419년(세종 1) 병조가 5거제로 확정하고, 『경국대전』에서 해상·육지
 * 구분 없이 일원화했다.
 *   1거 평상시 · 2거 적 출현 · 3거 국경 접근 · 4거 국경 침범 · 5거 접전
 * 당의 봉수가 적의 수로 1~4거를 나눈 것과 다르다. 조선은 상황으로 나눴다.
 *
 * ── 정직하게 ──────────────────────────────────────────
 * 제2로 직봉은 『증보문헌비고』(1908) 기준 44곳이다. 이 영상은 그중
 * 위치가 확인되는 13곳만 찍었다. 나머지를 눈대중으로 채우면 그건 지도가
 * 아니라 그림이다.
 *
 * 좌표는 봉수가 있던 산·고개의 위치다. 봉수대 유적의 정확한 지점과는
 * 수백 미터 차이가 날 수 있다.
 *
 * 시각은 규정(12시간)을 경로 길이로 나눈 값이다. 봉수마다 몇 시에
 * 닿았다는 기록은 없다. 화면에 그렇게 밝힌다.
 */
import { LonLat } from "../polyfront";
import { project } from "./places";

/** 규정상 변경에서 중앙까지 걸린다고 한 시간 */
export const RULE_HOURS = 12;

export interface Beacon {
  name: string;
  /** 지금 어느 시군인지 — 옛 이름만 두면 어디인지 감이 안 온다 */
  where: string;
  lon: number;
  lat: number;
  /** 국가 사적으로 지정된 봉수 유적인가 */
  heritage?: boolean;
  side?: "left" | "right";
  dy?: number;
}

/**
 * 제2로 직봉 — 위치가 확인되는 13곳.
 *
 * 다대포진 응봉에서 시작해 동해안을 따라 북상하다 영천에서 내륙으로
 * 꺾고, 죽령을 넘어 한강 유역으로 들어와 남산에서 끝난다.
 */
export const BEACONS: Beacon[] = [
  { name: "응봉", where: "부산 다대포", lon: 129.00, lat: 35.05, side: "right" },
  { name: "황령산", where: "부산", lon: 129.08, lat: 35.14, side: "right" },
  { name: "계명산", where: "양산", lon: 129.03, lat: 35.36, side: "right" },
  { name: "부로산", where: "울산", lon: 129.13, lat: 35.57, side: "right" },
  { name: "소산", where: "경주", lon: 129.21, lat: 35.76, side: "right" },
  { name: "성황당", where: "영천", lon: 128.94, lat: 35.97, heritage: true, side: "right" },
  { name: "계란현", where: "의성", lon: 128.55, lat: 36.35, heritage: true, side: "left" },
  { name: "봉지산", where: "안동", lon: 128.70, lat: 36.56, side: "right" },
  { name: "죽령", where: "영주·단양", lon: 128.43, lat: 36.90, side: "right" },
  { name: "마산", where: "충주", lon: 127.93, lat: 36.98, side: "left", dy: 16 },
  { name: "망이산", where: "안성", lon: 127.57, lat: 37.06, heritage: true, side: "left", dy: 4 },
  { name: "석성산", where: "용인", lon: 127.19, lat: 37.26, heritage: true, side: "right", dy: 12 },
  { name: "천림산", where: "성남", lon: 127.06, lat: 37.43, heritage: true, side: "right" },
  { name: "목멱산", where: "서울 남산", lon: 126.99, lat: 37.551, side: "left", dy: -26 },
];

/** 화면 좌표를 미리 박아둔다 */
export const BEACON_XY = BEACONS.map((b) => ({ ...b, ...project(b.lon, b.lat) }));

/**
 * 봉수마다 불이 붙는 시각(시간).
 *
 * 기록이 없으므로 규정 12시간을 경로 길이로 나눈다. 산을 넘는 구간이
 * 실제로는 더 걸렸겠지만 그걸 추정할 근거가 없어 길이에 비례시킨다.
 * 화면에 '규정 기준 배분'이라고 적는다.
 */
export const LIT_AT: number[] = (() => {
  const seg: number[] = [0];
  let total = 0;
  for (let i = 1; i < BEACON_XY.length; i++) {
    const a = BEACON_XY[i - 1];
    const b = BEACON_XY[i];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(total);
  }
  return seg.map((d) => (d / total) * RULE_HOURS);
})();

/** 경과 시간 → "3시간 20분" */
export function hourLabel(h: number): string {
  const t = Math.max(0, h);
  const hh = Math.floor(t);
  const mm = Math.floor((t - hh) * 60);
  if (hh === 0) return `${mm}분`;
  return mm === 0 ? `${hh}시간` : `${hh}시간 ${mm}분`;
}

/** 다음 봉수까지 이어지는 선 — 진행도만큼만 */
export function relayPath(h: number): string {
  const pts: Array<{ x: number; y: number }> = [BEACON_XY[0]];
  for (let i = 1; i < BEACON_XY.length; i++) {
    const t0 = LIT_AT[i - 1];
    const t1 = LIT_AT[i];
    if (h >= t1) {
      pts.push(BEACON_XY[i]);
      continue;
    }
    if (h > t0) {
      const f = (h - t0) / (t1 - t0);
      const a = BEACON_XY[i - 1];
      const b = BEACON_XY[i];
      pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }
    break;
  }
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
}

/** 지금 불이 붙은 봉수의 개수 */
export function litCount(h: number): number {
  let n = 0;
  for (const t of LIT_AT) if (h >= t) n++;
  return n;
}

/* ── 거화법 ─────────────────────────────────────────── */

export const SIGNALS: Array<{ n: number; means: string }> = [
  { n: 1, means: "아무 일 없다" },
  { n: 2, means: "적이 나타났다" },
  { n: 3, means: "적이 국경에 다가왔다" },
  { n: 4, means: "적이 국경을 넘었다" },
  { n: 5, means: "붙어서 싸우고 있다" },
];

/* ── 연표 ───────────────────────────────────────────── */

export interface BEvent {
  /** 불이 붙는 시각(시간) — 봉수 인덱스와 1:1 */
  at: number;
  title: string;
  detail: string;
  impact?: number;
  focus?: LonLat;
  zoom?: number;
}

export const B_EVENTS: BEvent[] = BEACONS.map((b, i) => {
  const first = i === 0;
  const last = i === BEACONS.length - 1;
  return {
    at: LIT_AT[i],
    // 이름만 두면 '마산 봉수'가 경남 마산으로 읽힌다. 지금 지명을 앞에 붙인다.
    title: first
      ? "다대포에서 불을 올리다"
      : last
        ? "목멱산 도착"
        : `${b.where} ${b.name}`,
    detail: first
      ? "봉수 둘 — 적이 나타났다는 뜻이다"
      : last
        ? "여기서 병조가 받는다. 부산에서 서울까지 규정 12시간"
        : b.heritage
          ? "국가 사적으로 지정된 제2로 직봉 봉수 유적"
          : "다음 봉수가 이 불을 보고 자기 불을 올린다",
    impact: first || last ? 1 : i === 8 ? 0.9 : 0.5,
    focus: [b.lon, b.lat] as LonLat,
    zoom: first ? 3.2 : last ? 3.0 : i === 8 ? 2.8 : 2.6,
  };
});
