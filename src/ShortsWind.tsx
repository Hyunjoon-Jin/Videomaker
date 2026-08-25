import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  DAY,
  DAY_HITS,
  MAP,
  N_SITES,
  PERSON_KG,
  SOKCHO,
  STEPS,
  TOP,
  WARN_KGF,
  WIDE,
  fmt,
  forceOf,
} from "./data/wind";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

const BG = "#0A0C11";
const SEA = "#0C1017";
const LAND_F = "#3F4B61";
const LAND_S = "#5D6B84";
/** 바람 */
const WIND = "#7FD4E8";
/** 1위 */
const HOT = "#F0A63C";
const INK = "#EAF1F8";

/**
 * 한 걸음에 머무는 시간(초).
 *
 * 5위에서 1위로 올라간다. 위로 갈수록 길다 — 마지막 한 계단이
 * 이 편의 전부다.
 */
const HOLD = [4.4, 4.2, 5.4, 7.6, 6.4];
/** 카메라가 다음 지점으로 날아가는 시간 */
const FLY = Math.round(1.1 * FPS);

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  STEPS.forEach((_, i) => {
    const len = Math.round(HOLD[i] * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(6.8 * FPS);
export const WIND_DURATION = BODY_END + OUTRO;

function stepAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/* ── 힘 눈금 ────────────────────────────────────────
   처음에는 시속 눈금(0~320km/h)이었는데 5위 189와 1위 229가
   화면에서 12%밖에 안 벌어져 순위 차이가 안 보였다.

   힘은 속도의 제곱에 비례한다(동압 ½ρv²). 같은 값이 1.48배로
   벌어지고, '㎡에 몇 kg'은 시속보다 몸에 닿는다. */
const SC_MAX = 270;
const SC_L = TEXT_X;
const SC_R = 1080 - SAFE_RIGHT;
const SC_Y = 1500;
const sx = (kgf: number) => SC_L + (kgf / SC_MAX) * (SC_R - SC_L);

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const ShortsWind: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const si = stepAt(frame);
  const step = STEPS[si];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /**
   * 카메라.
   *
   * 훅에서는 전국이 다 보이고, 걸음마다 그 지점으로 날아간다.
   * 울릉도(동)에서 흑산도(서남)는 화면 두 개 거리라 그냥 밀면
   * 어디로 가는지 모른다. 이동 중에 한 번 물러섰다 붙는다.
   */
  const cam = (() => {
    const to = step;
    const from = si === 0 ? WIDE : STEPS[si - 1];
    const t = interpolate(frame, [SLOTS[si].t0, SLOTS[si].t0 + FLY], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (!started) return WIDE;
    const e = ease(t);
    const dist = Math.hypot(to.cx - from.cx, to.cy - from.cy);
    const bump = Math.min(dist * 0.55, 330) * Math.sin(Math.PI * t);
    return {
      cx: from.cx + (to.cx - from.cx) * e,
      cy: from.cy + (to.cy - from.cy) * e,
      w: from.w + (to.w - from.w) * e + bump,
    };
  })();
  const camW = inOutro ? cam.w + (WIDE.w - cam.w) * outroIn : cam.w;
  const camX = inOutro ? cam.cx + (WIDE.cx - cam.cx) * outroIn : cam.cx;
  const camY = inOutro ? cam.cy + (WIDE.cy - cam.cy) * outroIn : cam.cy;
  const camH = (camW * 1920) / 1080;
  const viewBox = `${camX - camW / 2} ${camY - camH / 2} ${camW} ${camH}`;
  /** 클로즈업일수록 선을 얇게 — 안 그러면 해안선이 뭉개진다 */
  const stroke = camW / 240;
  /** 전국 뷰에서 시군구 경계선은 얼룩이다. 붙을수록 켠다. */
  const edge = Math.max(0, Math.min(1, (320 - camW) / 180));

  /** 값이 올라가는 중 */
  const rise = interpolate(
    frame,
    [SLOTS[si].t0 + FLY * 0.5, SLOTS[si].t0 + FLY * 0.5 + 18],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const hero = step.sites[0];
  const isDay = !!step.day;
  const shown = started ? hero.v * (isDay ? 1 : rise) : 0;
  /** 1㎡에 걸리는 힘(kgf) */
  const force = forceOf(shown);
  const isTop = si >= STEPS.length - 2;
  const c = isTop ? HOT : WIND;

  /** 눈금 위에 이미 세워둔 지점들 */
  const past = STEPS.slice(0, si)
    .filter((s) => !s.day)
    .flatMap((s) => s.sites)
    .filter((s) => s.id !== hero.id);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-wd.wav")} volume={0.9} />

      {/* ── 지도 — 카메라가 지점으로 날아간다 ── */}
      <AbsoluteFill>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block", backgroundColor: SEA }}
        >
          {MAP.map((p, i) => (
            <path key={i} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={stroke}
                  strokeOpacity={edge} />
          ))}

          {started &&
            step.sites.map((s) => {
              const at = SLOTS[si].t0 + FLY * 0.4;
              const o = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const r = stroke * 7;
              return (
                <g key={s.id} opacity={o}>
                  {/* 바람이 지나간 자리 — 고리가 퍼진다 */}
                  {[0, 1, 2].map((k) => {
                    const p = ((frame - at) / 26 + k / 3) % 1;
                    return (
                      <circle
                        key={k}
                        cx={s.x}
                        cy={s.y}
                        r={r * (1 + p * 5)}
                        fill="none"
                        stroke={c}
                        strokeWidth={stroke * 1.6}
                        opacity={(1 - p) * 0.5}
                      />
                    );
                  })}
                  <circle cx={s.x} cy={s.y} r={r} fill={c} />
                </g>
              );
            })}
        </svg>
      </AbsoluteFill>

      {/* 글자가 지도 위에서 읽히게 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(9,11,16,0.93) 0%, rgba(9,11,16,0.88) 26%, rgba(9,11,16,0.12) 46%, rgba(9,11,16,0.2) 62%, rgba(9,11,16,0.94) 76%)",
        }}
      />

      {/* ── 계기판 ── */}
      {started && !inOutro && !isDay && (
        <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
          <div
            style={{
              color: "#7E8898",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            최대순간풍속 · 관측 이래 전국 {TOP.length}위
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span style={{ color: c, fontSize: 66, fontWeight: 900 }}>{hero.rank}위</span>
            <span style={{ color: c, fontSize: 84, fontWeight: 900 }}>
              {step.sites.map((s2) => s2.name).join(" · ")}
            </span>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 112,
              fontWeight: 900,
              lineHeight: 1,
              marginTop: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            시속 {Math.round(shown * 3.6)}km
          </div>
          <div
            style={{
              color: "#96A2B2",
              fontSize: 40,
              fontWeight: 800,
              marginTop: 10,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            초속 {shown.toFixed(1)}m · 강풍경보의 {hero.warn.toFixed(2)}배
          </div>
          <div
            style={{
              color: c,
              fontSize: 44,
              fontWeight: 900,
              marginTop: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            1㎡에 {Math.round(force)}kg · 어른 {(force / PERSON_KG).toFixed(1)}명
          </div>
          <div
            style={{
              color: INK,
              fontSize: 52,
              fontWeight: 900,
              marginTop: 16,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(hero.d)}
          </div>
        </div>
      )}

      {/*
        그날 판.

        1위 숫자만 보여주면 '그래서 뭐'가 남는다. 같은 날 다른
        기록도 걸려 있다는 것이 그날이 어떤 날이었는지를 말한다.
      */}
      {started && !inOutro && isDay && (
        <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
          <div
            style={{
              color: "#7E8898",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            그날 걸린 기록
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.06,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(DAY)}
          </div>
          <div style={{ marginTop: 26 }}>
            {DAY_HITS.map((h, i) => {
              const at = SLOTS[si].t0 + Math.round((0.5 + i * 0.6) * FPS);
              const on = interpolate(frame, [at, at + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const first = h.rank === 1;
              return (
                <div
                  key={h.name + h.kind}
                  style={{
                    marginTop: 18,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 12}px)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                    <span style={{ color: first ? HOT : INK, fontSize: 48, fontWeight: 900 }}>
                      {h.name}
                    </span>
                    <span
                      style={{
                        color: first ? HOT : INK,
                        fontSize: 56,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {h.v}
                      {h.unit}
                    </span>
                    <span
                      style={{
                        color: first ? HOT : "#96A2B2",
                        fontSize: 40,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      그 지점 {h.rank}위
                    </span>
                  </div>
                  <div style={{ color: "#7E8898", fontSize: 32, fontWeight: 700, marginTop: 2 }}>
                    {h.kind}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 힘 눈금 — 붙박이 ── */}
      {!inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <text x={SC_L} y={SC_Y - 128} fontSize={29} fontWeight={800} fill="#6E7A8C">
            바람이 1㎡에 미는 힘
          </text>

          <line x1={SC_L} y1={SC_Y} x2={SC_R} y2={SC_Y} stroke="#39435A" strokeWidth={4} />
          {/* 강풍경보 기준의 힘. 다섯 곳이 전부 이 선의 네 배를 넘는다. */}
          <g>
            <line x1={sx(WARN_KGF)} y1={SC_Y - 18} x2={sx(WARN_KGF)} y2={SC_Y + 18}
                  stroke="#5A6678" strokeWidth={4} />
            <text x={sx(WARN_KGF)} y={SC_Y + 58} fontSize={28} fontWeight={800}
                  fill="#6E7A8C" textAnchor="middle">
              강풍경보
            </text>
          </g>

          {/* 지나온 지점은 남는다 */}
          {(() => {
            let lastLabel = -Infinity;
            return past
              .slice()
              .sort((a, b) => a.kgf - b.kgf)
              .map((s2) => {
                const x = sx(s2.kgf);
                const show = x - lastLabel >= 40;
                if (show) lastLabel = x;
                return (
                  <g key={s2.id} opacity={0.5}>
                    <line x1={x} y1={SC_Y - 52} x2={x} y2={SC_Y}
                          stroke={WIND} strokeWidth={5} />
                    {show && (
                      <text x={x} y={SC_Y - 64} fontSize={27} fontWeight={800}
                            fill={WIND} textAnchor="middle">
                        {s2.rank}위
                      </text>
                    )}
                  </g>
                );
              });
          })()}

          {/* 지금 지점 — 막대로 채운다 */}
          {started && (
            <g>
              <rect x={SC_L} y={SC_Y - 14} width={Math.max(0, sx(force) - SC_L)} height={14}
                    fill={c} opacity={0.3} />
              <line x1={sx(force)} y1={SC_Y - 96} x2={sx(force)} y2={SC_Y}
                    stroke={c} strokeWidth={8} />
              <text x={sx(force)} y={SC_Y - 110} fontSize={40} fontWeight={900}
                    fill={c} textAnchor="middle"
                    style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 10 }}>
                {Math.round(force)}kg
              </text>
            </g>
          )}
        </svg>
      )}

      {/* ── 자막 — 화면에 없는 것 한 줄 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 34,
            color: INK,
            fontSize: 46,
            fontWeight: 900,
            lineHeight: 1.24,
            wordBreak: "keep-all",
          }}
        >
          {step.line}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(9,11,16,0.9)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              color: "#7E8898",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 18,
            }}
          >
            최대순간풍속 · 관측 이래 전국 {TOP.length}위
          </div>
          {TOP.map((s, i) => {
            const at = BODY_END + Math.round((0.4 + i * 0.3) * FPS);
            const on = interpolate(frame, [at, at + 11], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const top = i === 0;
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginTop: 10,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 10}px)`,
                }}
              >
                <span
                  style={{
                    color: top ? HOT : "#77808F",
                    fontSize: 38,
                    fontWeight: 900,
                    width: 52,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: top ? HOT : INK,
                    fontSize: 42,
                    fontWeight: 800,
                    width: 190,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    color: "#77808F",
                    fontSize: 32,
                    fontWeight: 800,
                    flex: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.d.replace(/-/g, ". ")}.
                </span>
                <span
                  style={{
                    color: top ? HOT : INK,
                    fontSize: 42,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.kmh.toFixed(0)}km/h
                </span>
              </div>
            );
          })}
          <div
            style={{
              color: INK,
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.32,
              marginTop: 26,
              wordBreak: "keep-all",
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(2.6 * FPS), BODY_END + Math.round(3.3 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            강풍경보 기준의 {SOKCHO.warn.toFixed(1)}배 · 전국 {N_SITES}개 관측소
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(9,11,16,0.5)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: HOT, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            시속 {SOKCHO.kmh.toFixed(0)}km
          </div>
          <div
            style={{
              color: INK,
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.16,
              wordBreak: "keep-all",
            }}
          >
            관측 이래 가장 센 바람
          </div>
        </AbsoluteFill>
      )}

      <Grain opacity={0.24} vignette={0.32} />
    </AbsoluteFill>
  );
};
