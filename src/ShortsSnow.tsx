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
  BIGGEST,
  CAST,
  DAEGU,
  METRO,
  N_SITES,
  SEOUL,
  fmt,
} from "./data/snow";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

const BG = "#0B0D12";
const LAND_F = "#222836";
const LAND_S = "#30384A";
/** 쌓인 눈 */
const SNOW = "#EAF1F8";
/** 자 — 서울 */
const RULE = "#8E9AAE";
/** 이 편의 색. 대구가 켜질 때 */
const HOT = "#5FA8D6";

/**
 * 한 곳에 머무는 시간.
 *
 * 이 편은 아홉 곳을 낮은 데서 높은 데로 세워 올린다. 서울과 대구가
 * 야마라 그 둘만 길게 잡는다. 나머지는 계단이 올라가는 것만 보이면
 * 된다.
 */
const HOLD: Record<string, number> = {
  울산: 2.4,
  서울: 4.6,
  부산: 1.9,
  인천: 1.9,
  광주: 2.1,
  대전: 2.6,
  대구: 6.0,
  대관령: 2.6,
  울릉도: 5.0,
};

interface Slot {
  t0: number;
  t1: number;
}
const SLOTS: Slot[] = [];
{
  let f = HOOK;
  CAST.forEach((s) => {
    const len = Math.round((HOLD[s.name] ?? 2.2) * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(7.0 * FPS);
export const SNOW_DURATION = BODY_END + OUTRO;

function stepAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/* ── 막대판 좌표 ────────────────────────────────────
   왼쪽에 이름, 가운데 막대, 오른쪽에 cm. 서울 막대 끝에 세로 자를
   세워 모든 막대가 그 선을 넘는지를 한눈에 보인다. */
const ROW_TOP = 700;
const ROW_H = 96;
const BAR_H = 56;
const BAR_X = 300;
const BAR_W = 1080 - SAFE_RIGHT - 150 - BAR_X;
/** 울릉도 150.9가 꽉 찬다 */
const px = (v: number) => (v / BIGGEST.v) * BAR_W;
const RULE_X = BAR_X + px(SEOUL.v);

export const ShortsSnow: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 훅이 '서울 25.8cm — 이보다 많이 온 도시'라고 말한다. 0프레임에
  // 서울 막대와 자가 이미 서 있어야 그 말이 가리킬 것이 있다.
  const started = frame >= HOOK;
  const si = stepAt(frame);
  const cur = CAST[si];
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /**
   * 화면에 남기는 줄.
   *
   * 아홉 줄을 다 쌓으면 안전 영역을 넘는다. 최근 일곱 줄만 남기고
   * 위로 밀어 올린다. 일곱인 것은 광역시가 일곱이라서다 — 울산이
   * 밀려나면 '서울이 광역시 중 6위'라는 절반이 사라진다.
   */
  const KEEP = 7;
  const from = Math.max(0, si - KEEP + 1);
  const rows = started ? CAST.slice(from, si + 1) : [SEOUL];

  const line = inOutro
    ? null
    : cur.name === "서울"
      ? "다들 기억하는 그 폭설"
      : cur.name === "대구"
        ? "제일 더운 도시가 눈도 제일 많이 온 도시"
        : cur.name === "울릉도"
          ? "하루에 어른 키만큼"
          : null;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sn.wav")} volume={0.9} />

      {/* ── 배경 지도 — 어디인지만 준다 ── */}
      <AbsoluteFill style={{ opacity: inOutro ? 0.5 * (1 - outroIn) + 0.5 : 1 }}>
        <svg
          viewBox="200 250 700 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={1.6} />
          ))}
          {(started ? CAST.slice(0, si + 1) : []).map((s, i) => {
            const now = i === si;
            const hot = s.name === "대구";
            return (
              <g key={s.id}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={now ? 11 : 6}
                  fill={now ? (hot ? HOT : SNOW) : "#4C5666"}
                />
                {now && (() => {
                  // 울릉도는 경도 130.9라 오른쪽 안전 영역 밖이다.
                  // 오른쪽 절반에 있는 지점은 라벨을 왼쪽에 단다.
                  const left = s.x > 620;
                  return (
                    <text
                      x={s.x + (left ? -18 : 18)}
                      y={s.y + 9}
                      fontSize={26}
                      fontWeight={900}
                      fill={hot ? HOT : SNOW}
                      textAnchor={left ? "end" : "start"}
                      style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 8 }}
                    >
                      {s.name}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ── 계기판 ── */}
      {frame >= HOOK - 4 && !inOutro && (
        <>
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: 0, height: 1920,
              background:
                "linear-gradient(180deg, rgba(9,11,16,0.92) 0%, rgba(9,11,16,0.8) 34%, rgba(9,11,16,0.86) 100%)",
            }}
          />
          <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
            <div
              style={{
                color: "#7C8496",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              역대 최대 적설 · {METRO.some((m) => m.name === cur.name) ? "특별시 · 광역시" : "전국"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
              <span
                style={{
                  color: cur.name === "대구" ? HOT : "#EDF2F8",
                  fontSize: 92,
                  fontWeight: 900,
                  lineHeight: 1.04,
                }}
              >
                {cur.name}
              </span>
              <span
                style={{
                  color: cur.name === "대구" ? HOT : "#EDF2F8",
                  fontSize: 76,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {cur.v.toFixed(1)}cm
              </span>
            </div>
            <div
              style={{
                color: "#96A0B2",
                fontSize: 38,
                fontWeight: 800,
                marginTop: 8,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(cur.d)} · 전국 {cur.rank}위 / {N_SITES}곳
            </div>
          </div>
        </>
      )}

      {/* ── 막대판 ── */}
      {!inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {/* 자 — 서울 25.8cm. 이 선을 넘느냐가 이 편의 전부다. */}
          <line
            x1={RULE_X}
            y1={ROW_TOP - 54}
            x2={RULE_X}
            y2={ROW_TOP + KEEP * ROW_H - 20}
            stroke={RULE}
            strokeWidth={3}
            strokeDasharray="10 9"
          />
          <text
            x={RULE_X}
            y={ROW_TOP - 68}
            fontSize={27}
            fontWeight={800}
            fill={RULE}
            textAnchor="middle"
          >
            서울 {SEOUL.v.toFixed(1)}cm
          </text>

          {rows.map((s, i) => {
            const idx = started ? from + i : CAST.indexOf(SEOUL);
            const at = started ? SLOTS[idx].t0 : 0;
            const grow = started
              ? interpolate(frame, [at, at + 12], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 1;
            const y = ROW_TOP + i * ROW_H;
            const hot = s.name === "대구";
            const isSeoul = s.name === "서울";
            const c = hot ? HOT : isSeoul ? RULE : SNOW;
            return (
              <g key={s.id} opacity={grow}>
                <text
                  x={BAR_X - 24}
                  y={y + BAR_H - 12}
                  fontSize={44}
                  fontWeight={900}
                  fill={c}
                  textAnchor="end"
                >
                  {s.name}
                </text>
                <rect
                  x={BAR_X}
                  y={y}
                  width={px(s.v) * grow}
                  height={BAR_H}
                  fill={c}
                  opacity={isSeoul ? 0.7 : 1}
                />
                <text
                  x={BAR_X + px(s.v) * grow + 18}
                  y={y + BAR_H - 12}
                  fontSize={40}
                  fontWeight={900}
                  fill={c}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  ×{s.ratio.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* ── 자막 — 화면에 없는 것 한 줄 ── */}
      {line && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 40,
            color: "#EDF2F8",
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.24,
            wordBreak: "keep-all",
          }}
        >
          {line}
        </div>
      )}

      {/* ── 마무리 — 광역시 일곱 ── */}
      {inOutro && (
        <>
          <AbsoluteFill style={{ backgroundColor: "rgba(8,10,14,0.92)", opacity: outroIn }} />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
              opacity: outroIn,
            }}
          >
            <div
              style={{
                color: "#7C8496",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 18,
              }}
            >
              특별시 · 광역시 역대 최대 적설
            </div>
            {METRO.map((s, i) => {
              const at = BODY_END + Math.round((0.4 + i * 0.24) * FPS);
              const on = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const hot = s.name === "대구";
              const isSeoul = s.name === "서울";
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 20,
                    marginTop: 8,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 10}px)`,
                  }}
                >
                  <span
                    style={{
                      color: hot ? HOT : isSeoul ? RULE : "#8E97A8",
                      fontSize: 40,
                      fontWeight: 900,
                      width: 62,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      color: hot ? HOT : isSeoul ? RULE : "#EDF2F8",
                      fontSize: 44,
                      fontWeight: 800,
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      color: hot ? HOT : isSeoul ? RULE : "#EDF2F8",
                      fontSize: 44,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.v.toFixed(1)}cm
                  </span>
                </div>
              );
            })}
            <div
              style={{
                color: "#EDF2F8",
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1.32,
                marginTop: 28,
                wordBreak: "keep-all",
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(2.6 * FPS), BODY_END + Math.round(3.3 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              눈이 가장 많이 온 대도시 — 대구, 서울의 {DAEGU.ratio.toFixed(1)}배
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(8,10,14,0.55)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: RULE, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            2010년 1월 4일
          </div>
          <div
            style={{
              color: "#EDF2F8",
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.16,
              wordBreak: "keep-all",
            }}
          >
            서울보다 눈이 많이 온 도시
          </div>
        </AbsoluteFill>
      )}

      <Grain opacity={0.26} vignette={0.3} />
    </AbsoluteFill>
  );
};
