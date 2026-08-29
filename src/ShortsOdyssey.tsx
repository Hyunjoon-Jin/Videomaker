import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BAR, BAR_Y, BEATS, CUM, HOLD, LAND, MAP, SAIL, STOPS, TOLD, TOTAL,
} from "./data/odyssey";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/** 바탕이 바다다 */
const BG = "#0E1418";
const SEA_LAND = "#443A2C";
/** 붙잡혀 있던 시간 */
const HOT = "#D4694F";
/** 바다 위를 나아간 시간 */
const SAIL_C = "#7FA8C4";
/** 뭍에 있던 짧은 날 */
const SHORE = "#6B5A3E";
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
export const ODYSSEY_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

/* ── 지도 ──────────────────────────────────────────
   지중해는 가로로 길다. 화면 폭을 다 쓰고 세로는 띠로만 쓴다. */
const MSCALE = MAP.scale;
const mx = (x: number) => MAP.left + x * MSCALE;
const my = (y: number) => MAP.top + y * MSCALE;

/* ── 막대 ──────────────────────────────────────────
   이 편의 주인공이다. 10년(3,650일)이 막대 하나고, 배가 나아간 날은
   실낱만큼밖에 안 된다. 칼립소 한 칸이 막대의 70%를 먹는다. */
const BAR_L = TEXT_X;
const BAR_R = 1080 - SAFE_RIGHT;
const BAR_W = BAR_R - BAR_L;
const BAR_H = 64;
const bw = (days: number) => (days / TOTAL) * BAR_W;

const COLOR: Record<string, string> = {
  항해: SAIL_C,
  붙잡힘: HOT,
  뭍: SHORE,
};

export const ShortsOdyssey: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const c = BEATS[bi];
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
  /** 배가 그 구간을 지나는 진행도 */
  const sail = interpolate(age, [8, 8 + Math.round(1.1 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 배가 닿은 뒤 막대가 자라는 진행도 */
  const fill = interpolate(
    age,
    [8 + Math.round(1.1 * FPS), 8 + Math.round(2.4 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 지금 막대가 어디까지 찼는지(일) */
  const prevDays = bi === 0 ? 0 : CUM[BEATS[bi - 1].upto];
  const nowDays = inOutro
    ? TOLD
    : prevDays + (CUM[c.upto] - prevDays) * fill;

  /** 배가 있는 자리 */
  const leg = c.route;
  const t = sail * (leg.length - 1);
  const li = Math.min(leg.length - 2, Math.floor(t));
  const lt = leg.length < 2 ? 1 : t - li;
  const from = leg.length < 2 ? leg[0] : leg[li];
  const to = leg.length < 2 ? leg[0] : leg[li + 1];
  const shipX = from[0] + (to[0] - from[0]) * lt;
  const shipY = from[1] + (to[1] - from[1]) * lt;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-od.wav")} volume={0.85} />

      {/* ── 지도 — 0프레임부터 지중해가 떠 있다 ── */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <g transform={`translate(${MAP.left} ${MAP.top}) scale(${MSCALE})`}>
          <path d={LAND} fill={SEA_LAND} stroke={BG} strokeWidth={1.2} />
        </g>

        {/* 지나온 길은 옅게 남는다 */}
        {BEATS.map((b, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          const cur = i === bi && !inOutro;
          const g = cur ? sail : 1;
          const n = b.route.length;
          const tt = g * (n - 1);
          const k = Math.min(n - 2, Math.floor(tt));
          const kt = n < 2 ? 1 : tt - k;
          const pts: [number, number][] = [];
          for (let j = 0; j <= (n < 2 ? 0 : k); j++) pts.push(b.route[j]);
          if (n >= 2) {
            const a = b.route[k];
            const z = b.route[k + 1];
            pts.push([a[0] + (z[0] - a[0]) * kt, a[1] + (z[1] - a[1]) * kt]);
          }
          const prev = i === 0 ? null : BEATS[i - 1].at;
          const head = prev ? [prev, ...pts] : pts;
          return (
            <polyline
              key={"r" + i}
              points={head.map((p) => `${mx(p[0])},${my(p[1])}`).join(" ")}
              fill="none"
              stroke={cur ? INK : "#5E5648"}
              strokeWidth={cur ? 4 : 2.6}
              opacity={cur ? 0.95 : 0.7}
            />
          );
        })}

        {/* 정거장. 채운 점은 실재 지명, 빈 점은 비정이다 */}
        {STOPS.map((s) => (
          <circle
            key={s.name}
            cx={mx(s.x)}
            cy={my(s.y)}
            r={7}
            fill={s.sure ? DIM : "none"}
            stroke={DIM}
            strokeWidth={2.6}
          />
        ))}

        {/* 배 */}
        {started && !inOutro && (
          <circle cx={mx(shipX)} cy={my(shipY)} r={11} fill={INK} />
        )}
      </svg>

      {/* 위아래 글자 자리를 눌러 지도가 글씨를 안 갉아먹게 한다 */}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${BG} 0%, ${BG}E6 38%, ${BG}00 42%,` +
            ` ${BG}00 74%, ${BG}D9 78%, ${BG} 83%)`,
        }}
      />

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div
          style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {c.title}
          </div>
          <div
            style={{
              color: c.days >= 30 ? HOT : SAIL_C,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.days.toLocaleString("en-US")}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 8 }}>일</span>
            {/* 무엇의 며칠인지는 첫 걸음에서 한 번만 밝힌다 */}
            {bi === 0 ? (
              <span
                style={{ color: DIM, fontSize: 32, fontWeight: 700, marginLeft: 18 }}
              >
                10년 중
              </span>
            ) : null}
          </div>
          <div
            style={{
              color: INK,
              fontSize: 36,
              fontWeight: 800,
              marginTop: 6,
              opacity: on,
            }}
          >
            {c.sub}
            <span style={{ color: DIM, fontSize: 28, marginLeft: 16 }}>{c.cite}</span>
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
            bottom: BOTTOM_INSET + 76,
            color: DIM,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          빈 점은 널리 쓰이는 비정
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(14,20,24,0.10) 0%," +
              " rgba(14,20,24,0.30) 26%, rgba(14,20,24,0.86) 40%," +
              " rgba(14,20,24,0.97) 50%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          {[
            ["붙잡혀 있던 날", 2980, HOT, "칼립소 2,555 · 키르케 365 · 그 밖 60"],
            ["뭍에 있던 날", 8, SHORE, "본문에 날수가 적힌 것만"],
            ["바다 위를 나아간 날", SAIL, SAIL_C, "9 · 9 · 6 · 9 · 17 · 2"],
          ].map(([label, days, col, note], i) => {
            const at = BODY_END + Math.round((0.4 + i * 0.5) * FPS);
            const o = interpolate(frame, [at, at + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={label as string}
                style={{
                  marginTop: 18,
                  opacity: o,
                  transform: `translateY(${(1 - o) * 10}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <span
                    style={{
                      color: col as string,
                      fontSize: 42,
                      fontWeight: 900,
                      width: 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label as string}
                  </span>
                  <span
                    style={{
                      color: col as string,
                      fontSize: 62,
                      fontWeight: 900,
                      width: 280,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {(days as number).toLocaleString("en-US")}
                    <span style={{ fontSize: 34, marginLeft: 6 }}>일</span>
                  </span>
                </div>
                <div style={{ color: DIM, fontSize: 26, fontWeight: 700 }}>
                  {note as string}
                </div>
              </div>
            );
          })}
          <div
            style={{
              color: DIM,
              fontSize: 25,
              fontWeight: 700,
              marginTop: 20,
              whiteSpace: "nowrap",
            }}
          >
            10년은 3,650일 · 적힌 날은 3,040일 · 나머지는 「며칠」로만
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.3,
              marginTop: 16,
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(3.4 * FPS), BODY_END + Math.round(4.1 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            10년의 1.4%
          </div>
        </AbsoluteFill>
      )}

      {/* ── 막대 ── */}
      {started && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* 10년 테두리 */}
          <rect
            x={BAR_L}
            y={BAR_Y}
            width={BAR_W}
            height={BAR_H}
            fill="none"
            stroke="#3A342B"
            strokeWidth={2.5}
          />
          {BAR.map((s, i) => {
            const start = i === 0 ? 0 : CUM[i - 1];
            const end = CUM[i];
            if (nowDays <= start) return null;
            const w = bw(Math.min(end, nowDays) - start);
            return (
              <rect
                key={s.name + i}
                x={BAR_L + bw(start)}
                y={BAR_Y}
                width={Math.max(w, 1.2)}
                height={BAR_H}
                fill={COLOR[s.kind]}
              />
            );
          })}
          <text
            x={BAR_L}
            y={BAR_Y + BAR_H + 40}
            fontSize={28}
            fontWeight={800}
            fill={DIM}
          >
            트로이 함락
          </text>
          <text
            x={BAR_R}
            y={BAR_Y + BAR_H + 40}
            fontSize={28}
            fontWeight={800}
            fill={DIM}
            textAnchor="end"
          >
            10년
          </text>
        </svg>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(14,20,24,0.34)" }}
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
                color: SAIL_C,
                fontSize: 150,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              52일
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
              <div>10년을 헤맸다는 오디세우스가</div>
              <div>바다 위를 나아간 날</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
