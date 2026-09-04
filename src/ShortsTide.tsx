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
  FLIP,
  HALF_MIN,
  HOLD,
  HOOK_SEC,
  NORTH,
  OUTRO_SEC,
  PERIOD_MIN,
  PERIOD_MIN as _P,
  RISE,
  SOUTH,
  ST,
  STOPS,
  VOICE,
  VOICE_ESTIMATED,
  dur,
  hhmm,
  toMin,
} from "./data/tide";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/**
 * 나레이션이 온 뒤에 고르려 했는데 크레딧이 안 풀려 계속 무음이었다.
 * **무음으로 두느니 다른 편들처럼 깐다.** 목소리가 생기면 그때
 * 균형을 다시 잡는다.
 */
const HAS_BGM = true;

const BG = "#0E1418";
const LAND = "#2F2820";
/** 물 */
const SEA = "#16303A";
const HOT = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";

const HOOK = Math.round(HOOK_SEC * FPS);

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
export const TIDE_DURATION = BODY_END + Math.round(OUTRO_SEC * FPS);

/* ── 화면 좌표 ──
   이 편은 카메라가 안 움직인다. 관측소가 위도로 한 줄이라 지도를
   한 번 잡아 두면 그 안에서 물만 오르내린다.

   서해안 열한 곳을 세로로 펴서 위(강화대교)에서 아래(진도)까지
   화면을 채운다. 쇼츠 UI가 덮는 위 352px과 아래 240px을 피하고,
   밑에 글자 블록 자리를 남긴다. */
const TOP_SY = 400;
const BOT_SY = 1330;
const YS = ST.map((s) => s.y);
const XS = ST.map((s) => s.x);
const K = (BOT_SY - TOP_SY) / (Math.max(...YS) - Math.min(...YS));
const SY0 = TOP_SY - Math.min(...YS) * K;
/** 관측소 줄이 화면 가로 이 자리에 오게 */
const COL_X = 380;
const SX0 = COL_X - ((Math.min(...XS) + Math.max(...XS)) / 2) * K;
const sx = (x: number) => x * K + SX0;
const sy = (y: number) => y * K + SY0;
/** 같은 변환을 지도 SVG에도 먹인다 */
const VIEW = `${-SX0 / K} ${-SY0 / K} ${1080 / K} ${1920 / K}`;

/* ── 물 막대 ──
   관측소마다 가로 막대 하나. 길이가 그 지점 조위(0~1)다.
   **시작점을 하나로 맞춘다.** 점은 해안을 따라 들쭉날쭉한데
   막대까지 들쭉날쭉하면 길이를 못 견준다. */
const BAR_X = 500;
const BAR_W = 340;
const BAR_H = 13;

function level(s: (typeof ST)[number], min: number): number {
  const m = Math.max(0, Math.min(1440, min));
  const i = Math.floor(m);
  const f = m - i;
  const a = s.level[i];
  const b = s.level[Math.min(1440, i + 1)];
  return a + (b - a) * f;
}

/** 시계가 지나온 마지막 만조. 이름 옆에 그 시각이 붙는다 */
function lastHigh(s: (typeof ST)[number], min: number): string | null {
  let out: string | null = null;
  for (const h of s.highs) if (toMin(h) <= min) out = h;
  return out;
}

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

/** 그 프레임의 시각(분). 걸음마다 시계를 다음 자리까지 돌린다 */
function clockAt(frame: number): number {
  if (frame < HOOK) return 0;
  if (frame >= BODY_END) return STOPS[STOPS.length - 1];
  const i = beatAt(frame);
  const from = i === 0 ? 0 : STOPS[i - 1];
  const t = (frame - SLOTS[i].t0) / (SLOTS[i].t1 - SLOTS[i].t0);
  return from + (STOPS[i] - from) * ease(t);
}

export const ShortsTide: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 12, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const min = clockAt(frame);
  const fade = interpolate(frame - SLOTS[bi].t0, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 자를 대는 걸음. 시계를 치우고 표를 놓는다 */
  const ruler = started && !inOutro && bi === 3;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-td.wav")} volume={0.4} />}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          const at =
            i === 0 ? 0 : i <= STOPS.length ? SLOTS[i - 1].t0 + 4 : BODY_END + 6;
          return (
            <Audio
              key={v.file}
              src={staticFile(v.file)}
              volume={(f) =>
                f >= at && f < at + Math.round(v.sec * FPS) + 4 ? 1 : 0
              }
            />
          );
        })}

      {/* ── 지도 ── */}
      <svg
        viewBox={VIEW}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={1 / K} />
        ))}
      </svg>

      {/* ── 관측소 · 물 막대 ── */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {ST.map((s) => {
          const y = sy(s.y);
          const v = started ? level(s, min) : level(s, 0);
          const hi = lastHigh(s, min);
          /**
           * 지금 만조에 앉아 있나. 마루가 지나가는 순간이 빛난다.
           *
           * **높이가 아니라 시각으로 잰다.** 막대는 그날 최저~최고를
           * 0~1로 편 값이라, 두 번째 만조는 첫 번째보다 낮아서
           * 1에 안 닿는다(진도는 0.87까지다). 높이로 재면 낮 만조가
           * 안 빛난다.
           */
          const crest = s.highs.some((h) => Math.abs(toMin(h) - min) <= 22);
          return (
            <g key={s.code}>
              {/* 점에서 막대까지. 어느 줄인지만 잇는다 */}
              <line
                x1={sx(s.x) + 11}
                y1={y}
                x2={BAR_X - 6}
                y2={y}
                stroke={DIM}
                strokeWidth={1}
                opacity={0.28}
              />
              {/* 막대가 다 차면 여기까지 */}
              <rect
                x={BAR_X}
                y={y - BAR_H / 2}
                width={BAR_W}
                height={BAR_H}
                rx={BAR_H / 2}
                fill={SEA}
                opacity={0.55}
              />
              <rect
                x={BAR_X}
                y={y - BAR_H / 2}
                width={Math.max(BAR_H, BAR_W * v)}
                height={BAR_H}
                rx={BAR_H / 2}
                fill={crest ? HOT : "#3E7C8C"}
              />
              <circle
                cx={sx(s.x)}
                cy={y}
                r={crest ? 9 : 6}
                fill={crest ? HOT : INK}
              />
              <text
                x={sx(s.x) - 18}
                y={y + 9}
                fontSize={26}
                fontWeight={900}
                fill={crest ? HOT : INK}
                textAnchor="end"
              >
                {s.name}
                {hi ? (
                  <tspan fill={crest ? HOT : DIM} dx={12}>
                    {hi}
                  </tspan>
                ) : null}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 글자 자리를 비운다. 제주도가 시계 뒤로 들어와 겹친다 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 560,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}E6 34%, ${BG} 58%)`,
        }}
      />

      {/* ── 시계 · 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: fade,
          }}
        >
          {ruler ? (
            /* 자를 대는 자리. 절반에 가깝다는 것이 곧 정반대라는 뜻이다 */
            <div style={{ fontVariantNumeric: "tabular-nums" }}>
              {([
                ["만조에서 만조까지", dur(PERIOD_MIN), DIM],
                ["그 절반", dur(HALF_MIN), DIM],
                [
                  `${SOUTH.name} → ${NORTH.name}`,
                  dur(RISE.min),
                  HOT,
                ],
              ] as const).map(([k, v, col]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    color: col,
                    fontWeight: 900,
                    marginTop: 12,
                  }}
                >
                  <span style={{ fontSize: 40 }}>{k}</span>
                  <span style={{ fontSize: col === HOT ? 62 : 48 }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                style={{
                  color: INK,
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hhmm(min)}
              </div>
              {bi === 0 && (
                <div style={cap}>{SOUTH.name} 만조</div>
              )}
              {bi === 2 && (
                <>
                  <div style={cap}>{NORTH.name} 만조</div>
                  <div style={big}>{dur(RISE.min)}</div>
                </>
              )}
              {bi === 4 && (
                <>
                  <div style={cap}>
                    {SOUTH.name} 만조 {FLIP.southHigh} · {NORTH.name} 간조{" "}
                    {FLIP.northLow}
                  </div>
                  <div style={big}>{FLIP.min}분 차이</div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 마무리는 질문으로 연다 ── */}
      {inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: outroIn,
          }}
        >
          <div
            style={{
              color: HOT,
              fontSize: 62,
              fontWeight: 900,
              lineHeight: 1.16,
            }}
          >
            <div>같은 서해</div>
            <div>물때는 6시간 차이</div>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.2,
              marginTop: 20,
            }}
          >
            갯벌 가실 때 어디 물때를 보시나요?
          </div>
        </div>
      )}

      {/* ── 훅 — 답이 아니라 질문이다 ── */}
      {hookOut > 0 && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: hookOut,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.18,
              textShadow: `0 0 40px ${BG}`,
            }}
          >
            {SOUTH.name}가 만조일 때
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 4,
            }}
          >
            {NORTH.name}은?
          </div>
        </div>
      )}

      {/* 무엇을 세고 어디서 잰 값인지는 다 적는다 */}
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          right: SAFE_RIGHT,
          bottom: BOTTOM_INSET + 14,
          color: DIM,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        조위관측소 {ST.length}곳 · {DAY} 조석예보
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

const cap: React.CSSProperties = {
  color: INK,
  fontSize: 44,
  fontWeight: 900,
  marginTop: 8,
};
const big: React.CSSProperties = {
  color: HOT,
  fontSize: 76,
  fontWeight: 900,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};
