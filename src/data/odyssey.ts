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
  /** 거기서 누구를 만나 무슨 일이 있었는지. 두 줄 */
  what: [string, string];
  /** 권.행 */
  cite: string;
  route: [number, number][];
  at: [number, number];
  /** 이름표를 붙일 자리. 제목이 가리키는 곳이다 */
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
 * 한 자리에 머무는 시간(초).
 *
 * 두 줄을 읽을 시간이다. 서른 자 남짓이라 배가 옮겨 가는 0.8초를 빼고도
 * 3초는 있어야 한다.
 */
export const HOLD = [
  3.8, 3.8, 4.2, 3.8, 4.0, 4.0, 4.2, 3.8, 4.2, 3.8, 4.2, 3.8,
];

/**
 * 지도 자리.
 *
 * 이 편은 **동선이 주인공이다.** 지도를 화면 폭까지 키우고 글자는
 * 위아래 띠로 민다.
 */
export const MAP = { top: 420, scale: 1.023, left: 28 };
