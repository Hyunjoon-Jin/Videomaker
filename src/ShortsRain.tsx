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
  CASES,
  HEAVY_WARN3,
  HERO,
  LINES,
  N_SITES,
  PROG,
  SCALE,
  fmt,
} from "./data/rain";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

const BG = "#080B10";
/** 1시간 최대 */
const RAIN = "#5FB8F0";
/** 1위 */
const HOT = "#F0A63C";
/** 당일 누적에서 1시간 최대를 뺀 나머지 */
const REST = "#2E4159";
const INK = "#EAF1F8";
const DIM = "#7E8898";

/**
 * 한 날에 머무는 시간(초).
 *
 * 앞의 둘은 '하루로 많이 온 날'을 세우는 자리라 짧고, 뒤의 둘에서
 * 색 비율이 뒤집힌다. 1위가 제일 길다.
 */
const HOLD = [5.4, 6.4, 6.0, 8.4];

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  CASES.forEach((_, i) => {
    const len = Math.round(HOLD[i] * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(7.0 * FPS);
export const RAIN_DURATION = BODY_END + OUTRO;

function caseAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/* ── 막대 ──────────────────────────────────────────
   막대 하나가 당일 누적 강수량(일강수량)이고, 아래쪽 색칠한 만큼이
   1시간 최대(1시간 최다강수량)다. 눈금이 넷에 공통이라 당일 누적도
   같이 견줘진다 — 거제가 제일 길고 군산이 제일 짧다.

   16편에서 눈금이 12%밖에 안 벌어져 실패한 적이 있다. 여기서는
   1시간 최대끼리는 23%밖에 안 벌어지지만 화면이 말하는 것은 그게
   아니라 **한 막대 안에서 색이 차지하는 비율**이라 상관이 없다. */
const BASE = 1440;
const TOP_Y = 900;
const K = (BASE - TOP_Y) / SCALE;
const COL_L = TEXT_X;
const COL_R = 1080 - SAFE_RIGHT;
const SLOT_W = (COL_R - COL_L) / CASES.length;
const BAR_W = 116;
const slotX = (i: number) => COL_L + SLOT_W * i + (SLOT_W - BAR_W) / 2;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/* ── 지도 판 ────────────────────────────────────────
   오른쪽 위 작은 판. provinces.json은 투영 좌표가 0~1000이고 남한은
   x 228~798, y 440~1040에 든다. 그 조각만 잘라 195px 폭에 앉힌다. */
const MAP_L = 228;
const MAP_T = 440;
const MAP_X = 700;
const MAP_Y = 366;
const MAP_S = 195 / 570;
const mx = (x: number) => (x - MAP_L) * MAP_S + MAP_X;
const my = (y: number) => (y - MAP_T) * MAP_S + MAP_Y;

export const ShortsRain: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ci = caseAt(frame);
  const c = CASES[ci];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 계기판 숫자가 올라가는 중 */
  const rise = interpolate(frame, [SLOTS[ci].t0 + 6, SLOTS[ci].t0 + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isHero = ci === CASES.length - 1;
  const accent = isHero ? HOT : RAIN;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-rn.wav")} volume={0.9} />

      {/* ── 막대와 지도 ── */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/*
          지도 — 오른쪽 위 작은 판.
          네 곳이 처음부터 다 찍혀 있고 그날의 지점만 켜진다.
          「땅과 때」라 어디인지는 늘 보여야 한다.
        */}
        <g transform={`translate(${MAP_X} ${MAP_Y}) scale(${MAP_S}) translate(${-MAP_L} ${-MAP_T})`}>
          {PROVINCES.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="#1E2A3C"
              stroke="#445672"
              strokeWidth={2 / MAP_S}
            />
          ))}
        </g>
        {CASES.map((cc, i) => {
          const cur = i === ci && started && !inOutro;
          const seen = started && frame >= SLOTS[i].t0;
          const col = i === CASES.length - 1 ? HOT : RAIN;
          return (
            <g key={"m" + cc.d} opacity={cur ? 1 : seen ? 0.5 : 0.22}>
              {cur && (
                <circle cx={mx(cc.x)} cy={my(cc.y)} r={22} fill="none" stroke={col}
                        strokeWidth={4} opacity={0.5} />
              )}
              <circle cx={mx(cc.x)} cy={my(cc.y)} r={cur ? 11 : 7}
                      fill={seen ? col : "#4A5568"} />
            </g>
          );
        })}

        {/*
          범례 — 지도 판 아래.
          막대가 무엇인지 한 번은 적어야 한다. 바닥에 두면 자막 자리와
          겹쳐서 여기로 올렸다.
        */}
        <g transform="translate(700 620)">
          <rect x={0} y={-24} width={30} height={30} fill={RAIN} />
          <text x={44} y={2} fontSize={28} fontWeight={800} fill="#96A2B2">
            1시간 최대
          </text>
          <rect x={0} y={26} width={30} height={30} fill={REST} />
          <text x={44} y={52} fontSize={28} fontWeight={800} fill="#96A2B2">
            당일 누적 강수량
          </text>
          <line x1={0} y1={90} x2={30} y2={90} stroke="#8A97AA" strokeWidth={3}
                strokeDasharray="8 6" />
          <text x={44} y={100} fontSize={28} fontWeight={800} fill="#96A2B2">
            호우경보 3시간 90mm
          </text>
        </g>

        {/* 바닥선 */}
        <line x1={COL_L} y1={BASE} x2={COL_R} y2={BASE} stroke="#4E5B72" strokeWidth={5} />

        {CASES.map((cc, i) => {
          const x = slotX(i);
          const on = started && frame >= SLOTS[i].t0;
          const g = on
            ? ease(
                interpolate(frame, [SLOTS[i].t0, SLOTS[i].t0 + 22], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              )
            : 0;
          const hd = cc.day * K * g;
          const hh = cc.hour * K * g;
          const cur = i === ci && !inOutro;
          const col = i === CASES.length - 1 ? HOT : RAIN;
          return (
            <g key={cc.d + cc.name}>
              {/*
                빈 자리 — 0프레임이 완성된 그림이어야 한다. 값이 아직
                없어도 넷이 설 자리는 이미 서 있다.
              */}
              <line x1={x + BAR_W / 2} y1={TOP_Y} x2={x + BAR_W / 2} y2={BASE}
                    stroke="#283446" strokeWidth={2} strokeDasharray="6 12" />
              <rect x={x} y={BASE - 14} width={BAR_W} height={14}
                    fill="none" stroke="#43506A" strokeWidth={3} />
              {/* 당일 누적 강수량 */}
              <rect x={x} y={BASE - hd} width={BAR_W} height={hd} fill={REST}
                    opacity={cur ? 1 : 0.65} />
              {/* 1시간 최대 */}
              <rect x={x} y={BASE - hh} width={BAR_W} height={hh} fill={col}
                    opacity={cur ? 1 : 0.62} />
              {on && (
                /* 비율 — 막대 위 */
                <text
                  x={x + BAR_W / 2}
                  y={BASE - hd - 18}
                  fontSize={cur ? 46 : 38}
                  fontWeight={900}
                  fill={cur ? col : "#8E9AAB"}
                  textAnchor="middle"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {cc.pct}%
                </text>
              )}
              {/*
                지점과 해 — 0프레임부터 서 있다. 값이 아직 안 찼어도
                네 날이 어디에 설지는 보여야 화면이 완성된 그림이 된다.
              */}
              <text x={x + BAR_W / 2} y={BASE + 46} fontSize={36} fontWeight={900}
                    fill={cur ? INK : on ? "#8E9AAB" : "#525E70"} textAnchor="middle">
                {cc.name}
              </text>
              <text x={x + BAR_W / 2} y={BASE + 84} fontSize={32} fontWeight={800}
                    fill={cur ? col : on ? "#6E7A8C" : "#464F5F"} textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}>
                {cc.d.slice(0, 4)}
              </text>
            </g>
          );
        })}

        {/*
          호우경보 기준선 — 세 시간 누적 90mm.
          막대보다 나중에 그린다. 앞에 그리면 라벨이 막대에 가려 잘린다.
          넷 다 이 선을 1시간 만에 넘는다.
        */}
        <line
          x1={COL_L}
          y1={BASE - HEAVY_WARN3 * K}
          x2={COL_R}
          y2={BASE - HEAVY_WARN3 * K}
          stroke="#8A97AA"
          strokeWidth={3}
          strokeDasharray="12 10"
          opacity={0.75}
        />
      </svg>

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div style={{ position: "absolute", left: TEXT_X, right: 420, top: SAFE_TOP }}>
          <div style={{ color: DIM, fontSize: 29, fontWeight: 700, letterSpacing: 2 }}>
            1시간 최다강수량 {c.rank ? `· 전국 ${c.rank}위` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
            <span style={{ color: accent, fontSize: 80, fontWeight: 900 }}>{c.name}</span>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1,
              marginTop: 6,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(c.hour * rise).toFixed(1)}mm
          </div>
          <div
            style={{
              color: accent,
              fontSize: 44,
              fontWeight: 900,
              marginTop: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            당일 누적 {c.day.toFixed(1)}mm의 {c.pct}%
          </div>
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              marginTop: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(c.d)}
          </div>
        </div>
      )}

      {/* ── 자막 — 화면에 없는 것 한 줄 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 18,
            color: INK,
            fontSize: 42,
            fontWeight: 900,
            lineHeight: 1.24,
            wordBreak: "keep-all",
          }}
        >
          {LINES[ci]}
        </div>
      )}

      {/* ── 마무리 — 전국 1위가 갈아치워진 자취 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(8,11,16,0.975)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2, marginBottom: 18 }}>
            1시간 최다강수량 전국 1위가 바뀐 자취
          </div>
          {PROG.map((p, i) => {
            const at = BODY_END + Math.round((0.4 + i * 0.34) * FPS);
            const on = interpolate(frame, [at, at + 11], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const last = i === PROG.length - 1;
            return (
              <div
                key={p.d}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginTop: 12,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 10}px)`,
                }}
              >
                <span
                  style={{
                    color: last ? HOT : "#77808F",
                    fontSize: 32,
                    fontWeight: 800,
                    width: 244,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.d.replace(/-/g, ". ")}.
                </span>
                <span style={{ color: last ? HOT : INK, fontSize: 42, fontWeight: 800, width: 128 }}>
                  {p.name}
                </span>
                <span
                  style={{
                    color: last ? HOT : INK,
                    fontSize: 42,
                    fontWeight: 900,
                    width: 218,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.v.toFixed(1)}mm
                </span>
                <span
                  style={{
                    color: "#77808F",
                    fontSize: 32,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.held ?? ""}
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
                [BODY_END + Math.round(2.8 * FPS), BODY_END + Math.round(3.5 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            56년을 버틴 기록이 최근 2년에 2번 · 전국 {N_SITES}개 관측소
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(8,11,16,0.46)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: RAIN, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            1시간에 {HERO.hour}mm
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
            하루 올 비가 1시간에
          </div>
        </AbsoluteFill>
      )}

      <Grain opacity={0.24} vignette={0.32} />
    </AbsoluteFill>
  );
};
