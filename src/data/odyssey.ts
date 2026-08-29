/**
 * 오디세우스가 10년을 어떻게 보냈나 (scripts/prep-odyssey.py 산출물).
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
  title: string;
  sub: string;
  days: number;
  /** 권.행 */
  cite: string;
  /** 막대가 이 항목까지 찬다 */
  upto: number;
  route: [number, number][];
  at: [number, number];
  stops: string[];
}

export interface Slice {
  /** 항해 · 붙잡힘 · 뭍 */
  kind: string;
  name: string;
  days: number;
  cite: string;
}

export const LAND = raw.land as string;
export const STOPS = raw.stops as unknown as Stop[];
export const BEATS = raw.beats as unknown as Beat[];
export const BAR = raw.bar as unknown as Slice[];

/** 본문에 날수가 적힌 것의 합 */
export const TOLD = raw.toldDays as number;
/** 귀환 10년 */
export const TOTAL = raw.returnDays as number;
export const SAIL = raw.sailDays as number;
export const HELD = raw.heldDays as number;

/** 막대의 누적 */
export const CUM: number[] = BAR.reduce<number[]>((a, s) => {
  a.push((a.length ? a[a.length - 1] : 0) + s.days);
  return a;
}, []);

/** 한 자리에 머무는 시간(초) */
export const HOLD = [4.4, 4.2, 4.6, 4.0, 5.0, 4.2, 6.4, 5.2];

/**
 * 자리.
 *
 * 이 편은 막대가 주인공이다. 그래서 눈이 위에서 아래로 숫자 → 막대 →
 * 지도로 내려가게 놓는다. 지도를 위에 두면 막대가 곁다리로 보인다.
 */
export const BAR_Y = 624;
export const MAP = { top: 790, scale: 0.74, left: 170 };
