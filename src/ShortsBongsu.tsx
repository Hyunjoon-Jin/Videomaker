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
  BEACON_XY,
  B_EVENTS,
  LIT_AT,
  RULE_HOURS,
  SIGNALS,
  hourLabel,
  relayPath,
} from "./data/bongsu";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(4.5 * FPS);

/**
 * 봉수 하나가 붙는 것이 사건 하나다.
 * 값은 개월도 연도도 아니고 시(hour)다. beats는 단조 증가하는 스칼라면
 * 무엇이든 받으므로 엔진은 그대로 쓴다.
 */
/**
 * 둘째 줄이 없는 봉수는 짧게 끊는다.
 * 지명 한 줄만 읽으면 되는데 2.4초를 세우면 화면이 선다. 불이 달려가는
 * 편이라 그 정지가 더 크게 걸린다.
 */
const BEATS = B_EVENTS.map((e) =>
  beatFor(e.at, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS)
);
const SPANS = layoutBeats(BEATS, HOOK, 0.22);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(10 * FPS);
export const BONGSU_DURATION = BODY_END + OUTRO;

/** 마무리에 세우는 연표 */
const CHRON: Array<[string, string]> = [
  ["1419", "세종, 5거제로 확정"],
  ["1532", "변방에서 서울까지 닷새"],
  ["1592", "임진왜란 — 봉수가 오지 않았다"],
  ["1597", "파발 설치, 말이 봉수를 대신하다"],
  ["1895", "봉수 폐지"],
];

function hourAt(frame: number): number {
  return valueAtBeats(SPANS, frame, RULE_HOURS);
}

function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 520, cy: 700, z: 1.9 },
  ...SPANS.flatMap((sp, i) => {
    const e = B_EVENTS[i];
    if (!e.focus) return [];
    const q = project(e.focus[0], e.focus[1]);
    return [
      { at: sp.t1, cx: q.x, cy: q.y, z: e.zoom ?? 2.6 },
      { at: sp.t2, cx: q.x, cy: q.y, z: e.zoom ?? 2.6 },
    ];
  }),
  // 마무리 — 불이 지나온 길 전체가 한 화면에 들어오게 뺀다
  { at: BODY_END + Math.round(1.8 * FPS), cx: 470, cy: 640, z: 1.62 },
];

/** 밤이다. 다른 편보다 땅을 더 어둡게 깔고 불만 띄운다. */
const LAND = "#191610";
const COAST = "#3A3324";

export const ShortsBongsu: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const h = hourAt(frame);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? B_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 8, HOOK + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);

  const labelFits = (x: number, chars: number) => {
    const w = u(20) * chars;
    return x - w > cam.x + u(16) && x + w < cam.x + cam.w - u(16);
  };

  /** 불꽃은 깜빡인다. 정지한 불은 불로 안 보인다. */
  const flicker = 0.86 + 0.14 * Math.sin(frame / 2.6) * Math.sin(frame / 5.3);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-bs.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND} stroke={COAST} strokeWidth={u(1.6)} />
          ))}

          {/* 아직 불이 안 붙은 구간 — 어디로 갈지 미리 옅게 깔아둔다 */}
          <path
            d={BEACON_XY.map((b, i) => `${i ? "L" : "M"}${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join("")}
            fill="none"
            stroke={INK.ember}
            strokeWidth={u(2)}
            strokeDasharray={`${u(7)} ${u(9)}`}
            opacity={0.28}
          />

          {/* 불이 지나온 길 */}
          <path
            d={relayPath(h)}
            fill="none"
            stroke={INK.ember}
            strokeWidth={u(5.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />

          {BEACON_XY.map((b, i) => {
            const lit = h >= LIT_AT[i];
            if (!lit) {
              return (
                <circle
                  key={b.name}
                  cx={b.x}
                  cy={b.y}
                  r={u(4)}
                  fill="none"
                  stroke={INK.ember}
                  strokeWidth={u(2)}
                  opacity={0.35}
                />
              );
            }
            // 방금 붙은 불만 크게 타오른다. 나머지는 잔불로 남는다.
            const age = h - LIT_AT[i];
            const fresh = Math.max(0, 1 - age / 0.9);
            return (
              <g key={b.name}>
                {fresh > 0 && (
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={u(9) + fresh * u(46)}
                    fill="none"
                    stroke={INK.flame}
                    strokeWidth={u(3)}
                    opacity={fresh * 0.8}
                  />
                )}
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={u(9 + fresh * 7)}
                  fill={INK.flame}
                  opacity={(0.5 + fresh * 0.5) * flicker}
                />
                <circle cx={b.x} cy={b.y} r={u(4)} fill="#FFF3D6" opacity={flicker} />
                {labelFits(b.x, b.name.length) && (
                  <text
                    x={b.side === "left" ? b.x - u(16) : b.x + u(16)}
                    y={b.y + u(8) + u(b.dy ?? 0)}
                    textAnchor={b.side === "left" ? "end" : "start"}
                    fontSize={u(26)}
                    fontWeight={900}
                    fill={fresh > 0.2 ? "#FFE9BC" : "#B99A6A"}
                    style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                  >
                    {b.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,6,0.94) 0%, rgba(10,8,6,0.55) 12%, rgba(10,8,6,0) 22%, rgba(10,8,6,0) 60%, rgba(10,8,6,0.74) 76%, rgba(10,8,6,0.95) 88%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, rgba(217,116,31,${impact * 0.2}) 0%, rgba(0,0,0,0) 58%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 경과 시간 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", top: 104, left: 60, right: 60 }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            불을 올린 지
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hourLabel(h)}
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: INK.flame, fontSize: 34, fontWeight: 900 }}>
            {BEACON_XY[bi]?.heritage ? "국가 사적" : "제2로 직봉"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          {ev.detail && (
            <Typed
              text={ev.detail}
              start={frameOfEvent(bi) + Math.ceil((ev.title.length * 30) / 14) + 5}
              cps={26}
              style={{
                display: "block",
                color: "#BDB3A0",
                fontSize: 38,
                fontWeight: 500,
                marginTop: 8,
              }}
            />
          )}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(10,8,6,0) 24%, rgba(10,8,6,0.72) 40%, rgba(10,8,6,0.95) 54%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: "0 60px 232px",
              opacity: outroIn,
            }}
          >
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
              봉수가 지나온 476년
            </div>
            {CHRON.map(([y, what], i) => (
              <div
                key={y}
                style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 2 }}
              >
                <span
                  style={{
                    color: C.dim,
                    fontSize: 38,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 130,
                  }}
                >
                  {y}
                </span>
                <span
                  style={{
                    color: i === 1 || i === 2 ? "#D4694F" : INK.flame,
                    fontSize: i === 1 || i === 2 ? 42 : 44,
                    fontWeight: 900,
                  }}
                >
                  {what}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: "#3B342A", margin: "24px 0 16px" }} />
            <div style={{ color: C.text, fontSize: 50, fontWeight: 800, lineHeight: 1.34 }}>
              규정은 12시간이었다
              <br />
              1532년에는 닷새가 걸렸다
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 거화법 · 고지 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 18, marginBottom: 10, flexWrap: "wrap" }}>
            {SIGNALS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  // 이 밤에 올라간 것은 2거다
                  opacity: s.n === 2 ? 1 : 0.34,
                }}
              >
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: s.n }).map((_, k) => (
                    <div
                      key={k}
                      style={{
                        width: 9,
                        height: 22,
                        borderRadius: 5,
                        background: s.n === 2 ? INK.flame : "#7A6B4E",
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: "#BDB3A0", fontSize: 21, fontWeight: 700 }}>
                  {s.n === 2 ? s.means : `${s.n}거`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            봉수 위치는 실측값 · 시각은 규정 12시간을 길이로 나눈 값 (고정댓글)
          </div>
        </div>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: C.bg,
            opacity: hookOut,
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="조선, 부산에서 서울까지"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="12"
                start={40}
                cps={8}
                style={{
                  color: INK.flame,
                  fontSize: 280,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="시간"
                start={48}
                cps={8}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="불로 소식을 보내는 데 걸린다고 한 시간"
              start={66}
              cps={22}
              style={{
                display: "block",
                color: C.text,
                fontSize: 48,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>
        </AbsoluteFill>
      )}
      <Grain />
    </AbsoluteFill>
  );
};
