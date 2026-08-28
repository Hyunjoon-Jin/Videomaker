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
  SHAPES,
  TABLE,
  WIDE,
  partial,
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
/** 가는 길이 지나는 남의 동네 */
const NEIGH = "#7A6448";
/** 그 시·군의 나머지 땅 */
const MAIN = "#4C7A9B";
/** 떨어진 땅 — 이 편의 색 */
const PIECE = "#D4694F";
/** 실제로 달리는 길 */
const ROAD = "#F2C85B";
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
   9곳을 도로 거리 순으로 세운 막대. 지도만 있으면 아홉 걸음이
   다 같은 그림으로 보인다 — 얼마나 돌아가는 자리인지는 이 눈금이
   말한다. */
const RK_Y = 772;
const RK_H = 96;
const RK_W = 60;
const RK_GAP = 22;
const RK_L = TEXT_X;
const RK_R = RK_L + RANK.length * RK_W + (RANK.length - 1) * RK_GAP;
const MAXR = Math.max(...RANK.map((r) => r.road));

export const ShortsExclave: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const cs = CASES[bi];
  const p = cs.pieces[0];
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
  /** 길이 뻗어 나가는 진행도 */
  const run = interpolate(age, [14, SLOTS[bi].t1 - SLOTS[bi].t0 - 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /**
   * 카메라.
   *
   * 훅에서는 전국이고, 걸음마다 그 땅으로 붙는다. 떨어진 땅과
   * 나머지 땅과 가는 길이 한 화면에 들어와야 '돌아간다'가 보인다.
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

  const litNb = started && !inOutro ? cs.nbNames : [];

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

        {/* 가는 길이 지나는 남의 동네 */}
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

        {/*
          그 시·군의 나머지 땅.

          면으로 칠하되 옅게 둔다. 떨어진 땅으로 바짝 붙으면 나머지
          땅이 화면보다 커서, 진하게 칠하면 그게 바탕이 되고 바다가
          땅처럼 읽힌다.
        */}
        {started && !inOutro && (
          <path
            d={p.main}
            fill={MAIN}
            fillOpacity={0.55}
            stroke={MAIN}
            strokeWidth={sw * 1.4}
            strokeOpacity={0.9}
          />
        )}

        {/*
          9곳의 자리.

          0프레임에 이미 다 찍혀 있다. 전국 구도에서는 땅이 점보다
          작아 폴리곤만으로는 안 보인다 — 어디에 몇 곳인지가 훅에서
          먼저 서야 한다.
        */}
        {CASES.map((c, i) => {
          const seen = started && frame >= SLOTS[i].t0;
          return (
            <circle
              key={"d" + c.pieces[0].name + c.pieces[0].area}
              cx={c.pieces[0].line[0][0]}
              cy={c.pieces[0].line[0][1]}
              r={sw * (seen ? 9 : 7)}
              fill={PIECE}
              fillOpacity={seen ? 0.95 : 0.5}
            />
          );
        })}

        {/* 떨어진 땅 — 지나온 것도 남는다 */}
        {CASES.map((c, i) =>
          !started || frame < SLOTS[i].t0 ? null : (
            <path
              key={"p" + c.pieces[0].name + c.pieces[0].area}
              d={c.pieces[0].piece}
              fill={PIECE}
              fillOpacity={i === bi && !inOutro ? 0.55 + on * 0.45 : 0.75}
              stroke={PIECE}
              strokeWidth={sw * 1.6}
            />
          )
        )}

        {/* 직선 — 얼마나 떨어져 있는지 */}
        {started && !inOutro && (
          <g>
            <line
              x1={p.line[0][0]}
              y1={p.line[0][1]}
              x2={p.line[1][0]}
              y2={p.line[1][1]}
              stroke={INK}
              strokeWidth={sw * 1.4}
              strokeDasharray={`${sw * 5} ${sw * 5}`}
              opacity={0.6 * on}
            />
            {/* 실제로 달리는 길 — 뻗어 나간다 */}
            <path
              d={partial(p.path, run)}
              fill="none"
              stroke={ROAD}
              strokeWidth={sw * 3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
            <circle cx={p.line[0][0]} cy={p.line[0][1]} r={sw * 2.6} fill={PIECE} />
            <circle
              cx={p.line[1][0]}
              cy={p.line[1][1]}
              r={sw * 2.6}
              fill={MAIN}
              opacity={run}
            />
          </g>
        )}
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
            {`${p.sido} ${p.name}`.replace(/^(\S+) \1/, "$1")}
          </div>
          <div
            style={{
              color: ROAD,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p.road.toFixed(1)}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 8 }}>km</span>
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 10, alignItems: "baseline" }}>
            <span style={{ color: INK, fontSize: 40, fontWeight: 900 }}>
              직선 {p.dist.toFixed(1)}km
            </span>
            <span style={{ color: "#B7AC98", fontSize: 36, fontWeight: 800 }}>
              차로 {p.min}분
            </span>
          </div>
          {/*
            지나는 남의 동네는 이름을 다 적지 않는다. 인천 중구는
            둘이라 '남의 동네 인천 서구 8.14km · 인천 동구 3.74km'가
            되면서 줄이 접히고 눈금을 밟았다. 합만 적고, 어디인지는
            지도의 색과 자막이 말한다.
          */}
          <div
            style={{
              color: DIM,
              fontSize: 30,
              fontWeight: 700,
              marginTop: 8,
              whiteSpace: "nowrap",
            }}
          >
            {p.other >= 0.15 ? `남의 동네 ${p.other.toFixed(1)}km · ` : ""}
            이 땅 {p.area.toFixed(1)}km²
          </div>
        </div>
      )}

      {/* ── 눈금 — 9곳을 도로 거리 순으로 ── */}
      {started && !inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* 지도 위에 그대로 얹으면 막대가 안 읽힌다 */}
          <rect
            x={RK_L - 22}
            y={RK_Y - RK_H - 18}
            width={RK_R - RK_L + 132}
            height={RK_H + 44}
            rx={10}
            fill={BG}
            opacity={0.72}
          />
          <line x1={RK_L} y1={RK_Y} x2={RK_R} y2={RK_Y} stroke="#3A342B" strokeWidth={3} />
          {RANK.map((r, i) => {
            const h = Math.max(4, (r.road / MAXR) * RK_H);
            const x = RK_L + i * (RK_W + RK_GAP);
            return (
              <rect
                key={r.name + r.area}
                x={x}
                y={RK_Y - h}
                width={RK_W}
                height={h}
                fill={i === bi ? ROAD : i < bi ? "#7A6E58" : "#332E27"}
              />
            );
          })}
          <text x={RK_R + 18} y={RK_Y + 2} fontSize={30} fontWeight={800} fill="#6E6555">
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
                fontSize: 50,
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
            gap: 24,
          }}
        >
          {(
            [
              [PIECE, "떨어진 땅"],
              [MAIN, "그 시·군의 나머지 땅"],
              [ROAD, "가는 길"],
            ] as [string, string][]
          ).map(([c, t]) => (
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
            자기 시·군 땅에 가는 길
          </div>
          {[...TABLE]
            .sort((a, b) => b.road - a.road)
            .map((t, i) => {
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
                      color: hot ? ROAD : INK,
                      fontSize: 37,
                      fontWeight: 900,
                      width: 258,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {`${t.sido} ${t.name}`.replace(/^(\S+) \1/, "$1")}
                  </span>
                  <span
                    style={{
                      color: hot ? ROAD : INK,
                      fontSize: 37,
                      fontWeight: 900,
                      width: 168,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.road.toFixed(1)}km
                  </span>
                  <span
                    style={{
                      color: DIM,
                      fontSize: 33,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    직선 {t.dist.toFixed(1)}km
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
            도로는 차로 가는 최단 경로 · 직선과 넓이는 경계 자료로 잰 계산값
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
                [BODY_END + Math.round(3.8 * FPS), BODY_END + Math.round(4.5 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            코앞인데 돌아가야 하는 땅 9곳
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(16,21,25,0.28)" }}
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
                color: ROAD,
                fontSize: 148,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              25.9km
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
              <div>2.7km 떨어진</div>
              <div>같은 시 땅에 가는 길</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
