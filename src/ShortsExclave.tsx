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
  EMPTY_COUNT,
  ISLAND_COUNT,
  LINES,
  SEA_COUNT,
  SHAPES,
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
/** 최단선이 지나는 남의 동네 */
const NEIGH = "#7A6448";
/** 지도 위 이름표 — 칠한 색보다 밝아야 글자가 읽힌다 */
const LBL = { piece: "#FFC9B4", main: "#A8CDE4", neigh: "#E0C99A" } as const;
/** 그 시·군의 나머지 땅 */
const MAIN = "#4C7A9B";
/** 떨어진 땅 — 이 편의 색 */
const PIECE = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";

/**
 * 기준을 세우는 화면. 훅 다음, 첫 걸음 앞에 2.6초.
 *
 * 두 번 고쳤다.
 *
 * 처음엔 '뺀 것 · 1,049곳 · 섬'으로 열었다. 무엇을 세는지도 모르는
 * 채 뺀 것부터 듣는 셈이라 무슨 말인지 알 수가 없었다.
 *
 * 다음엔 '육지에 붙어 있는 땅 가운데'로 뒤집고 섬 1,049곳을 점으로
 * 켰다 껐다. 그런데 **대부도는 섬인데 이 편에 들어 있다.** '섬을
 * 뺐다'는 말과 화면이 어긋난다. 새만금 방조제·평택당진항 매립지도
 * 지도에서는 바다 위 띠로 보인다.
 *
 * 실제로 한 일은 섬이냐 아니냐를 가른 것이 아니다. **이웃 시·군과
 * 경계가 맞닿았는지**를 봤다. 흑산도는 아무와도 안 닿아서 빠지고,
 * 대부도는 시흥시와 닿아서 들어온다. 그대로 적는다. '섬'이라는
 * 말은 화면에서 안 쓴다.
 */
const GATE = Math.round(2.6 * FPS);
const GATE_END = HOOK + GATE;

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = GATE_END;
  HOLD.forEach((h) => {
    const len = Math.round(h * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(5.6 * FPS);
export const EXCLAVE_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

/** 카메라가 다음 자리로 날아가는 시간 */
const FLY = Math.round(1.1 * FPS);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const ASPECT = 1920 / 1080;

/** 한글은 한 글자가 거의 한 em이고 숫자·기호·빈칸은 그 절반이다 */
function textEm(t: string): number {
  let w = 0;
  for (const ch of t) w += /[\uac00-\ud7a3\u4e00-\u9fff]/.test(ch) ? 1 : 0.5;
  return w;
}

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
  const inGate = frame >= HOOK && frame < GATE_END;
  const started = frame >= GATE_END;
  /** 기준 화면에서 9곳이 밝아지는 정도 */
  const gateOn = interpolate(frame, [HOOK + 4, HOOK + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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
  /** 직선이 그어지는 진행도 */
  const run = interpolate(age, [12, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /**
   * 카메라.
   *
   * 훅에서는 전국이고, 걸음마다 그 땅으로 붙는다. 떨어진 땅과
   * 나머지 땅과 사이에 낀 남의 동네가 한 화면에 들어와야
   * '끼어 있다'가 그림으로 읽힌다.
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
  /** 화면 1px이 지도 좌표로 몇인지. 글자 크기를 여기에 건다 */
  const px = camW / 1080;

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

        {/* 최단선이 지나는 남의 동네 */}
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
              r={sw * (seen ? 9 : 7 + gateOn * 3)}
              fill={PIECE}
              fillOpacity={seen ? 0.95 : 0.45 + gateOn * 0.5}
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

        {/* 직선 — 얼마나 떨어져 있는지. 이 편에는 이 선 하나뿐이다 */}
        {started && !inOutro && (
          <g>
            <line
              x1={p.line[0][0]}
              y1={p.line[0][1]}
              x2={p.line[0][0] + (p.line[1][0] - p.line[0][0]) * run}
              y2={p.line[0][1] + (p.line[1][1] - p.line[0][1]) * run}
              stroke={INK}
              strokeWidth={sw * 1.8}
              strokeDasharray={`${sw * 5} ${sw * 5}`}
              opacity={0.9}
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
        {/*
          이름표.

          색만 칠해두면 어느 게 어디 땅인지 알 수가 없다. 글자 크기는
          화면 기준으로 고정한다 — 지도 좌표로 두면 붙을 때마다
          간판만 해진다.
        */}
        {started &&
          !inOutro &&
          cs.labels.map((l) => {
            const fs = (l.kind === "neigh" ? 31 : 37) * px;
            // 가장자리에 앉은 이름표가 화면 밖으로 잘린다.
            // 글자 폭만큼 안으로 물린다.
            const half = (textEm(l.text) * fs) / 2 + 24 * px;
            const x = Math.min(
              Math.max(l.x, cam.cx - camW / 2 + half),
              cam.cx + camW / 2 - half
            );
            return (
            <text
              key={l.kind + l.text}
              x={x}
              y={l.y}
              fontSize={fs}
              fontWeight={900}
              fill={LBL[l.kind]}
              stroke={BG}
              strokeWidth={6 * px}
              paintOrder="stroke"
              strokeLinejoin="round"
              textAnchor="middle"
              opacity={on}
            >
              {l.text}
            </text>
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

      {/*
        ── 기준 ──

        훅과 같은 자리(아래)에 앉힌다. 위에 두면 인천·안산 점이
        글자 뒤로 들어간다. 훅의 큰 숫자에서 여기 큰 숫자로
        갈아 끼워지는 것으로 이어진다.
      */}
      {inGate && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 96,
          }}
        >
          <div
            style={{
              color: PIECE,
              fontSize: 132,
              fontWeight: 900,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {COUNT}
            <span style={{ fontSize: 62, fontWeight: 800, marginLeft: 8 }}>곳</span>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.24,
              marginTop: 14,
              whiteSpace: "nowrap",
              textShadow: `0 0 24px ${BG}`,
            }}
          >
            <div>걸어서 갈 수 있는데</div>
            <div>가는 길이 전부 남의 동네</div>
          </div>
        </div>
      )}

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
              color: PIECE,
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1.02,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p.dist.toFixed(2)}
            <span style={{ fontSize: 58, fontWeight: 800, marginLeft: 8 }}>km</span>
            {/* 이 숫자가 무엇인지는 첫 걸음에서 한 번만 밝힌다 */}
            {bi === 0 ? (
              <span
                style={{
                  color: DIM,
                  fontSize: 32,
                  fontWeight: 700,
                  marginLeft: 18,
                }}
              >
                떨어진 거리
              </span>
            ) : null}
          </div>
          <div style={{ color: INK, fontSize: 36, fontWeight: 800, marginTop: 8 }}>
            {p.area}km² · {p.name}의 {p.pct}%
          </div>
        </div>
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
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              lineHeight: 1.28,
              whiteSpace: "nowrap",
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {LINES[bi]}
          </div>
        </div>
      )}

      {/*
        ── 마무리 ──

        표를 뒀다가 뺐다. 두 줄짜리 표는 방금 본 두 걸음과 같은 말이다.
        전국 지도에 점 둘만 남기고 한 줄로 못박는다.
      */}
      {inOutro && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(16,21,25,0.35) 0%," +
              " rgba(16,21,25,0.80) 55%, rgba(16,21,25,0.96) 72%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 62,
              fontWeight: 900,
              lineHeight: 1.2,
              marginBottom: 18,
            }}
          >
            전국에 딱 {COUNT}곳
          </div>
          <div
            style={{
              color: DIM,
              fontSize: 25,
              fontWeight: 700,
              lineHeight: 1.5,
              whiteSpace: "nowrap",
            }}
          >
            바다로 갈라진 {SEA_COUNT}곳 · 사람이 안 사는 매립지 {EMPTY_COUNT}곳 ·
            이웃과 안 닿는 {ISLAND_COUNT.toLocaleString("en-US")}곳은 뺌
            <br />
            거리는 가장 가까운 두 점 사이 직선 · 넓이와 함께 경계 자료 계산값
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
                fontSize: 50,
                fontWeight: 900,
                lineHeight: 1.22,
                marginTop: 14,
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              같은 군 땅인데 안 붙어 있는 곳
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
