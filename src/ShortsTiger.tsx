import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  ASPECT,
  BEATS,
  COUNTS,
  HERO,
  MARKS,
  NAMED,
  POLYS,
  TAIL,
  WALLS,
  WIDE,
  when,
} from "./data/tiger";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

const BG = "#0A0908";
/** 성곽 */
const WALL = "#A8916B";
/** 기록이 켜지는 색 */
const FIRE = "#E8A13C";
/** 궁궐 안 — 이 편의 절정 */
const HOT = "#E5533C";
const INK = "#F2EBE0";
const DIM = "#8A8172";

/**
 * 한 기록에 머무는 시간(초).
 *
 * 1751년(경복궁)이 제일 길다. 그 앞 둘은 조여드는 자리라 짧고,
 * 뒤의 둘은 '한 번이 아니었다'를 말하는 자리라 다시 늘린다.
 */
const HOLD = [3.4, 4.2, 3.4, 3.6, 3.4, 6.0, 4.0, 5.2];

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  BEATS.forEach((_, i) => {
    const len = Math.round(HOLD[i] * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(7.0 * FPS);
export const TIGER_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/* ── 지도 자리 ──────────────────────────────────────
   도성은 가로 5km다. 전국 투영으로는 점 하나가 되므로 도성 전용
   투영을 썼다(scripts/prep-tiger.py). 화면에서는 정사각에 가깝게
   앉힌다 — 성곽이 남북으로 조금 길다. */
const MAP_W = 700;
const MAP_L = (1080 - MAP_W) / 2;
const MAP_T = 618;
const MAP_H = Math.round(MAP_W * ASPECT);

/** 카메라가 다음 자리로 날아가는 시간 */
const FLY = Math.round(1.0 * FPS);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ── 연표 ──────────────────────────────────────────
   1392에서 1843까지 451년. 지도만 있으면 여덟 걸음이 다 같은
   그림으로 보인다 — 무엇이 얼마나 떨어져 있는지는 이 띠가 말한다. */
const T0 = 1392;
const T1 = 1843;
const TL_L = TEXT_X;
const TL_R = 1080 - SAFE_RIGHT;
const TL_Y = 574;
const tx = (ce: number) => TL_L + ((ce - T0) / (T1 - T0)) * (TL_R - TL_L);

export const ShortsTiger: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const b = BEATS[bi];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 이 걸음이 시작한 지 몇 프레임 */
  const age = frame - SLOTS[bi].t0;
  const on = interpolate(age, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 궁궐 안으로 들어온 기록인가 */
  const inPalace = b.label.includes("궁");
  const c = inPalace ? HOT : FIRE;
  /** 자리를 모르는 기록 — 성곽 전체가 켜진다 */
  const wide = b.x === null;
  const glow = wide && started && !inOutro ? on : 0;

  /**
   * 카메라.
   *
   * 자리를 아는 걸음에서는 그 궁궐로 붙고, 모르는 걸음에서는 도성
   * 전체로 물러선다. 지도가 한 장으로 고정돼 있으면 여덟 걸음이
   * 다 같은 그림이 된다 — 16편에서 배운 것이다.
   */
  const cam = (() => {
    if (!started) return WIDE;
    if (inOutro) return WIDE;
    const to = b.cam;
    const from = bi === 0 ? WIDE : BEATS[bi - 1].cam;
    const t = ease(
      interpolate(frame, [SLOTS[bi].t0, SLOTS[bi].t0 + FLY], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    return {
      cx: from.cx + (to.cx - from.cx) * t,
      cy: from.cy + (to.cy - from.cy) * t,
      w: from.w + (to.w - from.w) * t,
    };
  })();
  const camH = cam.w * ASPECT;
  const viewBox = `${cam.cx - cam.w / 2} ${cam.cy - camH / 2} ${cam.w} ${camH}`;
  /** 붙을수록 선을 얇게 — 안 그러면 담장이 뭉개진다 */
  const stroke = cam.w / 190;
  /** 이름표는 멀리 있을 때만. 붙으면 글자가 담장을 덮는다 */
  const far = Math.max(0, Math.min(1, (cam.w - 300) / 220));

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-tg.wav")} volume={0.9} />

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
          <div style={{ color: DIM, fontSize: 29, fontWeight: 700, letterSpacing: 2 }}>
            조선왕조실록
          </div>
          <div
            style={{
              color: INK,
              fontSize: 112,
              fontWeight: 900,
              lineHeight: 0.98,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {b.ce}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
            <span style={{ color: "#B7AC98", fontSize: 38, fontWeight: 800 }}>{when(b)}</span>
            <span style={{ color: c, fontSize: 44, fontWeight: 900 }}>{b.label}</span>
          </div>
        </div>
      )}

      {/* ── 연표 — 451년 ── */}
      {started && !inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <line x1={TL_L} y1={TL_Y} x2={TL_R} y2={TL_Y} stroke="#3A342B" strokeWidth={3} />
          <text x={TL_L} y={TL_Y + 30} fontSize={24} fontWeight={800} fill="#6E6555">
            1392
          </text>
          <text x={TL_R} y={TL_Y + 30} fontSize={24} fontWeight={800} fill="#6E6555"
                textAnchor="end">
            1843
          </text>
          {[...BEATS.map((x) => ({ ce: x.ce, hot: x.label.includes("궁") })),
            ...TAIL.map((t) => ({ ce: Number(t.ce), hot: t.where.includes("궁") }))].map(
            (t, i) => {
              const seen = i < BEATS.length ? frame >= SLOTS[i].t0 : false;
              const cur = i === bi;
              return (
                <circle
                  key={t.ce + "-" + i}
                  cx={tx(t.ce)}
                  cy={TL_Y}
                  r={cur ? 9 : 5}
                  fill={cur ? (t.hot ? HOT : FIRE) : seen ? "#7A6E58" : "#332E27"}
                />
              );
            }
          )}
          <line x1={tx(b.ce)} y1={TL_Y - 22} x2={tx(b.ce)} y2={TL_Y + 22}
                stroke={c} strokeWidth={3} opacity={0.7} />
        </svg>
      )}

      {/* ── 도성 ── */}
      <svg
        viewBox={viewBox}
        style={{
          position: "absolute",
          left: MAP_L,
          top: MAP_T,
          width: MAP_W,
          height: MAP_H,
        }}
      >
        {/*
          궁궐 담장. 클로즈업했을 때 '이 안으로 들어왔다'가 면으로
          보인다. OSM 관계와 way가 정의한 경계라 지어낸 선이 아니다.
        */}
        {BEATS.map((bb, i) => {
          if (!bb.poly || !started || frame < SLOTS[i].t0) return null;
          const cur = i === bi && !inOutro;
          return (
            <path
              key={"p" + bb.id}
              d={POLYS[bb.poly]}
              fill={HOT}
              fillOpacity={cur ? 0.1 + on * 0.16 : 0.06}
              stroke={HOT}
              strokeWidth={stroke * 1.6}
              strokeOpacity={cur ? 0.85 : 0.3}
            />
          );
        })}
        {/*
          성곽. OSM의 75조각을 이어 붙이지 않고 그대로 그린다.
          닫힌 고리가 아니라 안쪽을 칠할 수 없다 — 그래서 '성 안'
          기록은 면이 아니라 성곽선 자체가 밝아지는 것으로 말한다.
        */}
        {WALLS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={WALL}
            strokeWidth={stroke * 1.5 + glow * 3}
            strokeOpacity={0.7 + glow * 0.3}
            strokeLinecap="round"
          />
        ))}
        {glow > 0 &&
          WALLS.map((d, i) => (
            <path
              key={"g" + i}
              d={d}
              fill="none"
              stroke={FIRE}
              strokeWidth={stroke * 4}
              strokeOpacity={glow * 0.22}
              strokeLinecap="round"
            />
          ))}

        {/* 궁궐·산·문 — 0프레임부터 서 있다 */}
        {NAMED.map((n) => {
          const [x, y] = MARKS[n.k];
          return (
            <g key={n.k} opacity={far}>
              <circle cx={x} cy={y} r={stroke * 1.3} fill="#5C5445" />
              <text
                x={x + (n.dx ?? 0) * (stroke / 3)}
                y={y + (n.dy ?? 0) * (stroke / 3)}
                fontSize={stroke * 6.3}
                fontWeight={800}
                fill="#6E6555"
                textAnchor={n.anchor ?? "start"}
              >
                {n.k}
              </text>
            </g>
          );
        })}

        {/* 지나온 기록은 남는다 */}
        {BEATS.map((bb, i) => {
          if (bb.x === null || !started || frame < SLOTS[i].t0) return null;
          const cur = i === bi && !inOutro;
          const col = bb.label.includes("궁") ? HOT : FIRE;
          const o = cur ? 1 : 0.5;
          return (
            <g key={bb.id} opacity={o}>
              {cur &&
                [0, 1, 2].map((k) => {
                  const p = ((frame - SLOTS[i].t0) / 30 + k / 3) % 1;
                  return (
                    <circle
                      key={k}
                      cx={bb.x!}
                      cy={bb.y!}
                      r={stroke * 3 * (1 + p * 4)}
                      fill="none"
                      stroke={col}
                      strokeWidth={stroke}
                      opacity={(1 - p) * 0.6}
                    />
                  );
                })}
              <circle cx={bb.x!} cy={bb.y!} r={stroke * (cur ? 3.6 : 2.3)} fill={col} />
            </g>
          );
        })}
      </svg>

      {/* ── 원문 — 이 편의 큰 글씨 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 88,
            opacity: on,
          }}
        >
          <div
            style={{
              color: c,
              fontSize: b.key.length > 5 ? 108 : 136,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 6,
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {b.key}
          </div>
          <div
            style={{
              color: INK,
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.22,
              marginTop: 14,
              wordBreak: "keep-all",
              textShadow: `0 0 24px ${BG}`,
            }}
          >
            {b.line}
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(10,9,8,0.97)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>
            원문 虎入 · 실록에 {COUNTS["虎入"]}건
          </div>
          {[...BEATS.map((x) => ({ ce: String(x.ce), when: when(x), han: x.key, where: x.label })), ...TAIL].map(
            (t, i) => {
              const at = BODY_END + Math.round((0.3 + i * 0.22) * FPS);
              const o = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const hot = t.where.includes("궁");
              return (
                <div
                  key={t.ce + t.when}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 16,
                    marginTop: 7,
                    opacity: o,
                    transform: `translateY(${(1 - o) * 8}px)`,
                  }}
                >
                  <span
                    style={{
                      color: hot ? HOT : "#8A8172",
                      fontSize: 36,
                      fontWeight: 900,
                      width: 104,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.ce}
                  </span>
                  <span
                    style={{
                      color: hot ? HOT : INK,
                      fontSize: 31,
                      fontWeight: 900,
                      width: 292,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.han}
                  </span>
                  <span style={{ color: "#8A8172", fontSize: 28, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {t.where}
                  </span>
                </div>
              );
            }
          )}
          <div
            style={{
              color: INK,
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.3,
              marginTop: 22,
              wordBreak: "keep-all",
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(3.4 * FPS), BODY_END + Math.round(4.1 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            1392년부터 1843년까지 · 성곽은 지금 남은 선
          </div>
        </AbsoluteFill>
      )}

      {/*
        훅.

        가운데에 두면 도성을 통째로 덮어서 0프레임이 글자판이 된다.
        본체의 원문이 서는 자리에 그대로 앉힌다 — 훅의 虎入舊闕이
        첫 걸음의 虎入城으로 갈아 끼워지는 것으로 이어진다.
      */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(10,9,8,0.4)" }}
          />
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: BOTTOM_INSET + 88,
              opacity: hookOut,
            }}
          >
            <div
              style={{
                color: HOT,
                fontSize: 136,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: 6,
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              {HERO.key}
            </div>
            <div
              style={{
                color: INK,
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.18,
                marginTop: 14,
                wordBreak: "keep-all",
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              경복궁에 들어온 호랑이
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
