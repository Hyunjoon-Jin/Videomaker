import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  DONGS,
  FAR_PCT,
  GRID,
  HOLD,
  HOOK_SEC,
  KM_PER_UNIT,
  MEDIAN_KM,
  NEAR_KM,
  ONE,
  OUTRO_SEC,
  SEG,
  SEOUL,
  STATIONS,
  STEP_M,
  TOP,
  TOP_POP,
  VOICE,
  VOICE_ESTIMATED,
  km2,
} from "./data/metro";
import { styleOf } from "./data/lines";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/** 나레이션이 없어도 다른 편들처럼 BGM은 깐다 */
const HAS_BGM = true;

const BG = "#0E1418";
/** 서울 밖 땅. 이 편은 서울 이야기라 바깥은 물러나 있다 */
const OUT_LAND = "#1C1614";
/** 서울 땅 — 역에서 먼 자리 */
const SHADOW = "#2A211F";
/** 역세권 — 역에서 1km 안 */
const NEAR = "#4A4335";
const HOT = "#F2603C";
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
/** 역세권 반지름. 1km가 지도 1.54단위다 */
const NEAR_R = NEAR_KM / KM_PER_UNIT;

/* ── 카메라는 안 움직인다 ──
   **이 편의 그림은 「서울 전체에 뚫린 구멍」이다.** 동마다 확대해
   들어가면 그 구멍이 안 보이고, 앞선 판에서 노선이 뒤엉켜 지저분해진
   것도 화면을 좁게 잡았기 때문이었다. 서울을 통째로 한 번 잡아 두고
   그 안에서 동 하나씩만 켠다. */
const SEOUL_BOX = { x0: 296.7, x1: 354.4, y0: 187.6, y1: 233.9 };
const CAM = (() => {
  const cx = (SEOUL_BOX.x0 + SEOUL_BOX.x1) / 2;
  const cy = (SEOUL_BOX.y0 + SEOUL_BOX.y1) / 2;
  const w = (SEOUL_BOX.x1 - SEOUL_BOX.x0) * 1.03;
  return { cx, cy, w };
})();
const PX = CAM.w / 1080;
const VX = CAM.cx - CAM.w / 2;
/** 지도를 화면 위쪽에 올려 밑에 글자 자리를 남긴다 */
const VY = CAM.cy - 700 * PX;
const VIEW = `${VX} ${VY} ${CAM.w} ${CAM.w * ASPECT}`;
const sx = (x: number) => (x - VX) / PX;
const sy = (y: number) => (y - VY) / PX;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

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
  const settle = interpolate(age, [2, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 거리선이 역까지 뻗는다 */
  const reach = interpolate(age, [10, 10 + Math.round(0.8 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cur = TOP[bi];
  const rank = TOP.length - bi;
  /** 마무리에서는 다섯 곳이 한꺼번에 켜진다 */
  const lit = inOutro ? TOP : started ? [cur] : [];

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
        viewBox={VIEW}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          {/* 역세권 원을 서울 안에 가둔다 */}
          <clipPath id="seoul">
            {SEOUL.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        </defs>

        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={OUT_LAND} stroke={BG} strokeWidth={PX} />
        ))}

        {/* 서울 땅. 여기가 바탕이고 어두운 데가 음영이다 */}
        {SEOUL.map((d, i) => (
          <path key={i} d={d} fill={SHADOW} />
        ))}

        {/* 역세권 — 역마다 1km 원. 겹쳐도 같은 색이라 얼룩이 안 진다 */}
        <g clipPath="url(#seoul)">
          {STATIONS.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={NEAR_R} fill={NEAR} />
          ))}
        </g>

        {/* 서울 구 경계 */}
        {SEOUL.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={BG}
            strokeWidth={PX * 1.2}
            opacity={0.7}
          />
        ))}

        {/* 노선망. **배경이고 서울 안에만 있다.**
            앞선 판에서 이게 주인공 행세를 해 화면이 뒤엉켰다.
            서울 밖으로 뻗은 선이 화면을 가로질러 더 지저분했다 —
            서울에 가두고 얇게 깔아 물러나 있게 한다 */}
        <g clipPath="url(#seoul)">
          {SEG.map((s, i) => (
            <line
              key={i}
              x1={s[0]}
              y1={s[1]}
              x2={s[2]}
              y2={s[3]}
              stroke={styleOf(s[4]).c}
              strokeWidth={PX * 2.2}
              strokeLinecap="round"
              opacity={0.62}
            />
          ))}
        </g>

        {/* 음영지역 */}
        {lit.map((s) => (
          <path
            key={s.name}
            d={s.d}
            fill={`${HOT}59`}
            stroke={HOT}
            strokeWidth={PX * 2.6}
            opacity={inOutro ? outroIn : settle}
          />
        ))}

        {/* 거기서 가장 가까운 역까지 */}
        {started && !inOutro && reach > 0 && (
          <g opacity={settle}>
            <line
              x1={cur.x}
              y1={cur.y}
              x2={cur.x + (cur.nx - cur.x) * reach}
              y2={cur.y + (cur.ny - cur.y) * reach}
              stroke={INK}
              strokeWidth={PX * 2.6}
              strokeDasharray={`${PX * 7} ${PX * 5}`}
              strokeLinecap="round"
            />
            <circle cx={cur.x} cy={cur.y} r={PX * 5} fill={INK} />
            {reach > 0.98 && (
              <circle
                cx={cur.nx}
                cy={cur.ny}
                r={PX * 7}
                fill={BG}
                stroke={INK}
                strokeWidth={PX * 3}
              />
            )}
          </g>
        )}
      </svg>

      {/* 동 이름표. 화면 좌표에 얹어야 배율과 무관하게 읽힌다 */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(sx(cur.x) - 150, TEXT_X), 1080 - 300 - SAFE_RIGHT),
            top: sy(cur.y) - 104,
            width: 300,
            textAlign: "center",
            opacity: settle,
            color: INK,
            fontWeight: 900,
            textShadow: `0 0 26px ${BG}, 0 0 10px ${BG}`,
          }}
        >
          <div style={{ fontSize: 44 }}>{cur.name}</div>
          <div style={{ fontSize: 26, color: DIM }}>{cur.gu}</div>
        </div>
      )}

      {/* 역 이름표 */}
      {started && !inOutro && reach > 0.98 && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(sx(cur.nx) - 120, TEXT_X), 1080 - 240 - SAFE_RIGHT),
            top: sy(cur.ny) + 18,
            width: 240,
            textAlign: "center",
            opacity: settle,
            color: DIM,
            fontSize: 26,
            fontWeight: 900,
            textShadow: `0 0 20px ${BG}`,
          }}
        >
          {cur.near}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 620,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}E0 34%, ${BG} 60%)`,
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
          <div style={cap}>
            {rank}위 · {cur.gu}
          </div>
          <div style={big}>{cur.name}</div>
          <div style={note}>동네 절반이 역까지 {km2(cur.km)}km 넘게</div>
          {rank === 1 && (
            <div style={{ ...note, color: DIM, marginTop: 6 }}>
              서울 {DONGS}개 동 중앙값 {km2(MEDIAN_KM)}km ·{" "}
              {Math.round(cur.km / MEDIAN_KM)}배
            </div>
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
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.26,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div>
              다섯 곳에{" "}
              <span style={{ color: HOT }}>{TOP_POP.toLocaleString()}명</span>
            </div>
            <div>
              서울 땅 <span style={{ color: HOT }}>{FAR_PCT}%</span>가 역에서{" "}
              {NEAR_KM}km 밖
            </div>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 48,
              fontWeight: 900,
              marginTop: 24,
              lineHeight: 1.2,
            }}
          >
            여러분 동네에서 역까지 몇 분인가요?
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
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.18,
            }}
          >
            <div>서울에서</div>
            <div>지하철역이 가장 먼 동네</div>
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 4,
            }}
          >
            어디일까요?
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
          fontSize: 23,
          fontWeight: 700,
        }}
      >
        밝은 자리가 역 {NEAR_KM}km 안 · 동 안 {STEP_M}m 격자{" "}
        {GRID.toLocaleString()}점의 중앙값
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
  fontSize: 92,
  fontWeight: 900,
  lineHeight: 1.06,
  marginTop: 2,
};
const note: React.CSSProperties = {
  color: HOT,
  fontSize: 40,
  fontWeight: 900,
  marginTop: 10,
  fontVariantNumeric: "tabular-nums",
};
