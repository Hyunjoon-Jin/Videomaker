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
  KW_EVENTS,
  TOTAL_DAYS,
  dateLabel,
  kwBattlesUpTo,
  kwEventAt,
} from "./data/korean-war";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { beatIndexAt, beatOf, layoutBeats, valueAtBeats } from "./beats";
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
 * 사건마다 시간을 준다.
 * 날짜 구간에 초를 배분하면 중국군 참전과 장진호처럼 열흘 차이 나는
 * 사건들이 1초 만에 지나간다. 자막을 다 읽기 전에 다음 자막이 온다.
 */
const BEATS = KW_EVENTS.map((e) => beatOf(e.day, e.impact ?? 0.4, FPS));
const SPANS = layoutBeats(BEATS, HOOK, 0.22);
/**
 * 마무리.
 *
 * 정전협정 자막이 끝나자마자 화면이 꺼졌다. 3년을 따라온 사람 입장에서는
 * 끝난 게 아니라 끊긴 것이다. 철도·태풍 편처럼 카메라를 반도 전체로 빼고
 * 전선이 닿았던 자리를 한 장으로 세운 뒤 닫는다.
 */
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(9.5 * FPS);
export const KW_DURATION = BODY_END + OUTRO;

/** 전선이 가장 멀리 닿았던 자리 — 마무리에 세운다 */
const REACH: Array<[string, string]> = [
  ["1950. 6. 25", "38선"],
  ["1950. 8. 4", "낙동강"],
  ["1950. 10. 26", "압록강"],
  ["1951. 1. 25", "평택·원주·삼척"],
  ["1953. 7. 27", "38선 언저리"],
];

function dayAt(frame: number): number {
  return valueAtBeats(SPANS, frame, TOTAL_DAYS);
}

/** 사건이 화면에 뜨는 프레임 = 카메라가 도착하는 프레임 */
function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

/** 카메라 샷 — 이동 구간에 움직이고 체류 구간에 선다 */
const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 460, cy: 500, z: 1.5 },
  ...SPANS.flatMap((sp, i) => {
    const e = KW_EVENTS[i];
    if (!e.focus) return [];
    const q = project(e.focus[0], e.focus[1]);
    const z = e.zoom ?? 2.4;
    return [
      { at: sp.t1, cx: q.x, cy: q.y, z },
      { at: sp.t2, cx: q.x, cy: q.y, z },
    ];
  }),
  // 마무리 — 반도 전체로 빠진다. 3년을 따라온 선을 통째로 보여주고 닫는다.
  // cy를 반도 중심(500)보다 아래로 잡아야 지도가 화면 위쪽으로 올라온다.
  // 마무리 글이 아래 절반을 쓰므로 휴전선이 글자 위에 걸리게 맞춘 값이다.
  { at: BODY_END + Math.round(1.8 * FPS), cx: 462, cy: 552, z: 1.45 },
];

const NORTH_C = "#B33A2B";
const SOUTH_C = "#4C7A9B";
const FREE = "#2C2B24";
const HELD = "#7A2A20";
/**
 * 유격 지역 색.
 *
 * 점령색(HELD)과 같은 계열의 어두운 붉은색을 쓰다가, 1·4후퇴로 전선이
 * 내려온 동안 태백산맥 일대가 점령색 위에 겹쳐 붉은색 위의 붉은색이
 * 되면서 화면에서 사라졌다. 같은 계열이되 훨씬 밝은 값으로 올려
 * 어두운 미점령색 위에서도, 점령색 위에서도 뜨게 한다.
 */
const ZONE_C = "#E8A48C";

export const ShortsKoreanWar: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const day = dayAt(frame);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? KW_EVENTS[bi] : null;
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
  /**
   * 화면 픽셀 → 지도 단위.
   * 확대하면 지도 단위 하나가 더 많은 픽셀을 차지하므로, 선 굵기와
   * 글자 크기를 그대로 두면 줌인할 때 크레용으로 그린 것처럼 굵어진다.
   * 원하는 화면 크기를 넣으면 지금 배율에 맞는 지도 단위를 돌려준다.
   */
  const u = (px: number) => px / (1.08 * cam.z);

  /**
   * 이 지점의 라벨을 그려도 되는가.
   *
   * 교두보·유격 지역 라벨은 지도 좌표에 고정돼 있는데, 카메라가 서울로
   * 붙으면 태백산맥 라벨이 화면 오른쪽 끝에 걸쳐 "태백" 하고 잘린다.
   * 잘린 글자는 정보가 아니라 고장으로 보인다. 글자 길이만큼 여백을
   * 두고 그 안에 못 들어오면 아예 그리지 않는다.
   */
  const labelFits = (x: number, chars: number) => {
    const w = u(20) * chars;
    return x - w > cam.x + u(20) && x + w < cam.x + cam.w - u(20);
  };

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

            {/*
              전선에서 교두보 안쪽을 도려낸다.
              교두보는 전선 뒤에 고립된 아군 지역이므로 그 안으로 전선이
              지나갈 이유가 없는데, 전선이 흥남을 스쳐 지나가는 12월에는
              빨간 전선과 파란 점선이 같은 자리에서 엉켜 무슨 선인지
              읽히지 않았다. 마스크로 안쪽을 지우면 전선이 교두보 경계에서
              끊기고 두 선이 만나지 않는다.
            */}
            <mask id="kwFrontMask" maskUnits="userSpaceOnUse" x={-200} y={-200}
                  width={1400} height={1400}>
              <rect x={-200} y={-200} width={1400} height={1400} fill="#fff" />
              {POCKETS.map((p) => {
                const a = p.model.alphaAt(day);
                if (a <= 0) return null;
                return (
                  <path key={`m${p.id}`} d={p.model.pathAt(day)} fill="#000" opacity={a} />
                );
              })}
            </mask>

            {/*
              유격 지역용 빗금.
              전에는 붉은 반투명 면으로 칠했는데, 1·4후퇴로 전선이 내려온
              동안 태백산맥이 북한군 점령색(붉은 갈색) 위에 놓여 붉은색
              위의 붉은색이 되어 통째로 사라졌다. 빗금은 바탕이 어둡든
              붉든 위로 떠오른다.

              patternUnits이 지도 좌표계이므로 확대하면 빗금 간격이
              벌어진다. u()로 간격을 잡아 화면상 간격을 일정하게 둔다.
            */}
            <pattern
              id="kwHatch"
              patternUnits="userSpaceOnUse"
              width={u(13)}
              height={u(13)}
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={u(13)}
                stroke={ZONE_C}
                strokeWidth={u(3.6)}
              />
            </pattern>
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
              strokeWidth={u(3)}
              opacity={0.85}
              mask="url(#kwFrontMask)"
            />
            {POCKETS.map((p) => {
              const a = p.model.alphaAt(day);
              if (a <= 0) return null;
              const d = p.model.pathAt(day);
              return (
                <g key={`o${p.id}`} opacity={a}>
                  {/* 바탕색 테두리를 먼저 깔아 전선과 붙어도 두 선이 구분된다 */}
                  <path d={d} fill="none" stroke={C.bg} strokeWidth={u(8)} />
                  <path
                    d={d}
                    fill="none"
                    stroke={SOUTH_C}
                    strokeWidth={u(3.4)}
                    strokeDasharray={`${u(9)} ${u(6)}`}
                  />
                </g>
              );
            })}
          </g>

          {/* 유격 지역 — 점령색으로 칠하지 않는다. 빗금 + 점선. */}
          <g clipPath="url(#kwLand)">
            {ZONES.map((z) => {
              const a = z.model.alphaAt(day);
              if (a <= 0) return null;
              const d = z.model.pathAt(day);
              return (
                <g key={z.id} opacity={a}>
                  {/* 빗금이 뜨도록 바탕을 살짝 어둡게 깐다.
                      점령색 위에서도, 미점령색 위에서도 같은 밝기가 된다. */}
                  <path d={d} fill="#151310" opacity={0.42} />
                  <path d={d} fill="url(#kwHatch)" opacity={0.95} />
                  <path
                    d={d}
                    fill="none"
                    stroke={ZONE_C}
                    strokeWidth={u(2.6)}
                    strokeDasharray={`${u(6)} ${u(5)}`}
                  />
                </g>
              );
            })}
          </g>

          {PROVINCES.map((p) => (
            <path key={`c${p.id}`} d={p.d} fill="none" stroke="#4A4638" strokeWidth={u(1.4)} />
          ))}

          {/* 38선 — 시작이자 끝. 기준선으로 계속 보여준다. */}
          <line
            x1={0}
            y1={511}
            x2={1000}
            y2={511}
            stroke="#8E8474"
            strokeWidth={u(1.6)}
            strokeDasharray={`${u(10)} ${u(8)}`}
            opacity={0.5}
          />
          <text
            x={cam.x + cam.w - u(28)}
            y={511 - u(9)}
            textAnchor="end"
            fontSize={u(20)}
            fontWeight={700}
            fill="#8E8474"
            opacity={0.75}
          >
            38°
          </text>

          {KW_CITIES.filter((c) => c.from <= day && day < (c.until ?? Infinity)).map((c) => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r={u(4)} fill="#C09240" />
              <text
                x={c.side === "left" ? c.x - u(11) : c.x + u(11)}
                y={c.y + u(6)}
                textAnchor={c.side === "left" ? "end" : "start"}
                fontSize={u(23)}
                fontWeight={900}
                fill="#DCC48C"
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(5) }}
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
            if (!labelFits(q.x, p.label.length)) return null;
            return (
              <text
                key={`l${p.id}`}
                x={q.x}
                y={q.y}
                textAnchor={p.side === "left" ? "end" : "start"}
                fontSize={u(21)}
                fontWeight={900}
                fill={SOUTH_C}
                opacity={a}
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(5) }}
              >
                {p.label}
              </text>
            );
          })}

          {ZONES.map((z) => {
            const a = z.model.alphaAt(day);
            if (a <= 0) return null;
            const q = project(z.labelAt[0], z.labelAt[1]);
            if (!labelFits(q.x, z.label.length)) return null;
            return (
              <text
                key={`z${z.id}`}
                x={q.x}
                y={q.y}
                textAnchor={z.side === "left" ? "end" : "start"}
                fontSize={u(20)}
                fontWeight={900}
                fill={ZONE_C}
                opacity={a}
                style={{ paintOrder: "stroke", stroke: "#151310", strokeWidth: u(5) }}
              >
                {z.label}
              </text>
            );
          })}

          {kwBattlesUpTo(day).map((b) => (
            <Mark key={b.name} b={b} day={day} u={u} fits={labelFits} />
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
      {mapIn > 0.5 && !inOutro && (
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
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: accent, fontSize: 34, fontWeight: 900 }}>
            {ev.south ? "국군·유엔군" : "북한군·중국군"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
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

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          {/* 마무리 글이 다섯 줄이라 본문용 그라데이션보다 위까지 올라온다.
              그 위로 지도가 그대로 비쳐 글자가 안 읽혀서 한 겹 더 깐다. */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(12,10,8,0) 26%, rgba(12,10,8,0.72) 42%, rgba(12,10,8,0.95) 56%)",
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
            전선이 가장 멀리 닿았던 자리
          </div>
          {REACH.map(([d, place], i) => (
            <div
              key={d}
              style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 4 }}
            >
              <span
                style={{
                  color: C.dim,
                  fontSize: 38,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 226,
                }}
              >
                {d}
              </span>
              <span
                style={{
                  // 압록강까지 올라간 줄만 국군·유엔군 색, 나머지는 반대편
                  color: i === 2 ? SOUTH_C : i === 4 ? C.text : "#D4694F",
                  fontSize: 46,
                  fontWeight: 900,
                }}
              >
                {place}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: "#3B342A", margin: "26px 0 16px" }} />
          <div style={{ color: C.text, fontSize: 52, fontWeight: 800, lineHeight: 1.34 }}>
            협정에 서명한 것은 7월 27일 오전 10시,
            <br />
            효력이 생긴 것은 그날 밤 10시였다
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 범례 · 고지 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color={HELD} label="북한군·중국군" />
            <Key color={SOUTH_C} label="국군·유엔군 승" />
            <Key color={NORTH_C} label="북한군·중국군 승" />
            <Key color={ZONE_C} label="유격 지역" hatch />
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

const Mark: React.FC<{
  b: KWBattle;
  day: number;
  u: (px: number) => number;
  /** 화면 밖으로 밀려나는 라벨은 그리지 않는다 — 잘린 글자는 고장으로 보인다 */
  fits: (x: number, chars: number) => boolean;
}> = ({ b, day, u, fits }) => {
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
      {b.major && fits(b.x, b.name.length) && (
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

/** 범례 한 칸. 유격 지역만 빗금이라 지도와 같은 무늬로 그려준다. */
const Key: React.FC<{ color: string; label: string; hatch?: boolean }> = ({
  color,
  label,
  hatch,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    {hatch ? (
      <svg width={24} height={24} style={{ display: "block" }}>
        <rect width={24} height={24} fill="#151310" />
        {[-16, -8, 0, 8, 16].map((k) => (
          <line
            key={k}
            x1={k}
            y1={24}
            x2={k + 24}
            y2={0}
            stroke={color}
            strokeWidth={3.4}
          />
        ))}
      </svg>
    ) : (
      <div style={{ width: 24, height: 24, background: color }} />
    )}
    <span style={{ color: "#BDB3A0", fontSize: 24, fontWeight: 700 }}>{label}</span>
  </div>
);
