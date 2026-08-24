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
  AX_MAX,
  AX_MIN,
  BODY_FRAMES,
  FROM,
  SPOTS,
  TOP_N,
  YEARS,
  castAt,
  raceAt,
  rankOf,
} from "./data/race";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);
const OUTRO = Math.round(5.6 * FPS);
const BODY_END = HOOK + BODY_FRAMES;
export const EX_DURATION = BODY_END + OUTRO;

/** 여름 쪽 끝 — 달군 쇠 */
const HOT = "#C4553A";
/** 겨울 쪽 끝 — 언 물 */
const COLD = "#4E7A9B";
const BG = "#14120F";

/** 순위표 자리 */
const ROW_TOP = 618;
const ROW_H = 104;
const BAR_H = 62;

/** 이름 칸과 온도축 */
const NAME_X = TEXT_X;
const AX_L = TEXT_X + 196;
const AX_R = 1080 - SAFE_RIGHT + 30;
const AX_W = AX_R - AX_L;

/** 전국 봉투 줄 */
const NAT_Y = 502;
const NAT_H = 44;
/** 온도 → x */
const tx = (t: number) => AX_L + ((t - AX_MIN) / (AX_MAX - AX_MIN)) * AX_W;

export const ShortsExtremes: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const inOutro = frame >= BODY_END;
  const t = Math.max(0, Math.min(BODY_FRAMES - 1, frame - HOOK));
  /** 마무리에서는 마지막 해에서 멈춘다 */
  const shown = raceAt(inOutro ? BODY_FRAMES - 1 : t);
  const F = shown.frame;
  const P = shown.prev;
  const pp = inOutro ? 1 : shown.p;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cast = castAt(F, P);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ex.wav")} volume={0.9} />

      {/* ── 지도 — 뒤에 옅게. 순위표에 오른 곳에 점만 찍힌다 ── */}
      <AbsoluteFill style={{ opacity: 0.32 }}>
        <svg
          viewBox="150 180 780 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((s) => (
            <path key={s.id} d={s.d} fill="#231F19" stroke="#38312A" strokeWidth={1.6} />
          ))}
          {Object.keys(F.rank).map((stn) => {
            const s = SPOTS[stn];
            if (!s) return null;
            const first = F.rank[stn] === 0;
            return (
              <circle
                key={stn}
                cx={s.x}
                cy={s.y}
                r={first ? 13 : 7}
                fill={first ? INK.bone : "#6B6355"}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ── 계기판 — 연도. 이 편에서 유일하게 흐르는 것. ── */}
      <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
        <div style={{ color: C.dim, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
          그 해까지의 역대 최고 − 역대 최저
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <span
            style={{
              color: C.text,
              fontSize: 108,
              fontWeight: 900,
              lineHeight: 1.06,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {F.year}
          </span>
          <span style={{ color: C.dim, fontSize: 32, fontWeight: 800 }}>
            관측 {F.n}곳
          </span>
        </div>
      </div>

      {/* ── 순위표 ── */}
      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            <linearGradient id="exBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLD} />
              <stop offset="100%" stopColor={HOT} />
            </linearGradient>
          </defs>

          {/*
            전국 봉투.

            순위표는 상위 열 곳만 담는데, 전국 최고기온은 그 열 곳에서
            안 나온다 — 2026년 42.5도는 양산시 것이고 양산시는 기온 폭
            69위다. 표만 보면 그 기록이 통째로 빠진다. 같은 온도축 위에
            얇은 줄로 얹어 두면 아래 막대들이 전부 그 안에 들어앉는다.
          */}
          <rect
            x={tx(F.nation.lo)}
            y={NAT_Y}
            width={tx(F.nation.hi) - tx(F.nation.lo)}
            height={NAT_H}
            rx={3}
            fill="url(#exBar)"
            opacity={0.34}
          />
          <text x={NAME_X} y={NAT_Y + NAT_H * 0.8} fontSize={30} fontWeight={800} fill={C.dim}>
            전국
          </text>
          <text
            x={tx(F.nation.lo) + 12}
            y={NAT_Y + NAT_H * 0.78}
            fontSize={26}
            fontWeight={900}
            fill="#B9D2E2"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {F.nation.lo.toFixed(1)} {F.nation.loName}
          </text>
          <text
            x={tx(F.nation.hi) - 12}
            y={NAT_Y + NAT_H * 0.78}
            fontSize={26}
            fontWeight={900}
            fill="#F0C6B6"
            textAnchor="end"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {F.nation.hiName} {F.nation.hi.toFixed(1)}
          </text>

          {/* 0℃ — 막대가 겨울 쪽과 여름 쪽으로 갈리는 자리 */}
          <line
            x1={tx(0)}
            y1={NAT_Y}
            x2={tx(0)}
            y2={ROW_TOP + ROW_H * TOP_N - 30}
            stroke="#463E33"
            strokeWidth={2}
          />
          <text
            x={tx(0)}
            y={ROW_TOP - 42}
            fontSize={24}
            fontWeight={700}
            fill={C.dim}
            textAnchor="middle"
          >
            0℃
          </text>

          {cast.map((stn) => {
            const r0 = rankOf(P, stn);
            const r1 = rankOf(F, stn);
            const r = r0 + (r1 - r0) * pp;
            // 표 밖으로 밀려나는 줄은 흐려지며 내려간다
            let fade = r > TOP_N - 0.5 ? Math.max(0, 1 - (r - (TOP_N - 0.5)) * 2.2) : 1;
            // 마무리에서는 다섯 칸만 남긴다. 열 칸을 다 두면 마지막 줄이
            // 10위 막대 위에 겹쳐 앉는다.
            if (inOutro && r1 >= 5) fade *= 1 - outroIn;
            if (fade <= 0) return null;

            const row = F.row[stn] ?? P.row[stn];
            const from = P.row[stn] ?? row;
            // 자리와 막대 끝만 움직인다. 숫자는 그 해 값 그대로다 —
            // 기록은 깨질 때 계단으로 뛰는 값이라 중간값을 보여주면
            // 없던 숫자가 뜬다.
            const lo = from.lo + (row.lo - from.lo) * pp;
            const hi = from.hi + (row.hi - from.hi) * pp;
            const y = ROW_TOP + r * ROW_H;
            const lead = r1 === 0;
            const x0 = tx(lo);
            const x1 = tx(hi);

            return (
              <g key={stn} opacity={fade}>
                {/* 밀려나는 줄에는 순위를 안 적는다. rankOf가 표 밖을
                    TOP_N으로 주므로 그대로 쓰면 '11위'가 뜬다. */}
                {r1 < TOP_N && (
                  <text
                    x={NAME_X}
                    y={y + BAR_H * 0.74}
                    fontSize={lead ? 46 : 38}
                    fontWeight={900}
                    fill={lead ? INK.brass : "#6F6656"}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {r1 + 1}
                  </text>
                )}
                <text
                  x={NAME_X + 74}
                  y={y + BAR_H * 0.74}
                  fontSize={lead ? 46 : 40}
                  fontWeight={lead ? 900 : 800}
                  fill={lead ? INK.bone : "#9B9282"}
                >
                  {row.name}
                </text>

                {/* 막대는 길이가 아니라 구간이다. 그 지점이 겪은 최저에서
                    최고까지를 온도축 위에 그대로 눕힌다. */}
                <rect
                  x={x0}
                  y={y}
                  width={Math.max(2, x1 - x0)}
                  height={BAR_H}
                  rx={4}
                  fill="url(#exBar)"
                  opacity={lead ? 1 : 0.55}
                />
                <text
                  x={(x0 + x1) / 2}
                  y={y + BAR_H * 0.72}
                  fontSize={lead ? 42 : 34}
                  fontWeight={900}
                  fill={lead ? "#17130E" : "#1E1A14"}
                  textAnchor="middle"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {row.gap.toFixed(1)}
                </text>

                {/* 양 끝 안쪽에 그 끝이 무슨 값인지 작게 적는다. 막대가
                    구간이라는 것을 아는 사람에게만 읽히면 안 된다 —
                    왼쪽 끝은 겨울 기록, 오른쪽 끝은 여름 기록이다.
                    가운데 폭 숫자와는 크기로 갈라 놓는다. */}
                <text
                  x={x0 + 14}
                  y={y + BAR_H * 0.71}
                  fontSize={24}
                  fontWeight={800}
                  fill={lead ? "#D8E7F0" : "#93AEBF"}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {row.lo.toFixed(1)}
                </text>
                <text
                  x={x1 - 14}
                  y={y + BAR_H * 0.71}
                  fontSize={24}
                  fontWeight={800}
                  fill={lead ? "#F6DDD3" : "#C39C8E"}
                  textAnchor="end"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {row.hi.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ── 마무리 한 줄 ── */}
      {inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 236,
            color: C.text,
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.3,
            opacity: outroIn,
            wordBreak: "keep-all",
          }}
        >
          88년 동안 1위는 셋뿐 — 서울, 춘천, 양평
        </div>
      )}

      {/* ── 훅 — 0프레임에 순위표가 이미 떠 있고 그 위에 얹힌다 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(20,18,15,0.74)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: INK.brass, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            {FROM} → {YEARS[YEARS.length - 1].y}
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 1.14,
              wordBreak: "keep-all",
            }}
          >
            기온 폭
            <br />
            전국 순위
          </div>
          <div style={{ color: C.dim, fontSize: 42, fontWeight: 800, marginTop: 22 }}>
            대구도 대관령도 없음
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
