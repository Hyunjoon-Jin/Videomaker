/**
 * 채널 표식용 지구 — 어느 땅도 아닌 지도.
 *
 * 처음 아이콘과 배너는 한반도 실루엣과 한반도 철도망이었다. 지금까지 만든
 * 네 편이 전부 한반도라 자연스러워 보였지만, 그건 표식이 아니라 목록이다.
 * 다음에 다른 땅을 다루는 순간 채널 얼굴부터 거짓말이 된다.
 *
 * 그래서 땅을 지우고 격자만 남긴다. 경위선은 어느 지도에나 있고 어느
 * 지역도 가리키지 않는다. 이 채널이 매번 하는 일 — 지도를 깔고 그 위로
 * 선 하나를 시간에 따라 움직이는 것 — 만 남는다.
 *
 * 정사도법을 쓴다. 지구를 밖에서 본 모습이라 격자가 가장자리로 갈수록
 * 촘촘해져서, 평면 격자와 달리 한눈에 '구'로 읽힌다.
 */

import { smooth } from "./front";

/** 시선 중심 위도. 0이면 위선이 직선이 되어 격자가 밋밋해진다. */
const LAT0 = (32 * Math.PI) / 180;
const S0 = Math.sin(LAT0);
const C0 = Math.cos(LAT0);

export interface GPoint {
  x: number;
  y: number;
  /** 지구 반대편이면 false — 뒷면 선을 그리면 격자가 뭉개진다 */
  front: boolean;
}

/** 위경도(도) → 반지름 r, 중심 (cx, cy)인 정사도법 좌표 */
export function orth(
  lon: number,
  lat: number,
  r: number,
  cx: number,
  cy: number
): GPoint {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const cosc = S0 * Math.sin(la) + C0 * Math.cos(la) * Math.cos(lo);
  return {
    x: cx + r * Math.cos(la) * Math.sin(lo),
    y: cy - r * (C0 * Math.sin(la) - S0 * Math.cos(la) * Math.cos(lo)),
    front: cosc >= 0,
  };
}

/**
 * 점열을 앞면 구간만 잘라 path로 만든다.
 * 뒷면까지 이으면 지구를 관통하는 직선이 생겨 격자가 아니라 실뭉치가 된다.
 */
function frontPath(pts: GPoint[]): string {
  let d = "";
  let pen = false;
  for (const p of pts) {
    if (!p.front) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** 경위선 격자 — step도 간격 */
export function graticule(
  r: number,
  cx: number,
  cy: number,
  step = 30
): string[] {
  const out: string[] = [];
  // 위선
  for (let lat = -60; lat <= 60; lat += step) {
    const pts: GPoint[] = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(orth(lon, lat, r, cx, cy));
    const d = frontPath(pts);
    if (d) out.push(d);
  }
  // 경선
  for (let lon = -180; lon < 180; lon += step) {
    const pts: GPoint[] = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(orth(lon, lat, r, cx, cy));
    const d = frontPath(pts);
    if (d) out.push(d);
  }
  return out;
}

/**
 * 자취 — 지구 위를 지나는 선 하나.
 *
 * 이 채널의 네 편은 소재가 다 다르지만 화면에서 하는 일은 같다. 전선이든
 * 태풍 경로든 철길이든, 지도 위의 선 하나가 시간에 따라 움직인다. 표식에
 * 남길 것은 그 선이지 그 선이 무엇이었는지가 아니다.
 */
export function trackPath(
  pts: Array<[number, number]>,
  r: number,
  cx: number,
  cy: number
): string {
  // 제어점을 곧게 이으면 꺾이는 자리마다 각이 져서 자취가 아니라
  // 꺾은선 그래프가 된다. 본편의 노선·전선과 같은 곡선을 먼저 먹인다.
  // 위경도 공간에서 부드럽게 만든 뒤 투영해야 구면을 따라 휜다.
  const curve = smooth(pts, 16);
  return frontPath(curve.map(([lo, la]) => orth(lo, la, r, cx, cy)));
}
