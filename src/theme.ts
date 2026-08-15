export const FPS = 30;

/** 쇼츠 규격 (9:16) */
export const SHORT_W = 1080;
export const SHORT_H = 1920;

/**
 * 팔레트.
 *
 * 처음 쓴 색들(#3B82F6 #DC2626 #F87171 #FBBF24 #A78BFA #34D399)은
 * Tailwind 기본 스와치를 그대로 가져온 것이었다. 어두운 청회색 배경에
 * 이 형광색 조합은 지금 웹에 널린 자동생성 대시보드의 인장 같은 배색이라,
 * 내용과 상관없이 화면이 먼저 '기계가 만든 것'으로 읽힌다.
 *
 * 그래서 인쇄된 지도 쪽으로 옮겼다. 배경은 청색이 아니라 따뜻한 먹색,
 * 글자는 순백이 아니라 뼈색, 강조는 형광이 아니라 안료색(산화철 붉은색,
 * 삭은 쪽빛, 놋쇠)이다. 채도를 낮추면 지도가 살고 숫자가 튀지 않는다.
 */
export const C = {
  bg: "#151310",
  bgSoft: "#1E1A15",
  text: "#EDE5D4",
  dim: "#8E8474",
  line: "#2C261E",

  /** 증가 (수도권 집중) */
  grow: "#4C7A9B",
  growHot: "#7FA8C4",
  /** 감소 (지방 소멸) */
  drop: "#B33A2B",
  dropHot: "#D4694F",
  /** 변화 없음 */
  flat: "#332D25",

  warn: "#C08A2E",
} as const;

/** 안료 이름으로 부르는 강조색 — 화면마다 같은 통에서 꺼내 쓴다 */
export const INK = {
  oxide: "#B33A2B",   // 산화철 붉은색
  oxideHot: "#D4694F",
  indigo: "#4C7A9B",  // 삭은 쪽빛
  indigoHot: "#7FA8C4",
  brass: "#C09240",   // 놋쇠
  olive: "#7C8B52",   // 국방색
  /** 봉수 편 — 밤에 켜진 불과 그 잔불 */
  flame: "#FFC96B",
  ember: "#D9741F",
  bone: "#EDE5D4",
  ash: "#8E8474",
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
