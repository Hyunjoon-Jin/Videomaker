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
  CAST,
  CORR,
  EX_BEATS,
  HERO,
  T_MAX,
  T_MIN,
  deg,
  dLabel,
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
 * 이 편은 값이 흐르지 않는다.
 *
 * 다른 편들은 계기판이 연도를 훑고 그 사이를 잇는다. 여기는 기록이
 * 난 날 셋(2018-08-01, 1981-01-05, 2026-08-02)이 서로 37년씩 떨어져
 * 있어서, 그 사이를 이으면 아무 뜻 없는 숫자가 지나간다. 날짜는
 * 비트마다 갈아 끼우고 흐르지 않는다.
 *
 * 그래서 layoutBeats의 value는 안 쓴다. 구간만 받아 쓴다.
 */
const BEATS = EX_BEATS.map((e, i) =>
  beatFor(i, { title: e.title, detail: e.detail }, e.impact, FPS)
);
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(9.0 * FPS);
export const EX_DURATION = BODY_END + OUTRO;

/** 여름 — 달군 쇠 */
const HOT = "#C4553A";
const HOT_DIM = "#6E3325";
/** 겨울 — 언 물 */
const COLD = "#5C87A8";
const COLD_DIM = "#2F4A5E";
const BG = "#14120F";

/** 막대판이 앉는 자리 */
const CH_TOP = 640;
const CH_BOT = 1500;
const CH_H = CH_BOT - CH_TOP;
/** 0℃ 선 */
const ZERO_Y = CH_BOT - CH_H * tNorm(0);
/** 온도 → 화면 y */
const ty = (t: number) => CH_BOT - CH_H * tNorm(t);

/** 일곱 칸 */
const CH_L = TEXT_X;
const CH_R = 1080 - SAFE_RIGHT;
const COL_W = (CH_R - CH_L) / CAST.length;
const BAR_W = Math.round(COL_W * 0.5);

/**
 * 전국 96개.
 *
 * 처음에는 막대 96개로 그렸는데, 앞의 일곱과 굵기만 다른 막대가 섞여
 * 무엇이 무엇인지 안 읽혔다. 순위표가 아니라 '전국이 이 범위 안에
 * 있다'는 분포라서, 사이를 띄우지 않고 계단 하나로 잇는다. 이름도
 * 눈금도 안 붙인다.
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

export const ShortsExtremes: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = Math.max(0, beatIndexAt(SPANS, frame));
  const ev = EX_BEATS[bi];
  const inOutro = frame >= BODY_END;

  /**
   * 계기판 날짜.
   *
   * 앞 비트 것을 이어 쓰게 했다가, 대관령 비트에 '1981년 1월 5일'이
   * 걸렸다. 대관령의 기록은 1974년 1월 24일이다. 계기판이 자막과 다른
   * 것을 가리키면 표준시 편에서 겪은 그대로다. 날짜를 가진 비트에서만
   * 켠다.
   */
  const date = ev?.date ?? null;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uiOn = frame >= HOOK - 4;

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 전국 실루엣 */
  const natOn = interpolate(
    frame,
    ev?.nation
      ? [SPANS[bi].t1, SPANS[bi].t1 + Math.round(1.0 * FPS)]
      : [BODY_END, BODY_END + 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 막대가 자라는 진행 — 지점이 켜진 비트에서부터 */
  const grow = (idx: number) => {
    let at = SPANS[0].t1;
    for (let i = 0; i < EX_BEATS.length; i++) {
      if (EX_BEATS[i].cast > idx) {
        at = SPANS[i].t1;
        break;
      }
    }
    return interpolate(frame, [at, at + Math.round(0.55 * FPS)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  /** 겨울 막대가 열리는 시점 — 두 번째 비트부터 */
  const coldOn = interpolate(
    frame,
    [SPANS[1].t1, SPANS[1].t1 + Math.round(0.7 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const shown = inOutro ? CAST.length : ev.cast;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ex.wav")} volume={0.9} />

      {/* ── 지도 — 뒤에 옅게. 이 편의 그림은 막대라 지도는 자리만 알려준다 ── */}
      <AbsoluteFill style={{ opacity: inOutro ? 0.32 : 0.62 }}>
        <svg
          viewBox="150 180 780 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill="#231F19" stroke="#38312A" strokeWidth={1.6} />
          ))}
          {/*
            지도와 막대판이 같은 자리를 쓴다. 지점 이름을 양쪽에 다 달았더니
            '홍천'이 대구 막대의 40.0을 덮었다. 그래서 지도가 이름을 다는 것은
            주인공 하나뿐이고, 그것도 다른 막대가 들어오기 전까지다. 그 뒤로
            지도는 배경으로만 남는다 — 이름은 막대가 들고 있다.
          */}
          {/* 훅에서는 안 켠다. '같은 곳'이 어디냐고 물어놓고 지도에 답을 적어두면
              훅이 할 일이 없다. */}
          {shown === 1 && !inOutro && frame >= HOOK && (
            <g>
              <circle cx={HERO.x} cy={HERO.y} r={13} fill={INK.bone} />
              <text
                x={HERO.x + 20}
                y={HERO.y + 10}
                fontSize={32}
                fontWeight={900}
                fill={INK.bone}
                style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 8 }}
              >
                {HERO.name}
              </text>
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ── 계기판 — 기록이 난 날 ── */}
      {uiOn && !inOutro && date && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            기록이 난 날
          </div>
          <div style={{ color: C.text, fontSize: 76, fontWeight: 900, lineHeight: 1.15 }}>
            {dLabel(date)}
          </div>
        </div>
      )}

      {/* ── 막대판 ── */}
      {uiOn && !inOutro && (
        <AbsoluteFill>
          <svg
            viewBox="0 0 1080 1920"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {/* 전국 96개 실루엣 — 순위표가 아니라 분포다. 이름도 눈금도 안 붙인다. */}
            {natOn > 0 && (
              <g opacity={natOn * 0.42}>
                <path d={natPath("hi")} fill="#5A2A1E" />
                <path d={natPath("lo")} fill="#263D4D" />
              </g>
            )}

            {/* 0℃ 선 — 막대가 어디서 갈라지는지 알려주는 유일한 눈금 */}
            <line x1={CH_L} y1={ZERO_Y} x2={CH_R} y2={ZERO_Y} stroke="#5A5348" strokeWidth={2} />
            <text x={CH_R + 8} y={ZERO_Y + 9} fontSize={26} fontWeight={700} fill={C.dim}>
              0℃
            </text>

            {CAST.slice(0, shown).map((s, i) => {
              const g = grow(i);
              const cx = CH_L + COL_W * i + COL_W / 2;
              const x = cx - BAR_W / 2;
              const hero = i === 0;
              const hiH = (ZERO_Y - ty(s.hi)) * g;
              const loH = (ty(s.lo) - ZERO_Y) * g * (ev?.show === "hi" && !inOutro ? 0 : coldOn);
              return (
                <g key={s.stn}>
                  <rect
                    x={x}
                    y={ZERO_Y - hiH}
                    width={BAR_W}
                    height={hiH}
                    fill={hero ? HOT : HOT_DIM}
                  />
                  <rect x={x} y={ZERO_Y} width={BAR_W} height={loH} fill={hero ? COLD : COLD_DIM} />

                  {/* 값은 막대 끝에. 주인공만 크게. */}
                  {g > 0.9 && (
                    <text
                      x={cx}
                      y={ZERO_Y - hiH - 14}
                      fontSize={hero ? 34 : 26}
                      fontWeight={900}
                      fill={hero ? "#E8A88F" : "#9C7A6C"}
                      textAnchor="middle"
                    >
                      {s.hi.toFixed(1)}
                    </text>
                  )}
                  {loH > 6 && (
                    <text
                      x={cx}
                      y={ZERO_Y + loH + 34}
                      fontSize={hero ? 34 : 26}
                      fontWeight={900}
                      fill={hero ? "#9DBBD1" : "#6B8395"}
                      textAnchor="middle"
                    >
                      {s.lo.toFixed(1)}
                    </text>
                  )}
                  {/* 지점 이름은 0선 바로 아래, 막대와 겹치지 않게 가로로 눕힌다 */}
                  <text
                    x={cx}
                    y={ZERO_Y - 12}
                    fontSize={hero ? 30 : 25}
                    fontWeight={hero ? 900 : 700}
                    fill={hero ? INK.bone : "#8A8172"}
                    textAnchor="middle"
                    style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 7 }}
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 자막 ── */}
      {uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 56,
          }}
        >
          <div style={{ color: INK.brass, fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
            {ev.kicker}
          </div>
          <Typed
            text={ev.title}
            start={SPANS[bi].t1}
            cps={14}
            style={{ display: "block", color: C.text, fontSize: 56, fontWeight: 900 }}
          />
          <Typed
            text={ev.detail}
            start={SPANS[bi].t1 + Math.ceil((ev.title.length * 30) / 14) + 5}
            cps={26}
            style={{ display: "block", color: C.dim, fontSize: 33, fontWeight: 700, marginTop: 4 }}
          />
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{ backgroundColor: "rgba(20,18,15,0.55)", opacity: outroIn }}
          />
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
                marginBottom: 18,
              }}
            >
              한 지점이 겪은 폭
            </div>

            {CAST.map((s, i) => {
              const at = BODY_END + Math.round((0.6 + i * 0.33) * FPS);
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
                    gap: 18,
                    marginTop: 6,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 12}px)`,
                  }}
                >
                  <span
                    style={{
                      color: hero ? INK.bone : C.dim,
                      fontSize: hero ? 46 : 38,
                      fontWeight: hero ? 900 : 800,
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      color: hero ? "#E8A88F" : "#8A7266",
                      fontSize: 32,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.hi.toFixed(1)}
                  </span>
                  <span style={{ color: "#5A5348", fontSize: 26 }}>／</span>
                  <span
                    style={{
                      color: hero ? "#9DBBD1" : "#66808F",
                      fontSize: 32,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.lo.toFixed(1)}
                  </span>
                  <span
                    style={{
                      color: hero ? C.text : C.dim,
                      fontSize: hero ? 48 : 40,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 130,
                      textAlign: "right",
                    }}
                  >
                    {s.gap.toFixed(1)}
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
                  [BODY_END + Math.round(4.2 * FPS), BODY_END + Math.round(4.9 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              제일 더운 곳과 제일 추운 곳을
              <br />
              따로 찾는 게 틀린 물음
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(20,18,15,0.58)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: "#E8A88F", fontSize: 150, fontWeight: 900, lineHeight: 1.06 }}>
            {deg(HERO.hi)}
          </div>
          <div style={{ color: "#9DBBD1", fontSize: 150, fontWeight: 900, lineHeight: 1.06 }}>
            {deg(HERO.lo)}
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 56,
              fontWeight: 800,
              marginTop: 22,
              wordBreak: "keep-all",
            }}
          >
            같은 곳에서 잰 온도
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
