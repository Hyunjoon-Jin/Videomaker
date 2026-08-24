import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import provinces from "./data/provinces.json";
import {
  DAEJEON,
  DAY,
  DAY_STEP,
  EIGHT,
  MONTH,
  N_DAYS,
  N_FROM_MULTI,
  N_MULTI_DAYS,
  N_SITES,
  SITES,
  TIMELINE,
  Y_FROM,
  Y_TO,
  fmt,
  yearOf,
} from "./data/snow";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

const BG = "#0B0D12";
const LAND_F = "#232936";
const LAND_S = "#333A4A";
/** 쌓인 눈 */
const SNOW = "#EAF1F8";
/** 아직 기록이 안 세워진 지점 */
const OFF = "#4C5666";
/** 그날 — 이 편의 색 */
const HOT = "#5FA8D6";

/**
 * 걸음마다 프레임을 나눠준다.
 *
 * 54개 기록일을 고르게 훑으면 여덟 곳이 한꺼번에 켜지는 날이 다른 날과
 * 똑같이 지나간다. 그 하루가 이 편의 전부인데 그러면 안 된다. 지점이
 * 많이 켜지는 날일수록 오래 머문다.
 */
const BASE = 8;
const PER = 6;
/** 그날은 따로 세운다 */
const DAY_HOLD = Math.round(6.2 * FPS);

interface Slot {
  t0: number;
  t1: number;
}
const SLOTS: Slot[] = [];
{
  let f = HOOK;
  TIMELINE.forEach((step, i) => {
    const len = i === DAY_STEP ? DAY_HOLD : BASE + (step.n - 1) * PER;
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const TL_END = SLOTS[SLOTS.length - 1].t1;

/** 대전 판 — 1위와 2위를 나란히 */
const DJ_LEN = Math.round(6.0 * FPS);
const DJ_AT = TL_END;
const BODY_END = DJ_AT + DJ_LEN;
const OUTRO = Math.round(6.5 * FPS);
export const SNOW_DURATION = BODY_END + OUTRO;

/** 걸음 번호 */
function stepAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/** cm → 지도 위 막대 높이(svg 단위). 울릉도 150.9가 제일 크다. */
const bar = (v: number) => v * 0.40;

/**
 * 마무리 표.
 *
 * 92곳의 기록이 54일에 걸려 있고, 그중 17일이 55곳을 만들었다.
 * 제일 센 하루가 여덟 곳이다. 이 세 줄이 야마 그대로다.
 */
const ROWS = [
  { k: "기록이 난 날", v: `${N_DAYS}일`, hot: false },
  { k: "둘 이상 겹친 날", v: `${N_MULTI_DAYS}일 → ${N_FROM_MULTI}곳`, hot: false },
  { k: `제일 센 하루 ${fmt(DAY)}`, v: `${EIGHT.length}곳`, hot: true },
  { k: "역대 1위가 3월인 곳", v: `${MONTH["3"]}곳`, hot: false },
];

export const ShortsSnow: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const si = stepAt(frame);
  const step = TIMELINE[si];
  const inTL = frame < TL_END;
  const inDJ = frame >= DJ_AT && frame < BODY_END;
  const inOutro = frame >= BODY_END;

  /** 그날에 멈춘 구간 */
  const daySlot = SLOTS[DAY_STEP];
  const onDay = frame >= daySlot.t0 && frame < daySlot.t1;
  const dayIn = interpolate(frame, [daySlot.t0, daySlot.t0 + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 지도를 접고 대전 판으로 */
  const dj = interpolate(
    frame,
    [DJ_AT - 10, DJ_AT + 12, BODY_END - 6, BODY_END + 8],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 켜진 지점 이름 */
  const lit = new Set<string>();
  const started = frame >= SLOTS[0].t0;
  const upto = inTL ? si : TIMELINE.length - 1;
  if (started) {
    for (let i = 0; i <= upto; i++) TIMELINE[i].names.forEach((n) => lit.add(n));
  }

  const seen = started ? TIMELINE[upto].seen : 0;
  const dateText = inTL ? fmt(step.d) : fmt(TIMELINE[TIMELINE.length - 1].d);
  const yr = yearOf(inTL ? step.d : TIMELINE[TIMELINE.length - 1].d);
  const prog = (yr - Y_FROM) / (Y_TO - Y_FROM);

  /** 이번 걸음에 막 켜진 곳은 잠깐 더 밝다 */
  const fresh = interpolate(frame, [SLOTS[si].t0, SLOTS[si].t0 + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const justNow = started ? new Set(step.names) : new Set<string>();

  const line =
    onDay
      ? "22년째 안 깨진 기록"
      : inDJ
        ? "대전이 57년 관측한 것 중 하루"
        : null;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sn.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <AbsoluteFill style={{ opacity: 1 - dj }}>
        <svg
          viewBox="200 250 700 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={1.6} />
          ))}

          {SITES.map((s) => {
            const on = lit.has(s.name);
            const now = justNow.has(s.name);
            const h = on ? bar(s.v) : 0;
            const glow = now ? fresh : 0;
            return (
              <g key={s.id}>
                {/* 쌓인 눈 — 값만큼 위로 선다 */}
                {on && (
                  <rect
                    x={s.x - 3.4}
                    y={s.y - h}
                    width={6.8}
                    height={h}
                    fill={now ? HOT : SNOW}
                    opacity={now ? 1 : 0.9}
                  />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={on ? 3.0 + glow * 7 : 2.2}
                  fill={on ? (now ? HOT : SNOW) : OFF}
                  opacity={on ? 1 : 0.8}
                />
              </g>
            );
          })}

        </svg>
      </AbsoluteFill>

      {/* ── 계기판 ── */}
      {frame >= HOOK - 4 && !inOutro && (
        <>
        {/* 울릉도 막대가 150.9cm라 계기판 자리까지 올라온다. 깔고 읽는다. */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 0, height: 720,
            background:
              "linear-gradient(180deg, rgba(9,11,16,0.96) 0%, rgba(9,11,16,0.9) 62%, rgba(9,11,16,0) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
          <div
            style={{
              color: "#7C8496",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            역대 최대 적설이 세워진 날
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 34 }}>
            <span
              style={{
                color: onDay ? HOT : "#EDF2F8",
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1.06,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {dateText}
            </span>
            <span
              style={{
                color: "#96A0B2",
                fontSize: 38,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {seen}/{N_SITES}
            </span>
          </div>

          {/* 122년 중 어디쯤인지 */}
          <div
            style={{
              position: "relative",
              height: 6,
              marginTop: 18,
              background: "#242B39",
              borderRadius: 3,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${prog * 100}%`,
                background: onDay ? HOT : "#4A5468",
                borderRadius: 3,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#5C6474",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            <span>{Y_FROM}</span>
            <span>{Y_TO}</span>
          </div>
        </div>
        </>
      )}

      {/* ── 대전 판 — 하루가 얼마나 튀는지는 2위와 견줘야 보인다 ── */}
      {dj > 0 && (
        <AbsoluteFill style={{ opacity: dj }}>
          <svg
            viewBox="0 0 1080 1920"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <rect x={0} y={0} width={1080} height={1920} fill="#0A0C11" />

            {(() => {
              const zero = 1320;
              const k = 15.2; // 1cm = 15.2px. 49.0 → 745px
              const w = 210;
              const cols = [
                { x: 340, v: DAEJEON.v, d: DAEJEON.d, c: HOT, tag: "역대 1위" },
                { x: 720, v: DAEJEON.v2!, d: DAEJEON.d2!, c: "#4E586B", tag: "역대 2위" },
              ];
              return (
                <>
                  <text x={TEXT_X} y={SAFE_TOP + 40} fontSize={30} fontWeight={700} fill="#7C8496">
                    대전 · 일 최심신적설
                  </text>
                  {cols.map((c) => {
                    const h = c.v * k;
                    const at = DJ_AT + (c.tag === "역대 1위" ? 10 : 26);
                    const o = interpolate(frame, [at, at + 14], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    return (
                      <g key={c.tag} opacity={o}>
                        <rect x={c.x - w / 2} y={zero - h} width={w} height={h} fill={c.c} />
                        <text
                          x={c.x}
                          y={zero - h - 26}
                          fontSize={72}
                          fontWeight={900}
                          fill={c.c}
                          textAnchor="middle"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {c.v.toFixed(1)}
                        </text>
                        <text
                          x={c.x}
                          y={zero + 52}
                          fontSize={34}
                          fontWeight={900}
                          fill="#8E97A8"
                          textAnchor="middle"
                        >
                          {c.tag}
                        </text>
                        <text
                          x={c.x}
                          y={zero + 96}
                          fontSize={30}
                          fontWeight={700}
                          fill="#5C6474"
                          textAnchor="middle"
                        >
                          {fmt(c.d)}
                        </text>
                      </g>
                    );
                  })}
                  {/* 두 막대 사이에 배수를 세운다. 격차가 이 편의 증거다. */}
                  {(() => {
                    const o = interpolate(frame, [DJ_AT + 44, DJ_AT + 58], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    const y1 = zero - DAEJEON.v * k;
                    const y2 = zero - DAEJEON.v2! * k;
                    return (
                      <g opacity={o}>
                        <line x1={455} y1={y1} x2={610} y2={y1} stroke="#3E4757" strokeWidth={3} />
                        <line x1={530} y1={y1} x2={530} y2={y2} stroke="#3E4757" strokeWidth={3} />
                        <line x1={455} y1={y2} x2={610} y2={y2} stroke="#3E4757" strokeWidth={3} />
                        <text x={530} y={(y1 + y2) / 2 + 16} fontSize={54} fontWeight={900}
                              fill="#EDF2F8" textAnchor="middle"
                              style={{ paintOrder: "stroke", stroke: "#0A0C11", strokeWidth: 12 }}>
                          ×{(DAEJEON.v / DAEJEON.v2!).toFixed(2)}
                        </text>
                      </g>
                    );
                  })()}
                  <line x1={TEXT_X} y1={zero} x2={1080 - SAFE_RIGHT} y2={zero}
                        stroke="#2A3140" strokeWidth={4} />
                  <text x={1080 - SAFE_RIGHT} y={zero - 14} fontSize={30} fontWeight={700}
                        fill="#5C6474" textAnchor="end">
                    cm
                  </text>
                </>
              );
            })()}
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 그날 여덟 곳 — 지도에 붙이면 겹친다. 아래에 편다. ── */}
      {onDay && (
        <>
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 900,
              background:
                "linear-gradient(0deg, rgba(9,11,16,0.97) 42%, rgba(9,11,16,0.9) 62%, rgba(9,11,16,0) 100%)",
              opacity: dayIn,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: BOTTOM_INSET + 172,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: 90,
              rowGap: 10,
            }}
          >
            {EIGHT.map((s2, i) => {
              const at = daySlot.t0 + 8 + i * 4;
              const o = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={s2.id}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    opacity: o,
                    transform: `translateY(${(1 - o) * 10}px)`,
                  }}
                >
                  <span style={{ color: "#EDF2F8", fontSize: 42, fontWeight: 800 }}>
                    {s2.name}
                  </span>
                  <span
                    style={{
                      color: HOT,
                      fontSize: 44,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s2.v.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 자막 — 화면에 없는 것 한 줄 ── */}
      {line && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 56,
            color: "#EDF2F8",
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.24,
            wordBreak: "keep-all",
          }}
        >
          {line}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill style={{ backgroundColor: "rgba(8,10,14,0.9)", opacity: outroIn }} />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
              opacity: outroIn,
            }}
          >
            <div
              style={{
                color: "#7C8496",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 20,
              }}
            >
              관측소 {N_SITES}곳의 역대 최대 적설
            </div>
            {/* 야마가 '하루'다. 마무리를 달 분포로 닫으면 편이 딴 데로 간다. */}
            {ROWS.map((r, i) => {
              const at = BODY_END + Math.round((0.4 + i * 0.36) * FPS);
              const on = interpolate(frame, [at, at + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={r.k}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 24,
                    marginTop: 14,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 12}px)`,
                  }}
                >
                  <span style={{ color: r.hot ? HOT : "#8E97A8", fontSize: 42, fontWeight: 800 }}>
                    {r.k}
                  </span>
                  <span
                    style={{
                      color: r.hot ? HOT : "#EDF2F8",
                      fontSize: 46,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.v}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                color: "#EDF2F8",
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1.32,
                marginTop: 30,
                wordBreak: "keep-all",
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(2.4 * FPS), BODY_END + Math.round(3.1 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              기록은 겨울이 아니라 하루가 만드는 것
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(8,10,14,0.3)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: HOT, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            관측소 {N_SITES}곳
          </div>
          <div
            style={{
              color: "#EDF2F8",
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.16,
              wordBreak: "keep-all",
            }}
          >
            눈이 가장 많이 온 날
          </div>
        </AbsoluteFill>
      )}

      <Grain opacity={0.26} vignette={0.3} />
    </AbsoluteFill>
  );
};
