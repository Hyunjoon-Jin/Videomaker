/**
 * 카메라 + 완급(pacing) 엔진.
 *
 * 첫 파일럿이 지루했던 이유는 둘이었다.
 *  1) 카메라가 고정 — 전국 뷰로만 보여 사건의 크기 차이가 안 드러난다.
 *  2) 시간이 등속 — 신립이 죽는 순간과 이동 구간이 같은 속도로 흐른다.
 *
 * 그래서 사건마다 "비트(beat)"를 두고, 비트에서는 시간을 멈추고 카메라를
 * 붙이고, 비트 사이는 빠르게 넘긴다. 영화 편집의 기본을 코드로 옮긴 것.
 */
import { REGIONS } from "./data/regions";
import { TOTAL_DAYS } from "./data/imjin";

const CENTER = new Map(REGIONS.map((r) => [r.code, { x: r.cx, y: r.cy }]));

export interface Beat {
  /** 이 비트가 가리키는 경과일 */
  day: number;
  /** 카메라가 붙을 시군구 코드. null이면 전국 뷰 */
  focus: string | null;
  /** 확대 배율 (1 = 전국) */
  zoom: number;
  /** 이 비트에서 머무는 프레임 수 */
  hold: number;
  /** 비트로 이동하는 데 쓰는 프레임 수 */
  travel: number;
  /** 충격 연출 강도 0..1 (전투 장면) */
  impact?: number;
}

/**
 * 임진왜란 20일의 비트 시트.
 * hold가 큰 곳이 이 영상이 "말하고 싶은" 지점이다.
 */
export const BEATS: Beat[] = [
  { day: 0, focus: "21030", zoom: 3.4, hold: 34, travel: 26, impact: 0.5 }, // 부산 상륙
  { day: 2, focus: "21060", zoom: 3.4, hold: 44, travel: 20, impact: 1 }, // 동래성
  { day: 8, focus: "22010", zoom: 2.3, hold: 16, travel: 40 }, // 대구
  { day: 11, focus: "37080", zoom: 2.6, hold: 38, travel: 26, impact: 0.8 }, // 상주
  { day: 15, focus: "33020", zoom: 2.9, hold: 56, travel: 26, impact: 1 }, // 탄금대
  { day: 17, focus: "11010", zoom: 2.5, hold: 40, travel: 24 }, // 선조 이탈
  { day: 20, focus: null, zoom: 1, hold: 96, travel: 34, impact: 0.9 }, // 한양 함락
];

export interface CameraState {
  viewBox: string;
  day: number;
  /** 0..1, 이번 프레임의 충격 세기 */
  impact: number;
  /** 현재(또는 직전) 비트 인덱스 */
  beatIndex: number;
}

/**
 * 홀드 중에도 군대가 나아가는 양(일).
 * 0으로 두면 선이 완전히 멈춰 "정지 화면"처럼 보인다. 극적 완급은
 * 속도를 늦춰서 만드는 것이지 세워서 만드는 게 아니다.
 */
const DWELL_DAYS = 0.4;

/**
 * 비트 시트를 프레임 구간으로 펼치되, 경과일도 같이 매긴다.
 * day는 전 구간에서 단조 증가한다 — 어느 프레임에서도 뒤로 가거나 멈추지 않는다.
 */
function layout(startFrame: number) {
  const spans: Array<{
    t0: number; t1: number; h1: number;
    dayIn: number; dayHit: number; dayOut: number;
    beat: Beat;
  }> = [];

  let f = startFrame;
  let dayCursor = BEATS[0].day;

  for (const beat of BEATS) {
    const t0 = f; // 이동 시작
    const t1 = f + beat.travel; // 도착 = 홀드 시작
    const h1 = t1 + beat.hold; // 홀드 끝

    // 홀드 동안 기어갈 목적지. 마지막 비트는 종착이므로 더 가지 않는다.
    const isLast = beat === BEATS[BEATS.length - 1];
    const dayOut = isLast ? beat.day : Math.min(beat.day + DWELL_DAYS, TOTAL_DAYS);

    spans.push({ t0, t1, h1, dayIn: dayCursor, dayHit: beat.day, dayOut, beat });
    dayCursor = dayOut;
    f = h1;
  }
  return spans;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function boxOf(focus: string | null, zoom: number): [number, number, number] {
  const c = focus ? CENTER.get(focus) : undefined;
  const size = 1000 / zoom;
  const cx = c ? c.x : 500;
  const cy = c ? c.y : 500;
  return [cx, cy, size];
}

/**
 * 프레임 → 카메라 상태.
 * 비트 사이는 카메라와 시간이 함께 이동하고, 비트 위에서는 둘 다 멈춘다.
 */
export function cameraAt(frame: number, startFrame: number): CameraState {
  const spans = layout(startFrame);

  // 시작 전: 첫 비트에 고정
  if (frame <= spans[0].t0) {
    const [cx, cy, s] = boxOf(BEATS[0].focus, BEATS[0].zoom);
    return { viewBox: vb(cx, cy, s), day: 0, impact: 0, beatIndex: 0 };
  }

  for (let i = 0; i < spans.length; i++) {
    const { t0, t1, h1, dayIn, dayHit, dayOut, beat } = spans[i];
    const prev = i === 0 ? beat : spans[i - 1].beat;

    if (frame <= t1) {
      // 이동 중 — 카메라는 이징, 경과일은 등속(군대가 갑자기 빨라지면 어색하다)
      const raw = (frame - t0) / Math.max(1, t1 - t0);
      const k = easeInOut(raw);
      const [ax, ay, as] = boxOf(prev.focus, prev.zoom);
      const [bx, by, bs] = boxOf(beat.focus, beat.zoom);
      return {
        viewBox: vb(ax + (bx - ax) * k, ay + (by - ay) * k, as + (bs - as) * k),
        day: dayIn + (dayHit - dayIn) * raw,
        impact: 0,
        beatIndex: i,
      };
    }

    if (frame <= h1) {
      // 홀드 중 — 카메라는 고정, 군대는 느리게 계속 전진
      const [cx, cy, s] = boxOf(beat.focus, beat.zoom);
      const since = (frame - t1) / Math.max(1, beat.hold);
      return {
        viewBox: vb(cx, cy, s),
        day: dayHit + (dayOut - dayHit) * since,
        impact: (beat.impact ?? 0) * Math.max(0, 1 - since * 4),
        beatIndex: i,
      };
    }
  }

  const last = BEATS[BEATS.length - 1];
  const [cx, cy, s] = boxOf(last.focus, last.zoom);
  return { viewBox: vb(cx, cy, s), day: last.day, impact: 0, beatIndex: BEATS.length - 1 };
}

const vb = (cx: number, cy: number, size: number) =>
  `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;

/** 비트 시트 전체 길이(프레임) */
export function totalFrames(startFrame: number): number {
  const spans = layout(startFrame);
  return spans[spans.length - 1].h1;
}
