import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CASES, COAST, HOLD, TABLE, WIDE } from "./data/inland";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/** 바탕이 바다다 */
const BG = "#0E1418";
/** 나머지 전국 */
const LAND = "#2F2820";
/** 이번 지자체 */
const HOT = "#D4694F";
/** 원과 닿는 자리 */
const RING = "#EDE5D4";
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
export const INLAND_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

const ASPECT = 1920 / 1080;
const camW = 1000 / WIDE.z;
const camH = camW * ASPECT;
const VIEWBOX = `${WIDE.cx - camW / 2} ${WIDE.cy - camH / 2} ${camW} ${camH}`;
/** 화면 1px에 해당하는 지도 단위 */
const px = camW / 1080;

/** 원이 자라는 데 걸리는 시간 */
const GROW = Math.round(1.5 * FPS);

export const ShortsInland: React.FC = () => {
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
  /** 원이 자라는 진행도 */
  const grow = interpolate(age, [10, 10 + GROW], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 바다에 닿고 나서 점이 뜨는 정도 */
  const hit = interpolate(age, [10 + GROW - 4, 10 + GROW + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-il.wav")} volume={0.85} />

      {/* ── 지도 — 0프레임부터 전국이 떠 있다. 카메라는 안 움직인다 ── */}
      <svg
        viewBox={VIEWBOX}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={px} />
        ))}
        {/* 실제 해안선. 금강 하구·아산만 같은 물길을 판다 */}
        <path d={COAST} fill="none" stroke={BG} strokeWidth={px * 2.4} />

        {/* 지나온 지자체는 옅게 남는다 */}
        {CASES.map((x, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          const lit = inOutro ? i === CASES.length - 1 : i === bi;
          return (
            <path
              key={x.name}
              d={x.d}
              fill={lit ? HOT : "#6B4A3E"}
              fillOpacity={lit && !inOutro ? 0.5 + on * 0.4 : 0.7}
              stroke={lit ? HOT : "#6B4A3E"}
              strokeWidth={px * 1.6}
            />
          );
        })}

        {/* 원이 커져 두 바다에 닿는다 */}
        {CASES.map((x, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          const cur = inOutro ? i === CASES.length - 1 : i === bi;
          const g = cur && !inOutro ? grow : 1;
          const h = cur && !inOutro ? hit : 1;
          return (
            <g key={"c" + x.name}>
              <circle
                cx={x.x}
                cy={x.y}
                r={x.r * g}
                fill="none"
                stroke={cur ? RING : "#4A4438"}
                strokeWidth={px * (cur ? 3.5 : 2)}
                opacity={cur ? 0.95 : 0.75}
              />
              <circle cx={x.x} cy={x.y} r={px * (cur ? 8 : 5)} fill={cur ? HOT : "#6B4A3E"} />
              {/* 닿는 자리 */}
              {[x.west, x.east].map((t, k) => (
                <circle
                  key={k}
                  cx={t.x}
                  cy={t.y}
                  r={px * (cur ? 11 : 6)}
                  fill={cur ? RING : "#4A4438"}
                  opacity={h}
                />
              ))}
            </g>
          );
        })}

        {/* 바다 이름표. 닿는 순간에만 켠다 */}
        {started && !inOutro
          ? ([
              ["서해", c.west, "end", -20],
              ["동해", c.east, "start", 20],
            ] as const).map(([lab, t, anchor, dx]) => (
              <text
                key={lab}
                x={t.x + dx * px}
                y={t.y + 12 * px}
                fontSize={40 * px}
                fontWeight={900}
                fill={RING}
                textAnchor={anchor}
                stroke={BG}
                strokeWidth={7 * px}
                paintOrder="stroke"
                opacity={hit}
              >
                {lab} {t.km.toFixed(2)}
              </text>
            ))
          : null}
      </svg>

      {/* 위아래 글자 자리를 눌러 지도가 글씨를 안 갉아먹게 한다 */}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${BG} 0%, ${BG}E6 20%, ${BG}00 40%,` +
            ` ${BG}00 72%, ${BG}CC 88%, ${BG}F2 100%)`,
        }}
      />

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div
          style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {c.rank}위 · {c.name} {c.emd}
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
            {c.km.toFixed(1)}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 8 }}>km</span>
            {/* 이 숫자가 무엇인지는 첫 걸음에서 한 번만 밝힌다 */}
            {bi === 0 ? (
              <span
                style={{ color: DIM, fontSize: 32, fontWeight: 700, marginLeft: 18 }}
              >
                바다까지
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(14,20,24,0.10) 0%," +
              " rgba(14,20,24,0.30) 30%, rgba(14,20,24,0.82) 44%," +
              " rgba(14,20,24,0.96) 54%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              color: DIM,
              fontSize: 25,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            <span style={{ width: 300 }} />
            <span style={{ width: 112, textAlign: "right" }}>서해</span>
            <span style={{ width: 112, textAlign: "right" }}>동해</span>
          </div>
          {TABLE.map((t, i) => {
            const at = BODY_END + Math.round((0.3 + i * 0.2) * FPS);
            const o = interpolate(frame, [at, at + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            /* 6위부터 한쪽으로 기운다. 가까운 바다를 켜면 글자 없이 보인다 */
            const tilt = Math.abs(t.west - t.east) >= 1;
            return (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginTop: 6,
                  opacity: o,
                  transform: `translateY(${(1 - o) * 8}px)`,
                }}
              >
                <span
                  style={{
                    color: i === 0 ? HOT : INK,
                    fontSize: 33,
                    fontWeight: 900,
                    width: 300,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.rank}. {t.name}
                </span>
                <span
                  style={{
                    color: tilt && t.west < t.east ? HOT : INK,
                    fontSize: 33,
                    fontWeight: 900,
                    width: 112,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.west.toFixed(1)}
                </span>
                <span
                  style={{
                    color: tilt && t.east < t.west ? HOT : INK,
                    fontSize: 33,
                    fontWeight: 900,
                    width: 112,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.east.toFixed(1)}
                </span>
              </div>
            );
          })}
          <div
            style={{
              color: DIM,
              fontSize: 25,
              fontWeight: 700,
              marginTop: 14,
              whiteSpace: "nowrap",
            }}
          >
            해안선에서 가장 먼 육지 지점 · 시군구마다 하나씩 · 섬까지 넣은 값
          </div>
          <div
            style={{
              color: INK,
              fontSize: 44,
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
            어디에 서 있어도 바다까지 120km 안
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(14,20,24,0.32)" }}
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
                fontSize: 140,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              119.7km
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
              <div>바다에서 가장 먼 곳</div>
              <div>동해도 서해도 같은 거리</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
