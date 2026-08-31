import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BIG, HOLD, KMU, PXKM, SMALL, STEPS, UNITS } from "./data/small";
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
const GRID = "#544B3C";
/** 마무리에 켜지는 가장 큰 곳 */
const BIGF = "#8A755A";

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

/* ── 카메라 ──────────────────────────────────────────
   전국 지도 위를 날아 그 자리로 간다. **머무는 배율은 다섯 걸음이
   똑같다** — 배율이 걸음마다 달라지면 크기를 못 견준다.

   옮겨 갈 때만 잠깐 빠졌다가 같은 배율로 다시 붙는다. 부산에서
   서울까지 330km를 붙은 채로 밀면 화면이 뭉개진다. */

/** 머물 때 화면에 담기는 가로 폭(지도 단위). 1km가 PXKM px이 된다 */
const NEAR_W = (1080 / PXKM) / KMU;
/** 전국이 다 보이는 폭 */
const WIDE_W = 980;
const ASPECT = 1920 / 1080;

/**
 * 카메라가 겨누는 자리가 화면 세로 어디에 오는지.
 *
 * 한가운데(960)에 두면 아래 글자 블록이 도형 밑동을 덮는다.
 * 조금 올려 앉힌다.
 */
const CENTER_Y = 840;

/** 옮겨 가는 데 걸리는 시간 */
const FLY = Math.round(1.1 * FPS);

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

interface Cam {
  cx: number;
  cy: number;
  w: number;
}

const AT: Cam[] = STEPS.map((u) => ({ cx: u.cx, cy: u.cy, w: NEAR_W }));
const WIDE: Cam = { cx: 500, cy: 470, w: WIDE_W };

/**
 * 두 자리 사이를 잇는다.
 *
 * 폭은 로그로 섞는다. 그냥 섞으면 좁은 쪽에서 너무 오래 머물러
 * 움직임이 뚝뚝 끊긴다.
 *
 * `arc`는 옮겨 가는 중간에 얼마나 빠지는지다. 멀수록 크게 뺀다 —
 * 붙은 채로 330km를 밀면 화면이 뭉개진다.
 */
function blend(a: Cam, b: Cam, t: number, arc: number): Cam {
  const e = ease(t);
  const lift = Math.sin(Math.PI * e) * arc;
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e + lift),
  };
}

/** 두 자리가 먼 만큼 크게 뺀다. 이웃한 부산 두 구는 거의 안 뺀다 */
function arcOf(a: Cam, b: Cam): number {
  const d = Math.hypot(b.cx - a.cx, b.cy - a.cy);
  return Math.log(1 + d / NEAR_W) * 0.62;
}

function camAt(frame: number): Cam {
  if (frame < HOOK) return WIDE;
  if (frame >= BODY_END) {
    // 1위에서 전국까지 한 번에 빠진다. 빠지는 동안 부산 중구가
    // 점이 되고 홍천군이 들어차는 것이 곧 598배다
    const t = (frame - BODY_END) / Math.round(2.8 * FPS);
    return blend(AT[AT.length - 1], WIDE, t, 0);
  }
  const i = beatAt(frame);
  const from = i === 0 ? WIDE : AT[i - 1];
  const t = (frame - SLOTS[i].t0) / FLY;
  return blend(from, AT[i], t, i === 0 ? 0 : arcOf(from, AT[i]));
}

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
  const settle = interpolate(age, [FLY - 8, FLY + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(
    frame,
    [BODY_END + Math.round(1.8 * FPS), BODY_END + Math.round(2.7 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cam = camAt(frame);
  const camH = cam.w * ASPECT;
  /** 화면 1px에 해당하는 지도 단위 */
  const px = cam.w / 1080;
  const viewBox = `${cam.cx - cam.w / 2} ${cam.cy - CENTER_Y * px} ${cam.w} ${camH}`;

  /** 1km² 격자. 붙었을 때만 켠다 — 빠지면 촘촘해져 뭉갠다 */
  const gridOn = interpolate(cam.w, [NEAR_W * 1.15, NEAR_W * 2.2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cell = 1 / KMU;
  const lines: number[] = [];
  for (let i = -9; i <= 9; i++) lines.push(i);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sm.wav")} volume={0.85} />

      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* 전국. 성기게 줄인 지도라 바탕으로만 쓴다 */}
        {REGIONS.map((r) => (
          <path
            key={r.code}
            d={r.d}
            fill={LAND}
            stroke={BG}
            strokeWidth={px}
          />
        ))}

        {/* 1km² 격자.
            축척이 고정이라는 것을 격자가 스스로 증명한다. 몇 칸을
            덮는지가 세어져서 넓이를 글자로 다시 말할 필요가 없다 */}
        {gridOn > 0 && (
          <g stroke={GRID} strokeWidth={px * 1.5} opacity={gridOn * 0.85}>
            {lines.map((i) => (
              <line
                key={"v" + i}
                x1={c.cx + i * cell}
                x2={c.cx + i * cell}
                y1={c.cy - 9 * cell}
                y2={c.cy + 9 * cell}
              />
            ))}
            {lines.map((i) => (
              <line
                key={"h" + i}
                x1={c.cx - 9 * cell}
                x2={c.cx + 9 * cell}
                y1={c.cy + i * cell}
                y2={c.cy + i * cell}
              />
            ))}
          </g>
        )}

        {/* 마무리에서 켜지는 가장 큰 곳 */}
        {inOutro &&
          BIG.d.map((d, i) => (
            <path
              key={"b" + i}
              d={d}
              fill={BIGF}
              stroke={INK}
              strokeWidth={px * 1.5}
              opacity={outroIn}
            />
          ))}

        {/* 지나온 순위는 윤곽으로 이번 자리에 겹쳐 남는다.
            나란히 놓아서는 줄어드는 게 안 보인다 — 인천 동구(7.2)가
            부산 동구(10.1)보다 가로로 길어서 3위가 5위보다 커 보인다.
            한자리에 겹쳐야 안쪽으로 오므라드는 게 눈에 박힌다 */}
        {!inOutro &&
          STEPS.slice(0, bi).map((u) => (
            <g
              key={"g" + u.name + u.sido}
              transform={`translate(${c.cx - u.cx} ${c.cy - u.cy})`}
              opacity={0.32 * settle}
            >
              {u.d.map((d, j) => (
                <path
                  key={j}
                  d={d}
                  fill="none"
                  stroke={HOT}
                  strokeWidth={px * 2}
                />
              ))}
            </g>
          ))}

        {/* 이번 자리 — 또는 마무리에서는 다섯 다 */}
        {started &&
          (inOutro ? SMALL : [c]).map((u) =>
            u.d.map((d, j) => (
              <path
                key={u.name + u.sido + j}
                d={d}
                fill={HOT}
                stroke={INK}
                strokeWidth={px * 1.5}
              />
            ))
          )}

        {/* 다 빠지고 나면 다섯은 몇 px밖에 안 된다. 어디 있는지는
            보여야 하니 화면 크기가 고정인 점을 얹는다 */}
        {inOutro &&
          SMALL.map((u) => (
            <circle
              key={"p" + u.name + u.sido}
              cx={u.cx}
              cy={u.cy}
              r={px * 13}
              fill="none"
              stroke={HOT}
              strokeWidth={px * 5}
              opacity={outroIn}
            />
          ))}
      </svg>

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
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
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
              textShadow: `0 0 30px ${BG}`,
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
            background:
              "linear-gradient(180deg, rgba(14,20,24,0) 55%," +
              " rgba(14,20,24,0.92) 70%, rgba(14,20,24,0.98) 78%)",
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
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
