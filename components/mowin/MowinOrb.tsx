"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 0 = 우주 속 희미한 빛, 1 = 완전히 깨어난 상태 */
  brightness: number;
  /** AI가 말하는 중이면 구체가 더 크게 꿈틀거림 */
  speaking: boolean;
  /** 사용자의 말을 듣는 중 */
  listening?: boolean;
  /** 흰 배경 위에 있는지 (그림자/색 조정) */
  onLight: boolean;
  className?: string;
};

type Particle = { a: number; r: number; s: number; size: number; o: number };

// 외계 생명체처럼 살아 움직이는 구체 — AI 모윈
export default function MowinOrb({ brightness, speaking, listening = false, onLight, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef({ brightness, speaking, listening, onLight });
  target.current = { brightness, speaking, listening, onLight };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = Array.from({ length: 26 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 1.15 + Math.random() * 0.45,
      s: (0.08 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1),
      size: 0.6 + Math.random() * 1.8,
      o: Math.random() * Math.PI * 2,
    }));

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let bright = 0;
    let energy = 0.2;
    let light = 0;

    const blobRadius = (theta: number, R: number) => {
      const e = energy;
      return (
        R *
        (1 +
          0.045 * Math.sin(3 * theta + t * 0.9) +
          0.035 * Math.sin(5 * theta - t * 1.3) +
          0.03 * e * Math.sin(7 * theta + t * 3.1) +
          0.02 * e * Math.sin(11 * theta - t * 4.3) +
          0.025 * Math.sin(2 * theta - t * 0.5))
      );
    };

    const tracePath = (cx: number, cy: number, R: number) => {
      const N = 120;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        const r = blobRadius(th, R);
        const x = cx + Math.cos(th) * r;
        const y = cy + Math.sin(th) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const tg = target.current;
      t += dt * (reduced ? 0.25 : 1);
      bright += (tg.brightness - bright) * Math.min(1, dt * 1.4);
      const wantEnergy = tg.speaking ? 1 : tg.listening ? 0.65 : 0.22;
      energy += (wantEnergy - energy) * Math.min(1, dt * 3);
      light += ((tg.onLight ? 1 : 0) - light) * Math.min(1, dt * 1.5);

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const breathe = 1 + 0.025 * Math.sin(t * 1.6) + 0.02 * energy * Math.sin(t * 9);
      const R = Math.min(w, h) * 0.25 * breathe * (0.85 + 0.15 * bright);
      const cy = h / 2 + Math.sin(t * 0.8) * R * 0.04;
      const b = 0.12 + 0.88 * bright;

      // 1) 바깥 후광 — 우주에서는 강하게, 흰 화면에서는 은은하게
      // 캔버스 경계 안에서 완전히 사라지도록 반경 제한 (사각형 모서리 방지)
      const haloR = Math.min(R * (1.8 + 0.2 * energy), Math.min(w, h) / 2 - 2);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, haloR);
      const haloA = b * (0.55 - 0.3 * light);
      halo.addColorStop(0, `rgba(139,124,255,${haloA})`);
      halo.addColorStop(0.45, `rgba(94,234,212,${haloA * 0.35})`);
      halo.addColorStop(1, "rgba(139,124,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // 2) 흰 화면 위 바닥 그림자
      if (light > 0.01) {
        const sh = ctx.createRadialGradient(cx, cy + R * 1.35, 0, cx, cy + R * 1.35, R * 0.9);
        sh.addColorStop(0, `rgba(60,50,120,${0.18 * light})`);
        sh.addColorStop(1, "rgba(60,50,120,0)");
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(cx, cy + R * 1.35, R * 0.9, R * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3) 몸체 (막)
      ctx.save();
      ctx.globalAlpha = b;
      tracePath(cx, cy, R);
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.1);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.25, "#dfe7ff");
      body.addColorStop(0.6, "#9d8cff");
      body.addColorStop(1, "#4b3fd1");
      ctx.fillStyle = body;
      ctx.shadowColor = `rgba(124,108,255,${0.7 - 0.35 * light})`;
      ctx.shadowBlur = R * 0.5;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4) 내부를 떠도는 플라즈마 (막 안쪽으로 클립)
      ctx.clip();
      const blobs: [number, number, number, string][] = [
        [0.7, 0.0, 0.55, "94,234,212"],
        [1.1, 2.1, 0.5, "244,114,182"],
        [0.5, 4.2, 0.6, "125,211,252"],
        [1.6, 1.0, 0.35, "255,255,255"],
      ];
      for (const [speed, off, size, rgb] of blobs) {
        const px = cx + Math.cos(t * speed * 0.6 + off) * R * 0.45;
        const py = cy + Math.sin(t * speed * 0.8 + off * 1.3) * R * 0.4;
        const g = ctx.createRadialGradient(px, py, 0, px, py, R * size);
        g.addColorStop(0, `rgba(${rgb},${0.55 + 0.25 * energy})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
      }

      // 5) 핵 (생명의 중심) — 말할 때 맥동
      const pulse = 0.5 + 0.5 * Math.sin(t * (2 + 6 * energy));
      const coreR = R * (0.18 + 0.08 * energy * pulse);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
      core.addColorStop(0, "rgba(255,255,255,0.95)");
      core.addColorStop(0.4, `rgba(200,240,255,${0.5 + 0.3 * pulse * energy})`);
      core.addColorStop(1, "rgba(200,240,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6) 막의 테두리 광택
      ctx.save();
      ctx.globalAlpha = b * 0.7;
      tracePath(cx, cy, R);
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 7) 주변을 도는 포자/섬모 입자
      for (const p of particles) {
        p.a += p.s * dt * (1 + 2 * energy);
        const pr = R * (p.r + 0.06 * Math.sin(t * 2 + p.o));
        const x = cx + Math.cos(p.a) * pr;
        const y = cy + Math.sin(p.a) * pr * 0.92;
        const a = b * (0.35 + 0.4 * Math.sin(t * 1.5 + p.o) ** 2);
        ctx.fillStyle = light > 0.5 ? `rgba(99,82,230,${a})` : `rgba(220,230,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + 0.5 * energy), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
