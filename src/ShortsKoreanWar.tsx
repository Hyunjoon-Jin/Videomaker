import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import provinces from "./data/provinces.json";
import { makePocket, makePolyFront } from "./polyfront";
import {
  FRONT_TRACE,
  KWBattle,
  KW_POCKETS,
  KW_GUERRILLA,
  KW_CITIES,
  TOTAL_DAYS,
  dateLabel,
  kwBattlesUpTo,
  kwEventAt,
} from "./data/korean-war";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { C, FPS } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;
const VIEWBOX: string = provinces.viewBox;

/** 북에서 내려오므로 곡선 '위'가 점령이다 */
const FRONT = makePolyFront(FRONT_TRACE, "north");

/** 교두보 — 전선 뒤에 고립된 아군 지역. 점령색에서 도로 빼낸다. */
const POCKETS = KW_POCKETS.map((p) => ({
  ...p,
  model: makePocket(p.keys, p.from, p.to),
}));

/** 유격 지역 — 점령이 아니므로 채우지 않고 옅게만 표시한다. */
const ZONES = KW_GUERRILLA.map((z) => ({
  ...z,
  model: makePocket(z.keys, z.from, z.to, 12),
}));

const HOOK = Math.round(4.5 * FPS);

/**
 * 3년 1개월을 어떻게 배분하는가.
 * 전선이 뒤집히는 1950년 6개월에 시간의 대부분을 준다.
 * 1951~53 고지전 2년은 전선이 거의 안 움직이므로 짧게 흘린다.
 */
const LEGS: Array<{ from: number; to: number; secs: number }> = [
  { from: 0, to: 52, secs: 8 },      // 남침 → 낙동강
  { from: 52, to: 95, secs: 7 },     // 인천상륙 → 서울 수복
  { from: 95, to: 130, secs: 6 },    // 북진 → 압록강
  { from: 130, to: 193, secs: 7 },   // 중공군 → 1·4후퇴
  { from: 193, to: 330, secs: 5 },   // 재수복 → 38선 고착
  { from: 330, to: TOTAL_DAYS, secs: 5 }, // 고지전 2년
];

const LEG_FRAMES = LEGS.map((l) => Math.round(l.secs * FPS));
export const KW_DURATION = HOOK + LEG_FRAMES.reduce((a, b) => a + b, 0) + 30;

/** 일 → 프레임. 사건이 화면에 뜬 시점을 알아야 글자를 그때부터 쓴다. */
function frameOfDay(d: number): number {
  let f = HOOK;
  for (let i = 0; i < LEGS.length; i++) {
    if (d <= LEGS[i].to) {
      const t = (d - LEGS[i].from) / (LEGS[i].to - LEGS[i].from);
      return f + Math.max(0, Math.min(1, t)) * LEG_FRAMES[i];
    }
    f += LEG_FRAMES[i];
  }
  return f;
}

function dayAt(frame: number): number {
  let f = frame - HOOK;
  if (f <= 0) return 0;
  for (let i = 0; i < LEGS.length; i++) {
    if (f <= LEG_FRAMES[i]) {
      const t = f / LEG_FRAMES[i];
      return LEGS[i].from + (LEGS[i].to - LEGS[i].from) * t;
    }
    f -= LEG_FRAMES[i];
  }
  return TOTAL_DAYS;
}

/**
 * 카메라 샷.
 *
 * 전선이 뒤집히는 네 순간을 각각 다른 거리에서 본다. 낙동강까지 밀릴
 * 때는 부산 쪽으로 조이고, 압록강에 닿을 때는 확 빠져서 그 거리를
 * 보여준다. 좌표는 지도 좌표계(0..1000)이고 project()로 확인했다.
 *
 * 배율 1.75면 반도 전체가 세로로 꽉 찬다. 지금까지는 지도를 상자에
 * 넣어 화면의 4분의 1만 쓰고 있었다.
 */
const SHOTS: Shot[] = [
  { at: HOOK - 20, cx: 460, cy: 500, z: 1.55 },
  { at: HOOK + 40, cx: 462, cy: 530, z: 2.15 },   // 38선 남침
  { at: 375, cx: 596, cy: 742, z: 3.05 },         // 낙동강 방어선
  { at: 521, cx: 436, cy: 566, z: 3.35 },         // 인천상륙
  { at: 600, cx: 452, cy: 548, z: 3.0 },          // 서울 수복
  { at: 729, cx: 386, cy: 268, z: 2.35 },         // 압록강
  { at: 908, cx: 486, cy: 342, z: 2.95 },         // 흥남 철수
  { at: 990, cx: 458, cy: 556, z: 2.3 },          // 1·4후퇴
  { at: 1140, cx: 460, cy: 505, z: 1.72 },        // 고지전 — 빠진다
  { at: 1305, cx: 460, cy: 512, z: 1.66 },
];

const NORTH_C = "#B33A2B";
const SOUTH_C = "#4C7A9B";
const FREE = "#2C2B24";
const HELD = "#7A2A20";

export const ShortsKoreanWar: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const day = dayAt(frame);
  const ev = kwEventAt(day);
  const near = ev ? Math.max(0, 1 - (day - ev.day) / 14) : 0;
  const impact = (ev?.impact ?? 0) * near;

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
  /**
   * 화면 픽셀 → 지도 단위.
   * 확대하면 지도 단위 하나가 더 많은 픽셀을 차지하므로, 선 굵기와
   * 글자 크기를 그대로 두면 줌인할 때 크레용으로 그린 것처럼 굵어진다.
   * 원하는 화면 크기를 넣으면 지금 배율에 맞는 지도 단위를 돌려준다.
   */
  const u = (px: number) => px / (1.08 * cam.z);

  const accent = ev?.south ? SOUTH_C : NORTH_C;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-kw.wav")} volume={0.9} />

      {/* ── 지도 ── 화면 전체를 쓴다. 상자에 넣으면 반도가 손톱만 해진다 */}
      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <clipPath id="kwLand">
              {PROVINCES.filter((p) => p.id !== "jeju").map((p) => (
                <path key={p.id} d={p.d} />
              ))}
            </clipPath>
          </defs>

          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={FREE} stroke="none" />
          ))}

          <g clipPath="url(#kwLand)">
            <path d={FRONT.areaAt(day)} fill={HELD} />
            {/* 교두보를 점령색에서 빼낸다 — 순서가 중요하다.
                점령 채움 뒤, 전선 그리기 앞. */}
            {POCKETS.map((p) => {
              const a = p.model.alphaAt(day);
              if (a <= 0) return null;
              return <path key={p.id} d={p.model.pathAt(day)} fill={FREE} opacity={a} />;
            })}
            <path
              d={FRONT.lineAt(day)}
              fill="none"
              stroke="#D4694F"
              strokeWidth={3}
              opacity={0.85}
            />
            {POCKETS.map((p) => {
              const a = p.model.alphaAt(day);
              if (a <= 0) return null;
              return (
                <path
                  key={`o${p.id}`}
                  d={p.model.pathAt(day)}
                  fill="none"
                  stroke={SOUTH_C}
                  strokeWidth={3.4}
                  strokeDasharray="9 6"
                  opacity={a}
                />
              );
            })}
          </g>

          {/* 유격 지역 — 점령색으로 칠하지 않는다. 옅은 음영 + 점선. */}
          <g clipPath="url(#kwLand)">
            {ZONES.map((z) => {
              const a = z.model.alphaAt(day);
              if (a <= 0) return null;
              const d = z.model.pathAt(day);
              return (
                <g key={z.id}>
                  <path d={d} fill={NORTH_C} opacity={a * 0.28} />
                  <path
                    d={d}
                    fill="none"
                    stroke={NORTH_C}
                    strokeWidth={2.4}
                    strokeDasharray="5 5"
                    opacity={a * 0.9}
                  />
                </g>
              );
            })}
          </g>

          {PROVINCES.map((p) => (
            <path key={`c${p.id}`} d={p.d} fill="none" stroke="#4A4638" strokeWidth={1.4} />
          ))}

          {/* 38선 — 시작이자 끝. 기준선으로 계속 보여준다. */}
          <line
            x1={0}
            y1={511}
            x2={1000}
            y2={511}
            stroke="#8E8474"
            strokeWidth={1.6}
            strokeDasharray="10 8"
            opacity={0.5}
          />
          <text x={905} y={505} fontSize={18} fontWeight={700} fill="#8E8474" opacity={0.75}>
            38°
          </text>

          {KW_CITIES.filter((c) => c.from <= day).map((c) => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r={4} fill="#C09240" />
              <text
                x={c.side === "left" ? c.x - 11 : c.x + 11}
                y={c.y + 6}
                textAnchor={c.side === "left" ? "end" : "start"}
                fontSize={23}
                fontWeight={900}
                fill="#DCC48C"
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: 5 }}
              >
                {c.name}
              </text>
            </g>
          ))}

          {/* 교두보 라벨은 육지 클립 밖에서 그린다. 안에서 그리면 잘린다. */}
          {POCKETS.map((p) => {
            const a = p.model.alphaAt(day);
            if (a <= 0) return null;
            const q = project(p.labelAt[0], p.labelAt[1]);
            return (
              <text
                key={`l${p.id}`}
                x={q.x}
                y={q.y}
                textAnchor={p.side === "left" ? "end" : "start"}
                fontSize={21}
                fontWeight={900}
                fill={SOUTH_C}
                opacity={a}
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: 5 }}
              >
                {p.label}
              </text>
            );
          })}

          {ZONES.map((z) => {
            const a = z.model.alphaAt(day);
            if (a <= 0) return null;
            const q = project(z.labelAt[0], z.labelAt[1]);
            return (
              <text
                key={`z${z.id}`}
                x={q.x}
                y={q.y}
                textAnchor={z.side === "left" ? "end" : "start"}
                fontSize={20}
                fontWeight={900}
                fill="#C08A7A"
                opacity={a}
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: 5 }}
              >
                {z.label}
              </text>
            );
          })}

          {kwBattlesUpTo(day).map((b) => (
            <Mark key={b.name} b={b} day={day} u={u} />
          ))}
        </svg>
      </AbsoluteFill>

      {/* 글자 자리 어둠 — 지도가 전면이라 이게 없으면 글자가 지도에 묻힌다 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(12,10,8,0.93) 0%, rgba(12,10,8,0.55) 12%, rgba(12,10,8,0) 22%, rgba(12,10,8,0) 62%, rgba(12,10,8,0.7) 76%, rgba(12,10,8,0.94) 88%)",
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, ${
            ev?.south ? "rgba(76,122,155," : "rgba(179,58,43,"
          }${impact * 0.18}) 0%, rgba(0,0,0,0) 58%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 날짜 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", top: 104, left: 60, right: 60 }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            6·25 전쟁
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
            {dateLabel(day)}
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: accent, fontSize: 34, fontWeight: 900 }}>
            {ev.south ? "국군·유엔군" : "북한군·중국군"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfDay(ev.day)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          <Typed
            text={ev.detail}
            start={frameOfDay(ev.day) + Math.ceil((ev.title.length * 30) / 14) + 5}
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
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color={HELD} label="북한군·중국군" />
            <Key color={SOUTH_C} label="국군·유엔군 승" />
            <Key color={NORTH_C} label="북한군·중국군 승" />
            <Key color="#C08A7A" label="유격 지역" />
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            좌표는 실측값, 그 사이는 추정 (자세한 설명은 고정댓글)
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
              text="1950년 6월 25일 새벽, 38선"
              start={4}
              cps={30}
              style={{
                display: "block",
                color: C.dim,
                fontSize: 40,
                fontWeight: 700,
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="40"
                start={40}
                cps={8}
                style={{
                  color: "#D4694F",
                  fontSize: 280,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="일"
                start={48}
                cps={8}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="낙동강까지 밀리는 데 걸린 시간"
              start={66}
              cps={22}
              style={{
                display: "block",
                color: C.text,
                fontSize: 50,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>        </AbsoluteFill>
      )}
      <Grain />
    </AbsoluteFill>
  );
};

const Mark: React.FC<{ b: KWBattle; day: number; u: (px: number) => number }> = ({
  b,
  day,
  u,
}) => {
  const fresh = Math.max(0, 1 - (day - b.day) / 12);
  const color = b.won === "south" ? SOUTH_C : NORTH_C;
  const r = u(b.major ? 8 : 5);
  return (
    <g>
      {fresh > 0 && (
        <circle
          cx={b.x}
          cy={b.y}
          r={r + fresh * u(34)}
          fill="none"
          stroke={color}
          strokeWidth={u(3)}
          opacity={fresh * 0.75}
        />
      )}
      {b.sea ? (
        <circle cx={b.x} cy={b.y} r={r} fill="#151310" stroke={color} strokeWidth={u(4)} />
      ) : (
        <rect
          x={b.x - r}
          y={b.y - r}
          width={r * 2}
          height={r * 2}
          fill={color}
          stroke="#151310"
          strokeWidth={u(1.8)}
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      )}
      {b.major && (
        <text
          x={b.side === "left" ? b.x - u(17) : b.x + u(17)}
          y={b.y + u(8) + u(b.dy ?? 0)}
          textAnchor={b.side === "left" ? "end" : "start"}
          fontSize={u(28)}
          fontWeight={900}
          fill={color}
          style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(6) }}
        >
          {b.name}
        </text>
      )}
    </g>
  );
};

const Key: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <div style={{ width: 24, height: 24, background: color }} />
    <span style={{ color: "#BDB3A0", fontSize: 24, fontWeight: 700 }}>{label}</span>
  </div>
);
