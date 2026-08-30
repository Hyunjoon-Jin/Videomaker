/**
 * 오디세우스의 동선 (scripts/prep-odyssey.py 산출물).
 *
 * 좌표는 지중해 상자를 가로 1000으로 맞춘 투영이다.
 */
import raw from "./odyssey.json";

export interface Stop {
  name: string;
  x: number;
  y: number;
  /** 본문의 실재 지명이면 true. 널리 쓰이는 비정이면 false */
  sure: boolean;
  note: string;
}

export interface Beat {
  /** 그 자리의 이름 */
  title: string;
  /**
   * 거기서 누구를 만나 무슨 일이 있었는지.
   *
   * 두세 줄이다. 조사를 다 붙이고 서술어로 닫는다 —
   * 「배마다 6명」이 아니라 「각 선박마다 6명의 선원을 잃다」.
   */
  what: string[];
  /** 권.행 */
  cite: string;
  route: [number, number][];
  at: [number, number];
  /** 이름표를 붙일 자리. 배가 멈춘 자리와 다를 수 있다 */
  mark: [number, number];
  stops: string[];
  /** 그 걸음이 끝났을 때 남은 배 */
  ships: number;
}

/**
 * 육지. 나라마다 따로 그린다.
 *
 * 한 path로 이었더니 nonzero 규칙 때문에 감기 방향이 다른 나라끼리
 * 서로 지워서, 이탈리아와 그리스가 통째로 바다색이 됐다.
 */
export const LAND = raw.land as string[];
export const STOPS = raw.stops as unknown as Stop[];
export const BEATS = raw.beats as unknown as Beat[];
/** 트로이를 떠날 때 배 12척 (9.159) */
export const SHIPS = raw.ships as number;

/**
 * 마지막 이타카행. 걸음으로 안 세운다.
 *
 * 파이아케스인들이 잠든 오디세우스를 배에 실어다 놓는 대목이라
 * 「무슨 일이 있었는지」로 적을 것이 없다. 마무리에서 길만 이어
 * 동선을 닫는다.
 */
export const LAST = raw.last as [number, number][];

/**
 * 한 자리에 머무는 시간(초).
 *
 * 글자 수로 정한다. 걸음마다 사건 길이가 달라서 고정값으로 두면
 * 긴 줄은 못 읽고 짧은 줄은 늘어진다. 초당 8자에, 배가 옮겨 가는
 * 0.8초와 여유 0.1초를 더한다.
 */
export const HOLD = BEATS.map(
  (b) => Math.round((b.what.join("").length / 8 + 0.9) * 10) / 10
);

/**
 * 지도 자리.
 *
 * 이 편은 **동선이 주인공이다.** 지도를 화면 폭까지 키우고 글자는
 * 위아래 띠로 민다.
 */
export const MAP = { top: 420, scale: 1.023, left: 28 };
