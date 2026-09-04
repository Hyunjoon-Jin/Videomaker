import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  FLOOR_KM,
  HOLD,
  HOOK_SEC,
  ONE,
  OUTRO_SEC,
  PAIRS,
  SEG,
  SEOUL_STATIONS,
  TOP,
  VOICE,
  VOICE_ESTIMATED,
  type Pair,
} from "./data/metro";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/** BGM은 나레이션이 온 뒤에 고른다 */
const HAS_BGM = false;

const BG = "#0E1418";
const LAND = "#2F2820";
/** 노선망 */
const RAIL = "#4C6670";
/** 돌아가는 길 */
const HOT = "#D4694F";
/** 직선 */
const STRAIGHT = "#7FB2C4";
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
export const METRO_DURATION = BODY_END + Math.round(OUTRO_SEC * FPS);

const ASPECT = 1920 / 1080;
const CENTER_Y = 760;
const FLY = Math.round(0.8 * FPS);

interface Cam {
  cx: number;
  cy: number;
  w: number;
}

function fit(pts: [number, number][], pad: number, min: number): Cam {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    w: Math.max((x1 - x0) * pad, ((y1 - y0) * pad) / ASPECT, min),
  };
}

const pts = (p: Pair): [number, number][] =>
  p.path.map((s) => [s.x, s.y] as [number, number]);

/* ── 걸음마다 카메라가 어디를 보나 ──
   1·2·3등이 서울 여기저기라 걸음마다 날아간다. **도는 길 전체가
   화면에 담겨야** 「돌아간다」가 보이므로 경로에 맞춰 잡는다.
   첫 걸음만 두 역에 바짝 붙어 직선이 얼마나 짧은지 보인다. */
const AT: Cam[] = [
  fit([pts(ONE)[0], pts(ONE)[pts(ONE).length - 1]], 6.5, 26), // 1  두 역만
  fit(pts(ONE), 1.5, 26), // 2  도는 길
  fit(pts(ONE), 1.5, 26), // 3  9.9배
  fit(pts(TOP[1]), 1.5, 26), // 4  2등
  fit(pts(TOP[2]), 1.5, 26), // 5  3등
];
const START = AT[0];

function blend(a: Cam, b: Cam, t: number, arc: number): Cam {
  const e =
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lift = Math.sin(Math.PI * e) * arc;
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e + lift),
  };
}

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

function camAt(frame: number): Cam {
  if (frame < HOOK) return START;
  const i = Math.min(beatAt(frame), AT.length - 1);
  const from = i === 0 ? START : AT[i - 1];
  const t = (frame - SLOTS[i].t0) / FLY;
  return blend(from, AT[i], t, i >= 3 ? 0.3 : 0);
}

/** 그 걸음이 보여주는 쌍 */
const PAIR_OF = [ONE, ONE, ONE, TOP[1], TOP[2]];

export const ShortsMetro: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 12, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const age = frame - SLOTS[bi].t0;
  const settle = interpolate(age, [FLY - 8, FLY + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cur = inOutro ? ONE : PAIR_OF[bi];
  const P = cur.path;

  const cam = camAt(frame);
  const px = cam.w / 1080;
  const vx = cam.cx - cam.w / 2;
  const vy = cam.cy - CENTER_Y * px;
  const viewBox = `${vx} ${vy} ${cam.w} ${cam.w * ASPECT}`;
  const sx = (x: number) => (x - vx) / px;
  const sy = (y: number) => (y - vy) / px;

  /**
   * 도는 길이 한 정거장씩 그려진다.
   *
   * 한꺼번에 띄우면 고리가 그냥 선이다. **지나가는 것을 봐야**
   * 돌아간다는 말이 몸에 붙는다.
   */
  const draw =
    inOutro
      ? 1
      : started && bi >= 1
        ? interpolate(age, [FLY, FLY + Math.round(1.5 * FPS)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 0;
  const shown = Math.max(1, Math.round((P.length - 1) * draw));

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-mt.wav")} volume={0.4} />}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          const at =
            i === 0 ? 0 : i <= SLOTS.length ? SLOTS[i - 1].t0 + 4 : BODY_END + 6;
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

      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={px} />
        ))}

        {SEG.map((s, i) => (
          <line
            key={i}
            x1={s[0]}
            y1={s[1]}
            x2={s[2]}
            y2={s[3]}
            stroke={RAIL}
            strokeWidth={px * 3}
            strokeLinecap="round"
          />
        ))}

        {/* 두 역을 잇는 직선 */}
        <line
          x1={P[0].x}
          y1={P[0].y}
          x2={P[P.length - 1].x}
          y2={P[P.length - 1].y}
          stroke={STRAIGHT}
          strokeWidth={px * 5}
          strokeDasharray={`${px * 12} ${px * 9}`}
          strokeLinecap="round"
          opacity={settle}
        />

        {/* 지하철로 도는 길 */}
        {draw > 0 && (
          <polyline
            points={P.slice(0, shown + 1)
              .map((s) => `${s.x},${s.y}`)
              .join(" ")}
            fill="none"
            stroke={HOT}
            strokeWidth={px * 7}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 지나온 정거장 */}
        {draw > 0 &&
          P.slice(1, shown).map((s) => (
            <circle
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={px * 6}
              fill={BG}
              stroke={HOT}
              strokeWidth={px * 3}
            />
          ))}

        {[P[0], P[P.length - 1]].map((s) => (
          <circle
            key={s.name}
            cx={s.x}
            cy={s.y}
            r={px * 11}
            fill={INK}
            stroke={BG}
            strokeWidth={px * 3}
            opacity={settle}
          />
        ))}
      </svg>

      {/* 이름표는 화면 좌표에 얹는다. 배율이 달라도 글자가 안 흔들린다 */}
      {[
        { s: P[0], line: cur.lineA },
        { s: P[P.length - 1], line: cur.lineB },
      ].map(({ s, line }, i, arr) => {
        /**
         * 두 역이 붙어 있다. 1등 쌍은 화면에서 50px밖에 안 떨어져서
         * 이름표가 서로 위에 얹혔다.
         *
         * **바깥쪽으로 밀어 놓는다** — 왼쪽 역은 이름표를 왼쪽에,
         * 오른쪽 역은 오른쪽에. 그러면 둘이 벌어진다.
         */
        const other = arr[1 - i].s;
        const left = sx(s.x) <= sx(other.x);
        const flip = left ? sx(s.x) > 400 : sx(s.x) > 680;
        return (
          <div
            key={s.name}
            style={{
              position: "absolute",
              ...(flip
                ? { right: 1080 - sx(s.x) + 26, textAlign: "right" as const }
                : { left: sx(s.x) + 26 }),
              top: sy(s.y) - 28,
              opacity: settle,
              color: INK,
              fontWeight: 900,
              textShadow: `0 0 26px ${BG}, 0 0 10px ${BG}`,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontSize: 46 }}>{s.name}</div>
            <div style={{ fontSize: 27, color: DIM }}>{line.join("·")}호선</div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 600,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}D9 36%, ${BG} 62%)`,
        }}
      />

      {/* ── 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: settle,
          }}
        >
          {bi === 0 && (
            <>
              <div style={cap}>두 역 사이 직선</div>
              <div style={big}>{cur.straightKm}km</div>
            </>
          )}
          {(bi === 1 || bi >= 3) && (
            <>
              <div style={cap}>{bi >= 3 ? `${bi - 1}등 · ` : ""}지하철로</div>
              <div style={big}>
                {cur.hops}정거장 · {cur.railKm}km
              </div>
              <div style={note}>
                직선 {cur.straightKm}km의 {cur.ratio}배
              </div>
            </>
          )}
          {bi === 2 && (
            <>
              <div style={cap}>
                직선 {cur.straightKm}km · 지하철 {cur.railKm}km
              </div>
              <div style={{ ...big, fontSize: 132, color: HOT }}>
                {cur.ratio}배
              </div>
              <div style={note}>서울에서 가장 많이 돌아가는 두 역</div>
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
              color: INK,
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.28,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div>서울 안 역 {SEOUL_STATIONS}곳</div>
            <div>
              {FLOOR_KM}km 넘게 떨어진 {PAIRS.toLocaleString()}쌍
            </div>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 48,
              fontWeight: 900,
              marginTop: 26,
              lineHeight: 1.2,
            }}
          >
            여러분 동네에도 이런 데 있나요?
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
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.18,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            직선으로 {ONE.straightKm}km
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 4,
            }}
          >
            지하철로는?
          </div>
        </div>
      )}

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
        거리는 정거장 사이 직선을 더한 값 · 급행 제외
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

const cap: React.CSSProperties = {
  color: DIM,
  fontSize: 36,
  fontWeight: 900,
};
const big: React.CSSProperties = {
  color: INK,
  fontSize: 88,
  fontWeight: 900,
  lineHeight: 1.06,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};
const note: React.CSSProperties = {
  color: HOT,
  fontSize: 36,
  fontWeight: 900,
  marginTop: 10,
  fontVariantNumeric: "tabular-nums",
};
