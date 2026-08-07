export const FPS = 30;

/** 쇼츠 규격 (9:16) */
export const SHORT_W = 1080;
export const SHORT_H = 1920;

export const C = {
  bg: "#0B0E14",
  bgSoft: "#121722",
  text: "#F2F5FA",
  dim: "#8A94A6",
  line: "#1E2530",

  /** 증가 (수도권 집중) */
  grow: "#3B82F6",
  growHot: "#60A5FA",
  /** 감소 (지방 소멸) */
  drop: "#DC2626",
  dropHot: "#F87171",
  /** 변화 없음 */
  flat: "#2A3241",

  warn: "#F59E0B",
} as const;

/**
 * 증감률(-1..+1 이상) → 색.
 * 음수는 붉게(감소), 양수는 푸르게(증가). 0 근처는 회색.
 */
export function rampColor(ratio: number): string {
  const t = Math.max(-1, Math.min(1, ratio));
  if (t < -0.02) {
    const k = Math.min(1, -t / 0.6); // 0..1
    return mix(C.flat, C.drop, k * 0.85 + 0.15);
  }
  if (t > 0.02) {
    const k = Math.min(1, t / 1.2);
    return mix(C.flat, C.grow, k * 0.85 + 0.15);
  }
  return C.flat;
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hex(h: string): number[] {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
