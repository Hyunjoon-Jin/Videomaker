import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { EA_KOREA, EA_LANDS } from "./data/typhoon";
import {
  BUSAN_IN,
  BUSAN_OUT,
  EDO_IN,
  EDO_OUT,
  FULL_PATH,
  MISSIONS,
  TOTAL_DAYS,
  T_EVENTS,
  XY,
  lunarLabel,
  pointAt,
  progressAt,
  traveled,
} from "./data/tongsinsa";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const HOOK = Math.round(4.5 * FPS);

/**
 * 기다리는 시간은 길게 준다.
 *
 * 이 편의 답은 '멀어서 오래 걸렸다'가 아니라 '기다리느라 오래 걸렸다'다.
 * 부산에서 배를 기다린 42일과 오사카까지 걸린 103일은 지도 위에서 거의
 * 안 움직이는 구간이라, 기본 이동 시간(1초)을 주면 숫자만 훌쩍 뛴다.
 * 화면은 멈춰 있고 날짜만 올라가는 시간을 따로 벌어준다.
 */
const SLOW: Record<number, number> = { 2: 2.6, 4: 3.0, 9: 2.2 };
const BEATS = T_EVENTS.map((e, i) => {
  const b = beatFor(e.day, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS);
  return SLOW[i] ? { ...b, travel: Math.round(SLOW[i] * FPS) } : b;
});
/**
 * creep을 0.03까지 낮춘다.
 *
 * 다른 편은 체류 중에도 값이 조금씩 나아가게 두었다. 여기서는 그러면
 * 안 된다. '쓰시마까지 하루'라고 써놓고 화면 위 숫자가 74일을 가리키면
 * 자막과 시계가 서로를 부정한다. 다음 사건까지 103일이 비는 구간이
 * 있어서 다른 편보다 훨씬 작게 잡아야 한다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0.03);
const BODY_END = SPANS[SPANS.length - 1].t2;
// 마무리에 1876년 한 줄이 늘어서 읽을 것이 많아졌다
const OUTRO = Math.round(12.5 * FPS);
export const TONGSINSA_DURATION = BODY_END + OUTRO;

function dayAtFrame(frame: number): number {
  return valueAtBeats(SPANS, frame, TOTAL_DAYS);
}

function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

/**
 * 카메라는 사행을 따라간다.
 *
 * 봉수 편이 남에서 북으로만 갔다면 이 편은 서에서 동으로만 간다. 다만
 * 오사카까지 103일을 한 비트로 넘기는 구간에서는 배가 화면 밖으로 나가
 * 버리므로, 그 비트만 도착지가 아니라 구간 전체가 보이게 물러선다.
 */
const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 420, cy: 430, z: 3.2 },
  ...SPANS.flatMap((sp, i) => {
    const e = T_EVENTS[i];
    const a = pointAt(Math.max(0, Math.min(1, progressAt(e.day))));
    const b = pointAt(Math.max(0, Math.min(1, progressAt(SPANS[i].vIn))));
    const z = e.zoom ?? 2.4;
    return [
      // 이동 중에는 출발점과 도착점의 중간을 잡아 화면이 끌려가게 둔다
      { at: sp.t0 + Math.round((sp.t1 - sp.t0) * 0.5), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: z * 0.9 },
      { at: sp.t1, cx: a.x, cy: a.y, z },
      { at: sp.t2, cx: a.x, cy: a.y, z },
    ];
  }),
  // 마무리 — 한양과 에도가 한 화면에 들어와야 한다
  { at: BODY_END + Math.round(1.8 * FPS), cx: 620, cy: 470, z: 1.42 },
];

const LAND = "#221D16";
const COAST = "#3E3627";
const KOREA = "#2E2519";

export const ShortsTongsinsa: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const day = dayAtFrame(frame);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? T_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  // 길은 지워지지 않는다. 돌아오는 길에는 머리만 되짚어 내려온다.
  const p = Math.max(0, Math.min(1, progressAt(day)));
  const pMax = Math.max(0, Math.min(1, progressAt(Math.min(day, EDO_IN))));
  const trail = traveled(pMax);
  const head = pointAt(p);
  const goingBack = day > EDO_OUT;

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

  // 부산에서 배를 기다리는 동안은 화면이 멈춘다. 배만 미세하게 흔들린다.
  const waiting = day > BUSAN_IN + 0.5 && day < BUSAN_OUT - 0.5;
  const bob = Math.sin(frame / 7.5) * 1.2;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ts.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {EA_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={LAND} stroke={COAST} strokeWidth={u(1.4)} />
          ))}
          {/* 조선만 한 톤 밝게 — 출발지가 어디인지 계속 보여야 한다 */}
          {EA_KOREA.map((d, i) => (
            <path key={`k${i}`} d={d} fill={KOREA} stroke={COAST} strokeWidth={u(2.2)} />
          ))}

          {/* 앞으로 갈 길 */}
          <path
            d={FULL_PATH}
            fill="none"
            stroke={INK.brass}
            strokeWidth={u(2)}
            strokeDasharray={`${u(6)} ${u(10)}`}
            opacity={0.22}
          />

          {/* 지나온 길 — 육로는 실선, 해로는 점선 */}
          {trail.land && (
            <path
              d={trail.land}
              fill="none"
              stroke={INK.brass}
              strokeWidth={u(5)}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
          )}
          {trail.sea && (
            <path
              d={trail.sea}
              fill="none"
              stroke={INK.indigoHot}
              strokeWidth={u(5)}
              strokeDasharray={`${u(11)} ${u(8)}`}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
          )}

          {XY.map((s, i) => {
            if (!s.show) return null;
            if (s.minZ != null && cam.z < s.minZ) return null;
            const reached = pointReached(i, pMax);
            return (
              <g key={s.name} opacity={reached ? 1 : 0.4}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={u(reached ? 5 : 3.5)}
                  fill={reached ? INK.bone : "none"}
                  stroke={INK.brass}
                  strokeWidth={u(2)}
                />
                {labelFits(s.x, s.name.length) && (
                  <text
                    x={s.side === "left" ? s.x - u(14) : s.x + u(14)}
                    y={s.y + u(8) + u(s.dy ?? 0)}
                    textAnchor={s.side === "left" ? "end" : "start"}
                    fontSize={u(25)}
                    fontWeight={900}
                    fill={reached ? "#E7DAC0" : "#8A7C63"}
                    style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                  >
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* 사행의 현재 위치 */}
          <g transform={`translate(${head.x} ${head.y + (waiting || head.sea ? bob : 0)})`}>
            {head.sea ? (
              <g>
                {/* 배 — 선체와 돛 하나. 이 축척에서 더 그리면 뭉갠다 */}
                <path
                  d={`M${-u(13)} ${u(3)} L${u(13)} ${u(3)} L${u(9)} ${u(10)} L${-u(9)} ${u(10)} Z`}
                  fill={INK.bone}
                />
                <rect x={-u(1.4)} y={-u(16)} width={u(2.8)} height={u(19)} fill={INK.bone} />
                <path
                  d={`M${u(2)} ${-u(15)} L${u(13)} ${-u(4)} L${u(2)} ${-u(4)} Z`}
                  fill={INK.brass}
                />
              </g>
            ) : (
              <g>
                <circle r={u(9)} fill={INK.brass} opacity={0.5} />
                <circle r={u(5)} fill={INK.bone} />
              </g>
            )}
            {impact > 0.15 && (
              <circle
                r={u(14) + impact * u(52)}
                fill="none"
                stroke={goingBack ? INK.oxideHot : INK.brass}
                strokeWidth={u(3)}
                opacity={impact * 0.7}
              />
            )}
          </g>
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,6,0.94) 0%, rgba(10,8,6,0.55) 13%, rgba(10,8,6,0) 24%, rgba(10,8,6,0) 58%, rgba(10,8,6,0.74) 75%, rgba(10,8,6,0.95) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 경과 일수 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", top: 104, left: 60, right: 60 }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            한양을 떠난 지
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                color: C.text,
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(day)}
            </span>
            <span style={{ color: C.text, fontSize: 44, fontWeight: 800 }}>일</span>
            <span style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginLeft: 10 }}>
              {lunarLabel(day)}
            </span>
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: ev.back ? INK.oxideHot : INK.brass, fontSize: 34, fontWeight: 900 }}>
            {ev.back ? "돌아오는 길" : head.sea ? "바닷길" : "뭍길"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
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
        </div>
      )}

      {/* ── 범례 · 고지 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 26, marginBottom: 10 }}>
            <Legend color={INK.brass} dashed={false} text="뭍길" />
            <Legend color={INK.indigoHot} dashed text="바닷길" />
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            날짜는 사행록 기록값(음력) · 그 사이 위치는 거리에 비례한 보간 (고정댓글)
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(10,8,6,0) 22%, rgba(10,8,6,0.72) 38%, rgba(10,8,6,0.95) 52%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{ justifyContent: "flex-end", padding: "0 60px 232px", opacity: outroIn }}
          >
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
              통신사 열두 번, 204년
            </div>
            {MISSIONS.map(([y, what], i) => (
              <div key={y} style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 2 }}>
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
                    color: i === 3 ? INK.oxideHot : i === 4 ? INK.indigoHot : INK.brass,
                    fontSize: 42,
                    fontWeight: 900,
                  }}
                >
                  {what}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: "#3B342A", margin: "24px 0 16px" }} />
            <div style={{ color: C.text, fontSize: 50, fontWeight: 800, lineHeight: 1.34 }}>
              부산에서 도쿄까지 8일이 걸렸다
              <br />
              방금 본 그 길은 129일이었다
            </div>
          </AbsoluteFill>
        </>
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
              text="1763년, 사절 477명이 에도로 떠났다"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="24"
                start={44}
                cps={8}
                style={{
                  color: INK.brass,
                  fontSize: 280,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="일"
                start={52}
                cps={8}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="여섯 달을 가서 머문 날"
              start={70}
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

const Legend: React.FC<{ color: string; dashed: boolean; text: string }> = ({
  color,
  dashed,
  text,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <svg width={54} height={10}>
      <line
        x1={0}
        y1={5}
        x2={54}
        y2={5}
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={dashed ? "11 8" : undefined}
      />
    </svg>
    <span style={{ color: "#BDB3A0", fontSize: 22, fontWeight: 700 }}>{text}</span>
  </div>
);

/** 그 지점을 이미 지났는지 */
function pointReached(i: number, pMax: number): boolean {
  return CUM_RATIO[i] <= pMax + 1e-6;
}

const CUM_RATIO: number[] = (() => {
  const seg: number[] = [];
  for (let i = 1; i < XY.length; i++) {
    seg.push(Math.hypot(XY[i].x - XY[i - 1].x, XY[i].y - XY[i - 1].y));
  }
  const cum = [0];
  for (const s of seg) cum.push(cum[cum.length - 1] + s);
  const total = cum[cum.length - 1];
  return cum.map((v) => v / total);
})();
