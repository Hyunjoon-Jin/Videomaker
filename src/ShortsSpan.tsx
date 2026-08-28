import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  CASES, FLY_SEC, HOLD, LINES, MAXS, RULER, TABLE, WIDE, WIDE_OUT,
} from "./data/span";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/** 바탕이 바다다 — 섬이 주인공인 편이라 땅과 물이 갈려야 한다 */
const BG = "#101519";
/** 나머지 전국 */
const LAND = "#2F2820";
/** 이번 시·군 */
const HOT = "#D4694F";
/** 자 — 남한에서 제일 넓은 군 */
const RULE = "#7FA8C4";
const INK = "#EDE5D4";
const DIM = "#8E8474";

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
export const SPAN_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

const ASPECT = 1920 / 1080;

/* ── 카메라 ────────────────────────────────────────
   훅은 전국, 본문은 시·군마다 붙고, 마무리에 다시 전국으로 빠진다.
   z는 로그로 보간한다 — 선형이면 앞이 훅 커지고 뒤가 기어간다. */
const FLY = Math.round(FLY_SEC * FPS);

type Cam = { cx: number; cy: number; z: number };

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function blend(from: Cam, to: Cam, t: number): Cam {
  const e = ease(t);
  return {
    cx: from.cx + (to.cx - from.cx) * e,
    cy: from.cy + (to.cy - from.cy) * e,
    z: Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e),
  };
}

function camAt(frame: number): Cam {
  if (frame >= BODY_END) {
    return blend(CASES[CASES.length - 1].cam, WIDE_OUT, (frame - BODY_END) / FLY);
  }
  if (frame < HOOK) return WIDE;
  const i = beatAt(frame);
  const from = i === 0 ? WIDE : CASES[i - 1].cam;
  return blend(from, CASES[i].cam, (frame - SLOTS[i].t0) / FLY);
}

/* ── 막대 ──────────────────────────────────────────
   지도 위 선은 방향이 제각각이라 길이를 눈으로 못 견준다.
   가로 막대 하나가 그 일을 한다. 자(홍천군)는 세로 눈금으로
   남아 있어서 '얼마나 더 긴가'가 숫자 없이 읽힌다. */
const BAR_L = TEXT_X;
const BAR_R = 1080 - SAFE_RIGHT;
const BAR_Y = 648;
const BAR_H = 26;
const barX = (km: number) => BAR_L + (km / MAXS) * (BAR_R - BAR_L);

export const ShortsSpan: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const c = CASES[bi];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const age = frame - SLOTS[bi].t0;
  const on = interpolate(age, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 선과 막대가 뻗어 나가는 진행도. 카메라가 앉은 뒤에 시작한다 */
  const run = interpolate(age, [FLY - 4, FLY + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = camAt(frame);
  const camW = 1000 / cam.z;
  const camH = camW * ASPECT;
  const viewBox = `${cam.cx - camW / 2} ${cam.cy - camH / 2} ${camW} ${camH}`;
  /** 화면 1px에 해당하는 지도 단위 — 선 굵기와 글자를 화면 기준으로 잡는다 */
  const px = camW / 1080;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sp.wav")} volume={0.85} />

      {/* ── 지도 — 0프레임부터 전국이 떠 있다. 카메라만 옮겨 앉는다 ── */}
      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={px} />
        ))}

        {/* 지나온 시·군은 옅게 남는다 */}
        {CASES.map((x, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          // 마무리에서는 1위가 켜진 채로 남는다
          const lit = inOutro ? i === CASES.length - 1 : i === bi;
          return (
            <path
              key={x.name}
              d={x.d}
              fill={lit ? HOT : "#6B4A3E"}
              fillOpacity={lit && !inOutro ? 0.55 + on * 0.45 : 0.75}
              stroke={lit ? HOT : "#6B4A3E"}
              strokeWidth={px * 1.6}
            />
          );
        })}

        {/* 지나온 선도 남는다 — 길이가 쌓이는 게 이 편의 그림이다 */}
        {CASES.map((x, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          const cur = inOutro ? i === CASES.length - 1 : i === bi;
          const g = cur && !inOutro ? run : 1;
          const [a, b] = x.line;
          return (
            <g key={"l" + x.name}>
              <line
                x1={a[0]}
                y1={a[1]}
                x2={a[0] + (b[0] - a[0]) * g}
                y2={a[1] + (b[1] - a[1]) * g}
                stroke={cur ? INK : "#5E5648"}
                strokeWidth={px * (cur ? 5 : 3)}
                opacity={cur ? 0.95 : 0.7}
              />
              <circle cx={a[0]} cy={a[1]} r={px * (cur ? 9 : 5)} fill={cur ? INK : "#5E5648"} />
              <circle
                cx={b[0]}
                cy={b[1]}
                r={px * (cur ? 9 : 5)}
                fill={cur ? INK : "#5E5648"}
                opacity={cur ? g : 1}
              />
            </g>
          );
        })}

        {/* 두 끝 이름표. 카메라가 붙어 있으니 점 옆에 바로 적는다 */}
        {started &&
          !inOutro &&
          c.line.map((p, k) => {
            const nm = c.ends[k];
            if (!nm) return null;
            const t = (p[0] - (cam.cx - camW / 2)) / camW;
            const anchor = t < 0.24 ? "start" : t > 0.76 ? "end" : "middle";
            const dx = (anchor === "start" ? 16 : anchor === "end" ? -16 : 0) * px;
            // 선을 등지는 쪽에 붙인다. 그 자리가 막대나 화면 밖이면 반대로
            const q = c.line[1 - k];
            const sy = ((p[1] - (cam.cy - camH / 2)) / camH) * 1920;
            let down = p[1] >= q[1];
            const at = (d: boolean) => sy + (d ? 52 : -30);
            if (at(down) > 1660 || at(down) < 760) down = !down;
            return (
              <text
                key={"n" + nm}
                x={p[0] + dx}
                y={p[1] + (down ? 52 : -30) * px}
                fontSize={40 * px}
                fontWeight={900}
                fill={INK}
                textAnchor={anchor}
                stroke={BG}
                strokeWidth={7 * px}
                paintOrder="stroke"
                opacity={k === 0 ? on : run}
              >
                {nm}
              </text>
            );
          })}
      </svg>

      {/* 위아래 글자 자리를 눌러 지도가 글씨를 안 갉아먹게 한다 */}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${BG} 0%, ${BG}E0 22%, ${BG}00 44%,` +
            ` ${BG}00 68%, ${BG}CC 86%, ${BG}F2 100%)`,
        }}
      />

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div
          style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {c.name}
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.span.toFixed(1)}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 8 }}>km</span>
            {/* 이 숫자가 무엇인지는 첫 걸음에서 한 번만 밝힌다 */}
            {bi === 0 ? (
              <span
                style={{ color: DIM, fontSize: 32, fontWeight: 700, marginLeft: 18 }}
              >
                이 끝에서 저 끝
              </span>
            ) : null}
          </div>
          <div style={{ color: INK, fontSize: 36, fontWeight: 800, marginTop: 8 }}>
            {c.area.toLocaleString("en-US")}km² · {c.parts}조각
          </div>
        </div>
      )}

      {/* ── 막대 ── */}
      {started && !inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <rect
            x={BAR_L - 20}
            y={BAR_Y - 34}
            width={BAR_R - BAR_L + 40}
            height={BAR_H + 78}
            rx={10}
            fill={BG}
            opacity={0.7}
          />
          {/* 지나온 것 */}
          {CASES.map((x, i) =>
            i >= bi || frame < SLOTS[i].t0 ? null : (
              <rect
                key={"b" + x.name}
                x={BAR_L}
                y={BAR_Y}
                width={barX(x.span) - BAR_L}
                height={BAR_H}
                fill="#3A342B"
              />
            )
          )}
          <rect
            x={BAR_L}
            y={BAR_Y}
            width={(barX(c.span) - BAR_L) * run}
            height={BAR_H}
            fill={HOT}
          />
          {/* 자 — 남한에서 제일 넓은 군의 지름 */}
          <line
            x1={barX(RULER.span)}
            y1={BAR_Y - 20}
            x2={barX(RULER.span)}
            y2={BAR_Y + BAR_H + 12}
            stroke={RULE}
            strokeWidth={3}
          />
          <text
            x={barX(RULER.span)}
            y={BAR_Y + BAR_H + 40}
            fontSize={27}
            fontWeight={800}
            fill={RULE}
            textAnchor="middle"
          >
            {RULER.name.split(" ")[1]} {RULER.span}km
          </text>
        </svg>
      )}

      {/* ── 자막 ── */}
      {started && !inOutro && LINES[bi] !== "" && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 60,
            opacity: on,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              lineHeight: 1.28,
              whiteSpace: "nowrap",
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {LINES[bi]}
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            // 위쪽은 열어 둔다 — 카메라가 전국으로 빠지면서 다섯 선이
            // 한 화면에 놓이는 것이 이 편의 마지막 그림이다
            background:
              "linear-gradient(180deg, rgba(16,21,25,0.10) 0%," +
              " rgba(16,21,25,0.30) 34%, rgba(16,21,25,0.80) 50%," +
              " rgba(16,21,25,0.96) 60%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          {TABLE.slice(0, 8).map((t, i) => {
            const at = BODY_END + Math.round((0.3 + i * 0.24) * FPS);
            const o = interpolate(frame, [at, at + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const hot = i === 0;
            const ruler = t.name === RULER.name;
            return (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginTop: 8,
                  opacity: o,
                  transform: `translateY(${(1 - o) * 8}px)`,
                }}
              >
                <span
                  style={{
                    color: hot ? HOT : ruler ? RULE : INK,
                    fontSize: 36,
                    fontWeight: 900,
                    width: 236,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    color: hot ? HOT : ruler ? RULE : INK,
                    fontSize: 36,
                    fontWeight: 900,
                    width: 168,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.span}km
                </span>
                <span
                  style={{
                    color: DIM,
                    fontSize: 31,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.area.toLocaleString("en-US")}km²
                </span>
              </div>
            );
          })}
          <div
            style={{
              color: DIM,
              fontSize: 26,
              fontWeight: 700,
              marginTop: 14,
              whiteSpace: "nowrap",
            }}
          >
            시군구 경계에서 가장 먼 두 점 사이 직선 · 섬과 매립지까지 다 넣은 값
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.3,
              marginTop: 18,
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(3.2 * FPS), BODY_END + Math.round(3.9 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            제일 넓은 군보다 2배 긴 군
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(16,21,25,0.3)" }}
          />
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
                fontSize: 148,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              189km
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
              <div>같은 군인데</div>
              <div>이 끝에서 저 끝까지</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
