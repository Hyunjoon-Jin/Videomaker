import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { KoreaMap } from "./KoreaMap";
import { MarchRoute } from "./MarchRoute";
import { BEATS, cameraAt, totalFrames } from "./camera";
import { DIVISIONS, eventAt, fallenAt, lunarDate, solarDate } from "./data/imjin";
import { C, FPS } from "./theme";
import { useFonts } from "./fonts";

/** 훅이 끝나고 지도가 시작되는 프레임 */
const MAP_START = Math.round(2.2 * FPS);

export const IMJIN_DURATION = totalFrames(MAP_START) + 20;

const FALL_TINT = "#8B1A1A";

/** 결정적 흔들림 — Math.random은 프레임마다 값이 바뀌어 못 쓴다. */
function shake(frame: number, amp: number): [number, number] {
  return [
    Math.sin(frame * 2.7) * amp + Math.sin(frame * 5.1) * amp * 0.4,
    Math.cos(frame * 3.3) * amp + Math.cos(frame * 6.7) * amp * 0.4,
  ];
}

export const ShortsImjin: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const cam = cameraAt(frame, MAP_START);
  const { day, impact } = cam;

  // 현재 줌 배율 = 1000 / viewBox 너비
  const zoom = 1000 / parseFloat(cam.viewBox.split(" ")[2]);
  const inv = 1 / zoom;

  const fallen = fallenAt(day);
  const ev = eventAt(day);
  const [sx, sy] = shake(frame, impact * 9);

  // ── 훅 (0 ~ 2.2s) ─────────────────────────────
  const hookOut = interpolate(frame, [MAP_START - 14, MAP_START], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const hookPunch = interpolate(frame, [8, 26], [0.82, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mapIn = interpolate(frame, [MAP_START - 8, MAP_START + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* ── 지도 (전체 화면) ── */}
      <AbsoluteFill
        style={{
          opacity: mapIn,
          transform: `translate(${sx}px, ${sy}px) scale(${1 + impact * 0.02})`,
        }}
      >
        <KoreaMap
          viewBox={cam.viewBox}
          strokeScale={inv}
          colorOf={(r) => (fallen.has(r.code) ? FALL_TINT : "#232B3A")}
        >
          {DIVISIONS.map((d) => (
            <MarchRoute key={d.id} division={d} day={day} scale={inv} />
          ))}
        </KoreaMap>
      </AbsoluteFill>

      {/* 충격 시 화면 전체가 붉게 번쩍 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, rgba(179,58,43,${
            impact * 0.42
          }) 0%, rgba(179,58,43,0) 62%)`,
          pointerEvents: "none",
        }}
      />

      {/* 상하 그라데이션 — 지도 위 글자 가독성 확보 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${C.bg} 0%, rgba(11,14,20,0.55) 16%, rgba(11,14,20,0) 34%, rgba(11,14,20,0) 52%, rgba(11,14,20,0.86) 70%, ${C.bg} 84%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 실시간 날짜 readout — 군대가 지금 며칠째 어디인지 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", top: 108, left: 60, right: 60 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span
              style={{
                color: C.text,
                fontSize: 108,
                fontWeight: 900,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              D+{Math.floor(day)}
            </span>
            <div>
              <div style={{ color: C.warn, fontSize: 42, fontWeight: 900 }}>
                {solarDate(day)}
              </div>
              <div style={{ color: C.dim, fontSize: 28, fontWeight: 600 }}>
                {lunarDate(day)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 사건 카드 ── */}
      {ev && mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 330, left: 60, right: 60 }}>
          <div
            style={{
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 6,
              transform: `scale(${1 + impact * 0.06})`,
              transformOrigin: "left bottom",
            }}
          >
            {ev.title}
          </div>
          <div style={{ color: "#BDB3A0", fontSize: 40, fontWeight: 500, marginTop: 10 }}>
            {ev.detail}
          </div>
        </div>
      )}

      {/* ── 진행 바 (D+0 → D+20) ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 210, left: 60, right: 60 }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "#2A241D",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(day / 20) * 100}%`,
                height: "100%",
                background: C.drop,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: C.dim,
              fontSize: 24,
              fontWeight: 700,
              marginTop: 10,
            }}
          >
            <span>부산 상륙</span>
            <span>한양</span>
          </div>
        </div>
      )}

      {/* ── 고지 ── */}
      {mapIn > 0.5 && (
        <div
          style={{
            position: "absolute",
            bottom: 92,
            left: 60,
            right: 60,
            color: "#5E5648",
            fontSize: 20,
            lineHeight: 1.5,
          }}
        >
          날짜 양력(음력 병기) · 경계는 현재 행정구역
          <br />
          진격로는 경유지를 이은 도식이며 실제 행군로가 아님
        </div>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: C.bg,
            opacity: hookOut,
            justifyContent: "center",
            alignItems: "center",
            padding: 60,
          }}
        >
          <div style={{ opacity: hookIn, textAlign: "center" }}>
            <div style={{ color: C.dim, fontSize: 44, fontWeight: 700, letterSpacing: 3 }}>
              1592년, 부산에서 한양까지
            </div>
            <div
              style={{
                color: C.drop,
                fontSize: 400,
                fontWeight: 900,
                lineHeight: 0.92,
                marginTop: 20,
                transform: `scale(${hookPunch})`,
              }}
            >
              20
            </div>
            <div style={{ color: C.text, fontSize: 120, fontWeight: 900, marginTop: -10 }}>
              일
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 마지막 비트에서 3로 범례를 한 번만 보여준다 */}
      {cam.beatIndex === BEATS.length - 1 && (
        <div
          style={{
            position: "absolute",
            top: 290,
            left: 60,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {DIVISIONS.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{ width: 40, height: 7, borderRadius: 4, background: d.color }}
              />
              <span style={{ color: "#BDB3A0", fontSize: 30, fontWeight: 700 }}>
                {d.route} · {d.commander}
              </span>
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
