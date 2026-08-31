import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BIG, HOLD, PXKM, SMALL, STEPS, UNITS } from "./data/small";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, OUTRO_PAD, SAFE_RIGHT, TEXT_X } from "./safe";

const HOOK = Math.round(2.5 * FPS);

const BG = "#0E1418";
/** 나머지 전국 */
const LAND = "#2F2820";
/** 이번 시·군·구 */
const HOT = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";
/** 1km² 격자 */
const GRID = "#3A342B";

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  HOLD.forEach((h) => {
    const len = Math.round(h * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(7.0 * FPS);
export const SMALL_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

/** 도형이 앉는 자리. 격자도 여기를 중심으로 깐다 */
const CX = 540;
const CY = 880;

/** 도형이 바뀌는 데 걸리는 시간 */
const SWAP = Math.round(0.7 * FPS);

/**
 * 다섯을 마무리에서 한 줄로 늘어놓을 때 각자의 가로 자리(km).
 *
 * 1위가 왼쪽 끝이다. 오른쪽으로 갈수록 커진다.
 */
const ROW: number[] = [];
{
  const gap = 0.7;
  let x = 0;
  const order = [...SMALL].sort((a, b) => a.area - b.area);
  const at = new Map<string, number>();
  order.forEach((u) => {
    at.set(u.name + u.sido, x + u.w / 2);
    x += u.w + gap;
  });
  const mid = x / 2;
  SMALL.forEach((u) => ROW.push((at.get(u.name + u.sido) ?? 0) - mid));
}

/** 전국 지도에서 이번 다섯 곳이 어디인지 (prep-small.py가 찍어 준다) */
const DOTS = SMALL.map((u) => u.at);

export const ShortsSmall: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const c = STEPS[bi];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const age = frame - SLOTS[bi].t0;

  /** 도형이 자리를 잡는 정도 */
  const settle = interpolate(age, [0, SWAP], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /**
   * 마무리에서 축척이 줄어드는 정도.
   *
   * 홍천군은 가로 92km다. 걸음의 128px/km로 그리면 화면의 13배라
   * 축척을 여기까지 줄여야 한 화면에 들어온다.
   */
  const outPx = 840 / BIG.w;
  const zoom = interpolate(
    frame,
    [BODY_END, BODY_END + Math.round(2.2 * FPS)],
    [PXKM, outPx],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const k = inOutro ? zoom : PXKM;
  const spread = interpolate(
    frame,
    [BODY_END, BODY_END + Math.round(2.2 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const outroIn = interpolate(
    frame,
    [BODY_END + Math.round(2.0 * FPS), BODY_END + Math.round(2.9 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 1km² 격자. 축척이 줄면 촘촘해지다 사라진다 */
  const gridOn = interpolate(k, [40, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 격자가 닿는 자리. 글자 자리를 넘으면 안 읽힌다 */
  const GX0 = 40, GX1 = 1040, GY0 = 400, GY1 = 1330;
  const vs: number[] = [];
  const hs: number[] = [];
  for (let i = -20; i <= 20; i++) {
    if (CX + i * k >= GX0 && CX + i * k <= GX1) vs.push(i);
    if (CY + i * k >= GY0 && CY + i * k <= GY1) hs.push(i);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sm.wav")} volume={0.85} />

      {/* ── 1km² 격자 ──
          축척이 고정이라는 것을 격자가 스스로 증명한다. 몇 칸을
          덮는지가 눈으로 세어져서, 넓이를 글자로 다시 말할 필요가 없다 */}
      {started && gridOn > 0 && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <g stroke={GRID} strokeWidth={1.5} opacity={gridOn * 0.9}>
            {vs.map((i) => (
              <line
                key={"v" + i}
                x1={CX + i * k}
                x2={CX + i * k}
                y1={GY0}
                y2={GY1}
              />
            ))}
            {hs.map((i) => (
              <line
                key={"h" + i}
                x1={GX0}
                x2={GX1}
                y1={CY + i * k}
                y2={CY + i * k}
              />
            ))}
          </g>
        </svg>
      )}

      {/* ── 도형 ── */}
      {started && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* 마무리에서 나타나는 가장 큰 곳 */}
          {inOutro && (
            <g
              transform={`translate(${CX} ${CY}) scale(${k})`}
              opacity={interpolate(spread, [0.25, 0.7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            >
              {BIG.d.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={LAND}
                  stroke={DIM}
                  strokeWidth={2 / k}
                />
              ))}
            </g>
          )}

          {/* 지나온 순위는 윤곽으로 겹쳐 남는다.
              도형이 줄어드는 것은 나란히 놓아서는 잘 안 보인다 —
              인천 동구(7.2)가 부산 동구(10.1)보다 가로로 길어서다.
              한자리에 겹쳐야 안쪽으로 오므라드는 게 눈에 박힌다 */}
          {!inOutro &&
            STEPS.slice(0, bi).map((u) => (
              <g
                key={"g" + u.name + u.sido}
                transform={`translate(${CX} ${CY}) scale(${k})`}
              >
                {u.d.map((d, j) => (
                  <path
                    key={j}
                    d={d}
                    fill="none"
                    stroke={HOT}
                    strokeWidth={2 / k}
                    opacity={0.45}
                  />
                ))}
              </g>
            ))}

          {/* 걸음에서는 지금 차례 하나만, 마무리에서는 다섯이 한 줄로 */}
          {(inOutro ? SMALL : [c]).map((u, i) => {
            const dx = inOutro ? ROW[i] * k * spread : 0;
            return (
              <g
                key={u.name + u.sido}
                transform={`translate(${CX + dx} ${CY}) scale(${k})`}
                opacity={inOutro ? 1 : settle}
              >
                {u.d.map((d, j) => (
                  <path
                    key={j}
                    d={d}
                    fill={HOT}
                    stroke={INK}
                    strokeWidth={1.5 / k}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      )}

      {/* ── 순위 · 이름 · 넓이 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 66,
            opacity: settle,
          }}
        >
          <div
            style={{
              color: HOT,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.rank}위
          </div>
          <div
            style={{
              color: INK,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.1,
              marginTop: 4,
              textShadow: `0 0 40px ${BG}`,
            }}
          >
            {c.sido} {c.name}
          </div>
          <div
            style={{
              color: INK,
              fontSize: 56,
              fontWeight: 900,
              marginTop: 6,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.area.toFixed(3)}km²
          </div>
        </div>
      )}

      {/* 화면 고지 — 무엇이 기록이고 무엇이 근사인지 */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 18,
            color: DIM,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          격자 한 칸 1km² · 지적통계 2024
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
            opacity: outroIn,
          }}
        >
          <div
            style={{
              color: DIM,
              fontSize: 27,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            국토교통부 지적통계 2024 · 시·군·구 {UNITS}곳
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 132,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              marginTop: 10,
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 0 40px ${BG}`,
            }}
          >
            {Math.round(BIG.area / SMALL[0].area)}배
          </div>
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              lineHeight: 1.24,
              marginTop: 12,
            }}
          >
            <div>
              {SMALL[0].sido} {SMALL[0].name} {SMALL[0].area}km²
            </div>
            <div>
              {BIG.sido} {BIG.name} {BIG.area.toLocaleString()}km²
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill style={{ opacity: hookOut }}>
            <svg
              viewBox="0 0 1000 1000"
              style={{
                position: "absolute",
                left: 40,
                top: 380,
                width: 1000,
                height: 1000,
              }}
            >
              {REGIONS.map((r) => (
                <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={1} />
              ))}
              {DOTS.map((d, i) =>
                d ? <circle key={i} cx={d[0]} cy={d[1]} r={9} fill={HOT} /> : null
              )}
            </svg>
          </AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: BOTTOM_INSET + 60,
              opacity: hookOut,
            }}
          >
            <div
              style={{
                color: HOT,
                fontSize: 138,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              3km²
            </div>
            <div
              style={{
                color: INK,
                fontSize: 50,
                fontWeight: 900,
                lineHeight: 1.22,
                marginTop: 14,
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              <div>전국에서 가장 작은</div>
              <div>시·군·구</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
