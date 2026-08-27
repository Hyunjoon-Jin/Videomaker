import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  CASES,
  COUNT,
  HOLD,
  LINES,
  RANK,
  RANK_OF,
  SHAPES,
  TABLE,
  WIDE,
} from "./data/exclave";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/**
 * 바탕이 바다다.
 *
 * 이 편은 땅과 물이 갈라지는 그림이라 바탕을 채널 기본 먹색(#151310)
 * 대신 찬 쪽으로 옮겼다. 따뜻한 먹색 위에 따뜻한 땅색을 얹으면
 * 만 안쪽이 땅인지 물인지 안 읽힌다.
 */
const BG = "#101519";
/** 나머지 전국 */
const LAND = "#2F2820";
/** 사이에 낀 남의 땅 */
const NEIGH = "#7A6448";
/** 그 시·군의 본체 */
const MAIN = "#4C7A9B";
/** 자기 시·군과 안 붙은 조각 — 이 편의 색 */
const PIECE = "#D4694F";
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
const OUTRO = Math.round(8.0 * FPS);
export const EXCLAVE_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

/** 카메라가 다음 자리로 날아가는 시간 */
const FLY = Math.round(1.1 * FPS);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const ASPECT = 1920 / 1080;

/* ── 눈금 ──────────────────────────────────────────
   9조각을 작은 것에서 큰 것으로 세운 막대. 지도만 있으면 여덟
   걸음이 다 같은 그림으로 보인다 — 무엇이 얼마나 큰 조각인지는
   이 눈금이 말한다. */
const RK_Y = 772;
const RK_H = 96;
const RK_W = 60;
const RK_GAP = 22;
const RK_L = TEXT_X;
const MAXA = Math.max(...RANK.map((r) => r.area));

export const ShortsExclave: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const cs = CASES[bi];
  const lead = cs.pieces[cs.pieces.length - 1];
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

  /**
   * 카메라.
   *
   * 훅에서는 전국이고, 걸음마다 그 조각으로 붙는다. 세 색이 한
   * 화면에 들어와야 '끼어 있다'가 그림으로 읽힌다.
   */
  const cam = (() => {
    if (!started || inOutro) return WIDE;
    const to = cs.cam;
    const from = bi === 0 ? WIDE : CASES[bi - 1].cam;
    const t = ease(
      interpolate(frame, [SLOTS[bi].t0, SLOTS[bi].t0 + FLY], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    // 배율은 로그로 보간한다. 선형이면 앞이 훅 커지고 뒤가 느려진다.
    return {
      cx: from.cx + (to.cx - from.cx) * t,
      cy: from.cy + (to.cy - from.cy) * t,
      z: Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * t),
    };
  })();
  const camW = 1000 / cam.z;
  const camH = camW * ASPECT;
  const viewBox = `${cam.cx - camW / 2} ${cam.cy - camH / 2} ${camW} ${camH}`;
  /** 붙을수록 선을 얇게 — 안 그러면 경계가 크레용이 된다 */
  const sw = camW / 900;

  /**
   * 사이에 낀 남의 땅.
   *
   * 맞닿은 이웃을 다 칠하면 화면이 통째로 이웃색이 된다. 완주군
   * 화면에서 김제시까지 칠하니 서쪽 절반이 남의 땅으로 덮였다.
   * 최단선이 실제로 지나는 시·군만 칠한다 — 그것이 '지나야 하는
   * 남의 땅'이다.
   */
  const mine = cs.pieces.map((p) => p.name);
  const litNb =
    started && !inOutro
      ? [
          ...new Set(
            cs.pieces.flatMap((p) =>
              p.between.filter((b) => b.name !== "바다").map((b) => b.name)
            )
          ),
        ].filter((n) => !mine.includes(n))
      : [];

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-xc.wav")} volume={0.85} />

      {/* ── 지도 — 0프레임부터 전국이 떠 있다 ── */}
      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={sw * 0.8} />
        ))}

        {/* 사이에 낀 남의 땅 */}
        {litNb.map((n) =>
          SHAPES[n] ? (
            <path
              key={n}
              d={SHAPES[n]}
              fill={NEIGH}
              fillOpacity={0.35 + on * 0.65}
              stroke={BG}
              strokeWidth={sw * 0.8}
            />
          ) : null
        )}

        {/* 그 시·군의 본체 */}
        {started &&
          !inOutro &&
          cs.pieces.map((p) => (
            /*
              본체는 면으로 칠하되 옅게 둔다. 조각으로 바짝 붙으면
              본체가 화면보다 커서, 진하게 칠하면 그게 바탕이 되고
              바다가 땅처럼 읽힌다.
            */
            <path
              key={"m" + p.name}
              d={p.main}
              fill={MAIN}
              fillOpacity={0.55}
              stroke={MAIN}
              strokeWidth={sw * 1.4}
              strokeOpacity={0.9}
            />
          ))}

        {/*
          9조각의 자리.

          0프레임에 이미 다 찍혀 있다. 전국 구도에서는 조각이 점보다
          작아 폴리곤만으로는 안 보인다 — 어디에 몇 곳인지가 훅에서
          먼저 서야 한다.
        */}
        {CASES.map((c, i) =>
          c.pieces.map((p) => {
            const seen = started && frame >= SLOTS[i].t0;
            return (
              <circle
                key={"d" + p.name + p.area}
                cx={p.line[0][0]}
                cy={p.line[0][1]}
                r={sw * (seen ? 9 : 7)}
                fill={PIECE}
                fillOpacity={seen ? 0.95 : 0.5}
              />
            );
          })
        )}

        {/* 조각 — 지나온 것도 남는다 */}
        {CASES.map((c, i) =>
          !started || frame < SLOTS[i].t0
            ? null
            : c.pieces.map((p) => (
                <path
                  key={"p" + p.name + p.area}
                  d={p.piece}
                  fill={PIECE}
                  fillOpacity={i === bi && !inOutro ? 0.55 + on * 0.45 : 0.75}
                  stroke={PIECE}
                  strokeWidth={sw * 1.6}
                />
              ))
        )}

        {/* 본체까지 그은 직선 */}
        {started &&
          !inOutro &&
          cs.pieces.map((p) => {
            const [a, b] = p.line;
            const g = interpolate(age, [16, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <g key={"l" + p.name}>
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={a[0] + (b[0] - a[0]) * g}
                  y2={a[1] + (b[1] - a[1]) * g}
                  stroke={INK}
                  strokeWidth={sw * 1.6}
                  strokeDasharray={`${sw * 5} ${sw * 5}`}
                  opacity={0.85}
                />
                <circle cx={a[0]} cy={a[1]} r={sw * 2.4} fill={PIECE} />
                <circle cx={b[0]} cy={b[1]} r={sw * 2.4} fill={MAIN} opacity={g} />
              </g>
            );
          })}
      </svg>

      {/* 위아래 글자 자리를 눌러 지도가 글씨를 안 갉아먹게 한다 */}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${BG} 0%, ${BG}E0 20%, ${BG}00 40%,` +
            ` ${BG}00 66%, ${BG}CC 84%, ${BG}F2 100%)`,
        }}
      />

      {/* ── 계기판 ── */}
      {started && !inOutro && (
        <div
          style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}
        >
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {cs.pieces.map((p) => `${p.sido} ${p.name}`.replace(/^(\S+) \1/, "$1")).join(" · ")}
          </div>
          <div
            style={{
              color: PIECE,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {lead.area.toFixed(2)}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 12 }}>km²</span>
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 10, alignItems: "baseline" }}>
            <span style={{ color: INK, fontSize: 40, fontWeight: 900 }}>
              {lead.name} 땅의 {lead.pct}%
            </span>
            <span style={{ color: "#B7AC98", fontSize: 36, fontWeight: 800 }}>
              본체까지 직선 {lead.dist}km
            </span>
          </div>
          <div style={{ color: DIM, fontSize: 30, fontWeight: 700, marginTop: 8 }}>
            사이 —{" "}
            {lead.between.map((b) => `${b.name} ${b.km}km`).join(" · ")}
          </div>
        </div>
      )}

      {/* ── 눈금 — 9조각 ── */}
      {started && !inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* 지도 위에 그대로 얹으면 막대가 안 읽힌다 */}
          <rect
            x={RK_L - 22}
            y={RK_Y - RK_H - 18}
            width={RANK.length * RK_W + (RANK.length - 1) * RK_GAP + 132}
            height={RK_H + 44}
            rx={10}
            fill={BG}
            opacity={0.72}
          />
          <line
            x1={RK_L}
            y1={RK_Y}
            x2={RK_L + RANK.length * RK_W + (RANK.length - 1) * RK_GAP}
            y2={RK_Y}
            stroke="#3A342B"
            strokeWidth={3}
          />
          {RANK.map((r, i) => {
            const h = Math.max(5, Math.sqrt(r.area / MAXA) * RK_H);
            const here = RANK_OF[bi].includes(i);
            const seen = RANK_OF.slice(0, bi + 1).some((g) => g.includes(i));
            const x = RK_L + i * (RK_W + RK_GAP);
            return (
              <rect
                key={r.name + r.area}
                x={x}
                y={RK_Y - h}
                width={RK_W}
                height={h}
                fill={here ? PIECE : seen ? "#7A6E58" : "#332E27"}
              />
            );
          })}
          <text
            x={RK_L + RANK.length * RK_W + (RANK.length - 1) * RK_GAP + 18}
            y={RK_Y + 2}
            fontSize={30}
            fontWeight={800}
            fill="#6E6555"
          >
            {COUNT}곳
          </text>
        </svg>
      )}

      {/* ── 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 96,
            opacity: on,
          }}
        >
          {LINES[bi].map((ln, k) => (
            <div
              key={k}
              style={{
                color: INK,
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.28,
                whiteSpace: "nowrap",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              {ln}
            </div>
          ))}
        </div>
      )}

      {/* ── 범례 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            bottom: BOTTOM_INSET + 18,
            display: "flex",
            gap: 26,
          }}
        >
          {([
            [PIECE, "떨어진 조각"],
            [MAIN, "그 시·군의 본체"],
            ...(litNb.length ? [[NEIGH, "사이에 낀 남의 땅"]] : []),
          ] as [string, string][]).map(([c, t]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 22, height: 22, background: c, borderRadius: 4 }} />
              <span style={{ color: DIM, fontSize: 27, fontWeight: 700 }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            /* 표 뒤로 전국 지도와 9개 점이 비쳐야 '9곳'이 남는다 */
            background:
              "linear-gradient(180deg, rgba(16,21,25,0.55) 0%," +
              " rgba(16,21,25,0.90) 42%, rgba(16,21,25,0.97) 58%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              color: DIM,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 16,
            }}
          >
            자기 시·군과 땅이 안 이어진 곳
          </div>
          {TABLE.map((t, i) => {
            const at = BODY_END + Math.round((0.3 + i * 0.24) * FPS);
            const o = interpolate(frame, [at, at + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const hot = i === 0;
            return (
              <div
                key={t.name + t.area}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginTop: 9,
                  opacity: o,
                  transform: `translateY(${(1 - o) * 8}px)`,
                }}
              >
                <span
                  style={{
                    color: hot ? PIECE : INK,
                    fontSize: 37,
                    fontWeight: 900,
                    width: 268,
                    whiteSpace: "nowrap",
                  }}
                >
                  {`${t.sido} ${t.name}`.replace(/^(\S+) \1/, "$1")}
                </span>
                <span
                  style={{
                    color: hot ? PIECE : INK,
                    fontSize: 37,
                    fontWeight: 900,
                    width: 186,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.area.toFixed(2)}km²
                </span>
                <span
                  style={{
                    color: DIM,
                    fontSize: 33,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.dist.toFixed(2)}km
                </span>
              </div>
            );
          })}
          <div
            style={{
              color: DIM,
              fontSize: 27,
              fontWeight: 700,
              marginTop: 14,
              wordBreak: "keep-all",
            }}
          >
            면적과 거리는 시군구 경계로 잰 계산값 · 거리는 본체까지 직선
          </div>
          <div
            style={{
              color: INK,
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.3,
              marginTop: 20,
              wordBreak: "keep-all",
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(3.6 * FPS), BODY_END + Math.round(4.3 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            제 땅에 닿으려면 남의 땅부터
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(21,19,16,0.28)" }}
          />
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: BOTTOM_INSET + 96,
              opacity: hookOut,
            }}
          >
            <div
              style={{
                color: DIM,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 6,
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              전국 {COUNT}곳
            </div>
            <div
              style={{
                color: PIECE,
                fontSize: 148,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              74.7km²
            </div>
            <div
              style={{
                color: INK,
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.22,
                marginTop: 14,
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              <div>군청에 가려면</div>
              <div>남의 땅부터 지나야 하는 곳</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
