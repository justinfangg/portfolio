"use client";

import { useEffect, useRef } from "react";
import { Ball, ORANGE, throwVelocity, type PointerSample, type Vec } from "@/lib/ball";
import { Hoop } from "@/lib/hoop";
import { playScore } from "@/lib/sound";

// Keyboard nudges while the ball is focused (Tab to it).
const IMPULSES: Record<string, Vec> = {
  ArrowLeft: { x: -340, y: -220 },
  ArrowRight: { x: 340, y: -220 },
  ArrowUp: { x: 0, y: -560 },
  ArrowDown: { x: 0, y: 260 },
  " ": { x: 0, y: -560 },
  Enter: { x: 0, y: -560 },
};

const HIT_SIZE = 48; // invisible touch target around the ball

export default function PlayBall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !handle || !ctx) return;

    const ball = new Ball();
    const hoop = new Hoop();
    ball.onStep = hoop.handleStep;
    hoop.onScore = () => {
      playScore();
      saveBasket();
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let running = false;
    let pointerId: number | null = null;
    let offset: Vec = { x: 0, y: 0 };
    let samples: PointerSample[] = [];

    // All-time count shared by every visitor (see app/api/shots/route.ts).
    const showCount = (res: Response) =>
      res.ok
        ? res.json().then(({ count }) => {
            hoop.count = count;
            render();
          })
        : undefined;
    const saveBasket = () => {
      fetch("/api/shots", { method: "POST" }).then(showCount).catch(() => {});
    };
    fetch("/api/shots").then(showCount).catch(() => {});

    // Dotted preview of where the ball would go if released right now.
    const drawAim = () => {
      if (ball.state !== "held") return;
      const points = ball.predict(throwVelocity(samples, performance.now()));
      points.forEach((p, i) => {
        if (i % 2) return;
        ctx.fillStyle = `rgba(${ORANGE}, ${0.5 * (1 - i / points.length)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      hoop.drawBack(ctx);
      drawAim();
      ball.draw(ctx);
      hoop.drawFront(ctx);
      handle.style.transform = `translate(${ball.x - HIT_SIZE / 2}px, ${ball.y - HIT_SIZE / 2}px)`;
      handle.style.cursor = ball.state === "held" ? "grabbing" : "grab";
    };

    // Only animate while something is moving; sleep otherwise.
    const tick = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      ball.update(dt);
      hoop.update(dt);
      render();
      if (!document.hidden && (ball.active || hoop.active)) frame = requestAnimationFrame(tick);
      else running = false;
    };
    const wake = () => {
      if (running || document.hidden) return;
      running = true;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hoop.layout(width, height);
      ball.colliders = hoop.colliders;
      ball.resize(width, height);
      render();
      wake();
    };

    const endDrag = (velocity: Vec) => {
      if (pointerId !== null && handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      pointerId = null;
      samples = [];
      if (ball.state === "held") ball.throw(velocity);
      wake();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (pointerId !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      pointerId = e.pointerId;
      offset = { x: e.clientX - ball.x, y: e.clientY - ball.y };
      samples = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
      handle.setPointerCapture(pointerId);
      ball.grab();
      wake();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const now = performance.now();
      samples = [...samples.filter((s) => now - s.time < 160), { x: e.clientX, y: e.clientY, time: now }];
      ball.moveTo(e.clientX - offset.x, e.clientY - offset.y);
      render();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      endDrag(e.type === "pointerup" ? throwVelocity(samples, performance.now()) : { x: 0, y: 0 });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const impulse = IMPULSES[e.key];
      if (!impulse) return;
      e.preventDefault();
      ball.throw(impulse);
      wake();
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      endDrag({ x: 0, y: 0 });
      ball.settle();
      render();
      wake();
    };

    const setHover = (on: boolean) => () => {
      ball.hovered = on;
      render();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        running = false;
        endDrag({ x: 0, y: 0 });
      } else wake();
    };
    const onMotionPreference = () => {
      const hidden = reducedMotion.matches;
      canvas.hidden = hidden;
      handle.hidden = hidden;
      // The hoop lives on the same canvas, so it's hidden too.
      if (hidden) ball.settle();
    };

    // Entrance: drop in from near the top right and bounce to a stop.
    resize();
    onMotionPreference();
    ball.place(width * 0.85, -20);
    const entrance = window.setTimeout(() => {
      if (reducedMotion.matches) return ball.settle();
      ball.throw({ x: -90, y: 0 });
      wake();
    }, 900);

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("lostpointercapture", onPointerUp);
    handle.addEventListener("keydown", onKeyDown);
    const hoverOn = setHover(true);
    const hoverOff = setHover(false);
    handle.addEventListener("pointerenter", hoverOn);
    handle.addEventListener("pointerleave", hoverOff);
    handle.addEventListener("focus", hoverOn);
    handle.addEventListener("blur", hoverOff);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onEscape);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionPreference);

    return () => {
      window.clearTimeout(entrance);
      cancelAnimationFrame(frame);
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      handle.removeEventListener("lostpointercapture", onPointerUp);
      handle.removeEventListener("keydown", onKeyDown);
      handle.removeEventListener("pointerenter", hoverOn);
      handle.removeEventListener("pointerleave", hoverOff);
      handle.removeEventListener("focus", hoverOn);
      handle.removeEventListener("blur", hoverOff);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onEscape);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40" />
      <button
        ref={handleRef}
        type="button"
        aria-label="Ball: drag to throw, or use arrow keys and Space to bounce. Escape drops it."
        className="fixed top-0 left-0 z-40 touch-none rounded-full outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        style={{ width: HIT_SIZE, height: HIT_SIZE }}
      />
    </>
  );
}
