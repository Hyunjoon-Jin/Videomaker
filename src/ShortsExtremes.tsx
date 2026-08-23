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
  ALL,
  COUNTDOWN,
  EX_BEATS,
  FOILS,
  TOP,
  T_MAX,
  T_MIN,
  tNorm,
} from "./data/extremes";
import { beatFor, beatIndexAt, layoutBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

/**
 * 자막이 짧아지면 체류도 짧아진다.
 *
 * beatFor는 글자 수로 체류를 정하는데, 이 편은 자막이 한 줄뿐이라
 * 3초가 채 안 나온다. 그런데 화면에서는 막대가 자라고 순위가 한 칸씩
 * 쌓이는 동작이 있어서 글자보다 그림이 오래 걸린다. 그래서 비트마다
 * 얹는다. 1위는 더 얹는다 — 마지막 칸은 서 있어야 한다.
 */
const EXTRA = [1.0, 1.1, 1.1, 1.1, 1.4, 2.4];

const BEATS = EX_BEATS.map((e, i) => {
  const b = beatFor(i, { title: e.line }, e.impact, FPS);
  return { ...b, hold: b.hold + Math.round(EXTRA[i] * FPS) };
});
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(8.0 * FPS);
export const EX_DURATION = BODY_END + OUTRO;

/** 여름 — 달군 쇠 */
const HOT = "#C4553A";
const HOT_DIM = "#6E3325";
/** 겨울 — 언 물 */
const COLD = "#5C87A8";
const COLD_DIM = "#2F4A5E";
const BG = "#14120F";

/*
 * 막대판 자리.
 *
 * 처음에 아래를 1470까지 내렸더니 막대 밑의 폭 숫자(67.4)가 자막의
 * 첫 줄과 겹쳤다. 판을 통째로 올려 자막 위로 100px을 비운다.
 */
const CH_TOP = 660;
const CH_BOT = 1360;
const CH_H = CH_BOT - CH_TOP;
/** 0℃ 선 */
const ZERO_Y = CH_BOT - CH_H * tNorm(0);
const ty = (t: number) => CH_BOT - CH_H * tNorm(t);

const CH_L = TEXT_X;
const CH_R = 1080 - SAFE_RIGHT;

/** 카운트다운 다섯 칸 */
const COL_W = (CH_R - CH_L) / COUNTDOWN.length;
const BAR_W = Math.round(COL_W * 0.52);

/** 순위 밖 둘은 가운데에 따로 세운다 */
const FOIL_W = 150;

/**
 * 전국 96개.
 *
 * 순위표가 아니라 '전국이 이 범위 안에 있다'는 분포다. 사이를 띄우지
 * 않고 계단 하나로 잇는다. 이름도 눈금도 안 붙인다.
 */
const NAT = [...ALL].sort((a, b) => b.gap - a.gap);
const NAT_W = (CH_R - CH_L) / NAT.length;

function natPath(key: "hi" | "lo"): string {
  const d: string[] = [`M${CH_L} ${ZERO_Y}`];
  NAT.forEach((s, i) => {
    const y = ty(s[key]);
    d.push(`L${CH_L + i * NAT_W} ${y}`, `L${CH_L + (i + 1) * NAT_W} ${y}`);
  });
  d.push(`L${CH_R} ${ZERO_Y}`, "Z");
  return d.join("");
}

/** 위아래로 뻗는 막대 한 벌 */
const Bar: React.FC<{
  s: { hi: number; lo: number; gap: number; name: string };
  cx: number;
  w: number;
  g: number;
  lit: boolean;
  rank?: number;
}> = ({ s, cx, w, g, lit, rank }) => {
  const hiH = (ZERO_Y - ty(s.hi)) * g;
  const loH = (ty(s.lo) - ZERO_Y) * g;
  return (
    <g>
      <rect x={cx - w / 2} y={ZERO_Y - hiH} width={w} height={hiH} fill={lit ? HOT : HOT_DIM} />
      <rect x={cx - w / 2} y={ZERO_Y} width={w} height={loH} fill={lit ? COLD : COLD_DIM} />
      {g > 0.85 && (
        <>
          <text
            x={cx}
            y={ZERO_Y - hiH - 16}
            fontSize={lit ? 36 : 28}
            fontWeight={900}
            fill={lit ? "#E8A88F" : "#9C7A6C"}
            textAnchor="middle"
          >
            {s.hi.toFixed(1)}
          </text>
          <text
            x={cx}
            y={ZERO_Y + loH + 38}
            fontSize={lit ? 36 : 28}
            fontWeight={900}
            fill={lit ? "#9DBBD1" : "#6B8395"}
            textAnchor="middle"
          >
            {s.lo.toFixed(1)}
          </text>
          {/* 순위와 이름은 0선 위에 얹는다. 막대 안이라 어디에도 안 걸린다. */}
          {rank !== undefined && (
            <text
              x={cx}
              y={ZERO_Y - 58}
              fontSize={lit ? 40 : 32}
              fontWeight={900}
              fill={lit ? INK.brass : "#7A6E5C"}
              textAnchor="middle"
              style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 8 }}
            >
              {rank}위
            </text>
          )}
          <text
            x={cx}
            y={ZERO_Y - 14}
            fontSize={lit ? 34 : 27}
            fontWeight={lit ? 900 : 700}
            fill={lit ? INK.bone : "#8A8172"}
            textAnchor="middle"
            style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 8 }}
          >
            {s.name}
          </text>
          {/* 폭 — 이 편이 세는 값이라 막대 아래에 크게 */}
          <text
            x={cx}
            y={ZERO_Y + loH + 104}
            fontSize={lit ? 44 : 32}
            fontWeight={900}
            fill={lit ? C.text : "#6F6656"}
            textAnchor="middle"
          >
            {s.gap.toFixed(1)}℃
          </text>
        </>
      )}
    </g>
  );
};

export const ShortsExtremes: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = Math.max(0, beatIndexAt(SPANS, frame));
  const ev = EX_BEATS[bi];
  const inOutro = frame >= BODY_END;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uiOn = frame >= HOOK - 4;

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 칸 하나가 자라는 진행 — 그 칸이 켜지는 비트부터 */
  const grow = (idx: number) => {
    const i = EX_BEATS.findIndex((b) => b.n > idx);
    const at = i < 0 ? SPANS[0].t1 : SPANS[i].t1;
    return interpolate(frame, [at, at + Math.round(0.6 * FPS)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  const foilOn = interpolate(
    frame,
    [SPANS[0].t1, SPANS[0].t1 + Math.round(0.5 * FPS), SPANS[1].t0, SPANS[1].t1],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 전국 분포는 1위가 선 뒤에 깔린다 */
  const last = SPANS[SPANS.length - 1];
  const natOn = interpolate(
    frame,
    [last.t1 + Math.round(1.6 * FPS), last.t1 + Math.round(2.4 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const n = inOutro ? COUNTDOWN.length : ev.n;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ex.wav")} volume={0.9} />

      {/* ── 지도 — 뒤에 옅게. 켜진 지점에 점만 찍는다 ── */}
      <AbsoluteFill style={{ opacity: inOutro ? 0.3 : 0.6 }}>
        <svg
          viewBox="150 180 780 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill="#231F19" stroke="#38312A" strokeWidth={1.6} />
          ))}
          {/* 이름은 안 단다. 막대가 이미 들고 있어서 겹치기만 한다. */}
          {COUNTDOWN.slice(0, n).map((s, i) => (
            <circle
              key={s.stn}
              cx={s.x}
              cy={s.y}
              r={i === n - 1 ? 12 : 7}
              fill={i === n - 1 ? INK.bone : "#6B6355"}
            />
          ))}
        </svg>
      </AbsoluteFill>

      {/* ── 계기판 — 무엇을 세는 값인지 한 번만 적는다 ── */}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            역대 최고 − 역대 최저
          </div>
          <div style={{ color: C.text, fontSize: 72, fontWeight: 900, lineHeight: 1.15 }}>
            기온 폭 순위
          </div>
        </div>
      )}

      {/* ── 막대판 ── */}
      {uiOn && !inOutro && (
        <AbsoluteFill>
          <svg viewBox="0 0 1080 1920" style={{ width: "100%", height: "100%", display: "block" }}>
            {natOn > 0 && (
              <g opacity={natOn * 0.28}>
                <path d={natPath("hi")} fill="#5A2A1E" />
                <path d={natPath("lo")} fill="#263D4D" />
              </g>
            )}

            <line x1={CH_L} y1={ZERO_Y} x2={CH_R} y2={ZERO_Y} stroke="#5A5348" strokeWidth={2} />
            <text x={CH_R + 8} y={ZERO_Y + 9} fontSize={26} fontWeight={700} fill={C.dim}>
              0℃
            </text>

            {/* 순위 밖 둘 — 첫 비트에만. '이 둘은 답이 아니다'를 먼저 치운다. */}
            {foilOn > 0 && (
              <g opacity={foilOn}>
                {FOILS.map((s, i) => (
                  <Bar
                    key={s.stn}
                    s={s}
                    cx={540 + (i - 0.5) * (FOIL_W + 60)}
                    w={FOIL_W}
                    g={1}
                    lit={false}
                    rank={s.rank}
                  />
                ))}
              </g>
            )}

            {/* 카운트다운 — 5위가 왼쪽, 1위가 오른쪽. 오른쪽으로 갈수록 길어진다. */}
            {COUNTDOWN.slice(0, n).map((s, i) => (
              <Bar
                key={s.stn}
                s={s}
                cx={CH_L + COL_W * i + COL_W / 2}
                w={BAR_W}
                g={grow(i)}
                lit={i === n - 1}
                rank={s.rank}
              />
            ))}
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 자막 — 한 줄. 순위·이름·숫자는 막대가 들고 있다. ── */}
      {uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 64,
          }}
        >
          <Typed
            text={ev.line}
            start={SPANS[bi].t1}
            cps={13}
            style={{ display: "block", color: C.text, fontSize: 58, fontWeight: 900 }}
          />
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill style={{ backgroundColor: "rgba(20,18,15,0.68)", opacity: outroIn }} />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
              opacity: outroIn,
            }}
          >
            <div
              style={{
                color: C.dim,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 16,
              }}
            >
              역대 기온 폭
            </div>

            {TOP.map((s, i) => {
              const at = BODY_END + Math.round((0.5 + i * 0.3) * FPS);
              const on = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const hero = i === 0;
              return (
                <div
                  key={s.stn}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 22,
                    marginTop: 8,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 12}px)`,
                  }}
                >
                  <span
                    style={{
                      color: hero ? INK.brass : "#6F6656",
                      fontSize: hero ? 46 : 38,
                      fontWeight: 900,
                      minWidth: 62,
                    }}
                  >
                    {s.rank}
                  </span>
                  <span
                    style={{
                      color: hero ? INK.bone : C.dim,
                      fontSize: hero ? 50 : 42,
                      fontWeight: hero ? 900 : 800,
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      color: hero ? C.text : C.dim,
                      fontSize: hero ? 54 : 44,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.gap.toFixed(1)}℃
                  </span>
                </div>
              );
            })}

            <div
              style={{
                color: C.text,
                fontSize: 46,
                fontWeight: 800,
                lineHeight: 1.34,
                marginTop: 26,
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(3.4 * FPS), BODY_END + Math.round(4.1 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              다섯 곳 다 바다에서 먼 내륙
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(20,18,15,0.56)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: "#E8A88F", fontSize: 132, fontWeight: 900, lineHeight: 1.04 }}>
            +40.1℃
          </div>
          <div style={{ color: "#9DBBD1", fontSize: 132, fontWeight: 900, lineHeight: 1.04 }}>
            −32.6℃
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 54,
              fontWeight: 800,
              marginTop: 24,
              wordBreak: "keep-all",
            }}
          >
            기온 폭 전국 1위인 동네
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
