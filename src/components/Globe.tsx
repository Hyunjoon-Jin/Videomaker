import React, { useEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";

/**
 * 속보 오프닝용 3D 느낌 와이어프레임 지구본(캔버스).
 * 대륙 디테일은 불필요 — 블러+속도로 안 보임(가이드). 회전감만 전달.
 */
export const Globe: React.FC<{ size: number }> = ({ size }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = 2;
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.42;
    const rot = frame * 0.045;

    // 구체 본체
    const grad = ctx.createRadialGradient(
      cx - R * 0.3,
      cy - R * 0.3,
      R * 0.1,
      cx,
      cy,
      R,
    );
    grad.addColorStop(0, "#1E4C8A");
    grad.addColorStop(0.6, "#0E2A44");
    grad.addColorStop(1, "#04101F");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // 위도선
    ctx.strokeStyle = "rgba(120,180,255,0.35)";
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 8; i++) {
      const y = cy - R + (i * 2 * R) / 8;
      const rr = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
      ctx.beginPath();
      ctx.ellipse(cx, y, rr, rr * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 경도선(회전)
    for (let i = 0; i < 12; i++) {
      const phase = rot + (i * Math.PI) / 6;
      const w = Math.cos(phase);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(w) * R, R, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,180,255,${0.12 + Math.abs(w) * 0.28})`;
      ctx.stroke();
    }
    ctx.restore();

    // 림 라이트
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,215,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [frame, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, filter: "drop-shadow(0 0 60px rgba(60,120,220,0.6))" }}
    />
  );
};
