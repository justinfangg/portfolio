// A basketball that lives in the viewport: gravity, bounces off the walls,
// ceiling, floor and any colliders (the hoop), friction while rolling, spin,
// squash & stretch, a motion trail and fading impact marks. Simulated at a fixed 120 Hz step and drawn
// with interpolation so it stays smooth at any frame rate.

export type Vec = { x: number; y: number };

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Theme colour (matches --foreground) as RGB so shadows can fade it.
export const INK = "23, 23, 23";
export const ORANGE = "232, 112, 42";
const SEAM = "#4a2410";

const STEP = 1 / 120;
const GRAVITY = 1150; // px/s², a little floaty so shots are easier to aim
const AIR_DRAG = 0.13; // per second
const ROLL_DRAG = 4; // per second, while touching the floor
const WALL_BOUNCE = 0.67;
const CEILING_BOUNCE = 0.65;
const FLOOR_BOUNCE = 0.54;
const FLOOR_FRICTION = 0.83; // horizontal speed kept on each floor impact
const SETTLE_SPEED = 85; // floor impacts slower than this stop bouncing
const TRAIL_SPEED = 340;

const OBSTACLE_BOUNCE = 0.55;

type Mark = { x: number; y: number; life: number; wall: boolean };

// A rounded segment the ball bounces off (a point when a and b are equal).
export type Capsule = { a: Vec; b: Vec; r: number };

export class Ball {
  readonly radius = 15;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  state: "free" | "held" | "rest" = "rest";
  hovered = false;
  colliders: Capsule[] = [];
  // Called after every physics step with the position before the step.
  onStep?: (ball: Ball, from: Vec) => void;

  private width = 0;
  private height = 0;
  private prev: Vec = { x: 0, y: 0 };
  private carry = 0; // leftover simulation time between frames
  private squash = 0;
  private squashAngle = 0;
  private trail: Vec[] = [];
  private trailClock = 0;
  private marks: Mark[] = [];
  private spin = 0; // rotation angle of the seams

  get floor() {
    return this.height - this.radius - 8;
  }

  // True while anything is still animating, so the render loop can sleep.
  get active() {
    return (
      this.state !== "rest" || this.squash > 0.003 || this.trail.length > 0 || this.marks.length > 0
    );
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = clamp(this.x, this.radius, width - this.radius);
    this.y = this.state === "rest" ? this.floor : clamp(this.y, this.radius, this.floor);
    this.prev = { x: this.x, y: this.y };
    this.trail = [];
    this.marks = [];
  }

  place(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.prev = { x, y };
  }

  grab() {
    this.state = "held";
    this.vx = this.vy = 0;
    this.trail = [];
  }

  moveTo(x: number, y: number) {
    this.place(clamp(x, this.radius, this.width - this.radius), clamp(y, this.radius, this.floor));
  }

  throw(velocity: Vec) {
    this.state = "free";
    this.vx = velocity.x;
    this.vy = velocity.y;
    this.carry = 0;
    this.prev = { x: this.x, y: this.y };
  }

  // Drop straight to the floor and stop.
  settle() {
    this.state = "rest";
    this.vx = this.vy = 0;
    this.squash = 0;
    this.trail = [];
    this.marks = [];
    const margin = this.radius + 16;
    this.place(clamp(this.x, margin, this.width - margin), this.floor);
  }

  update(dt: number) {
    this.squash *= Math.exp(-dt * 14);

    if (this.state === "free") {
      this.spin += (this.vx / this.radius) * dt * 0.6;
      this.carry += dt;
      while (this.carry >= STEP) {
        this.step();
        this.carry -= STEP;
      }
    }

    for (const mark of this.marks) mark.life -= dt / 1.5;
    this.marks = this.marks.filter((m) => m.life > 0).slice(-5);

    this.trailClock += dt;
    if (this.trailClock >= 1 / 90) {
      this.trailClock = 0;
      const fast = this.state === "free" && Math.hypot(this.vx, this.vy) > TRAIL_SPEED;
      if (fast) this.trail.push({ x: this.x, y: this.y });
      else this.trail.shift();
      this.trail = this.trail.slice(-7);
    }
  }

  private step() {
    const r = this.radius;
    this.prev = { x: this.x, y: this.y };
    this.vy += GRAVITY * STEP;
    this.vx *= Math.exp(-AIR_DRAG * STEP);
    this.x += this.vx * STEP;
    this.y += this.vy * STEP;

    let impact = 0;
    if (this.x < r || this.x > this.width - r) {
      this.x = clamp(this.x, r, this.width - r);
      impact = Math.abs(this.vx);
      this.vx *= -WALL_BOUNCE;
      this.squashAngle = Math.PI / 2;
      if (impact > 260) this.marks.push({ x: this.x, y: this.y, life: 1, wall: true });
    }
    if (this.y < r) {
      this.y = r;
      impact = Math.abs(this.vy);
      this.vy *= -CEILING_BOUNCE;
      this.squashAngle = 0;
    }
    if (this.y > this.floor) {
      this.y = this.floor;
      impact = Math.abs(this.vy);
      this.vy = impact < SETTLE_SPEED ? 0 : this.vy * -FLOOR_BOUNCE;
      this.vx *= FLOOR_FRICTION;
      this.squashAngle = 0;
      if (impact > 300) this.marks.push({ x: this.x, y: this.height - 5, life: 1, wall: false });
    }
    for (const c of this.colliders) impact = Math.max(impact, this.collide(c));
    if (impact) this.squash = Math.min(0.28, impact / 2400);
    this.onStep?.(this, this.prev);

    // Rolling along the floor slows down until the ball comes to rest.
    if (this.y >= this.floor - 0.1) {
      this.vx *= Math.exp(-ROLL_DRAG * STEP);
      if (Math.abs(this.vx) < 3 && this.vy === 0) {
        this.vx = 0;
        this.state = "rest";
      }
    }
  }

  // Where a throw with this velocity would go (ignores collisions), for the aim preview.
  predict(velocity: Vec, seconds = 0.8): Vec[] {
    const points: Vec[] = [];
    let { x, y } = this;
    let { x: vx, y: vy } = velocity;
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) {
      vy += GRAVITY * dt;
      vx *= Math.exp(-AIR_DRAG * dt);
      x += vx * dt;
      y += vy * dt;
      if (x < this.radius || x > this.width - this.radius || y > this.floor) break;
      points.push({ x, y });
    }
    return points;
  }

  // Pushes the ball out of a capsule and reflects its velocity. Returns impact speed.
  private collide({ a, b, r }: Capsule) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    const t = lengthSq ? clamp(((this.x - a.x) * abx + (this.y - a.y) * aby) / lengthSq, 0, 1) : 0;
    const qx = a.x + abx * t;
    const qy = a.y + aby * t;
    const dx = this.x - qx;
    const dy = this.y - qy;
    const dist = Math.hypot(dx, dy);
    const min = this.radius + r;
    if (dist >= min || dist === 0) return 0;

    const nx = dx / dist;
    const ny = dy / dist;
    this.x = qx + nx * min;
    this.y = qy + ny * min;
    const vn = this.vx * nx + this.vy * ny;
    if (vn >= 0) return 0;
    this.vx -= (1 + OBSTACLE_BOUNCE) * vn * nx;
    this.vy -= (1 + OBSTACLE_BOUNCE) * vn * ny;
    // Never balance perfectly on top of something.
    if (Math.abs(nx) < 0.05 && ny < 0) this.vx += Math.random() < 0.5 ? -25 : 25;
    this.squashAngle = Math.atan2(ny, nx) + Math.PI / 2;
    return Math.abs(vn);
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Interpolate between the last two physics steps for smooth motion.
    const t = this.state === "free" ? clamp(this.carry / STEP, 0, 1) : 1;
    const x = lerp(this.prev.x, this.x, t);
    const y = lerp(this.prev.y, this.y, t);

    ctx.save();

    for (const m of this.marks) {
      ctx.fillStyle = `rgba(${ORANGE}, ${m.life * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.wall ? 2 : 10, m.wall ? 8 : 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineCap = "round";
    for (let i = 1; i < this.trail.length; i++) {
      ctx.strokeStyle = `rgba(${ORANGE}, ${(0.18 * i) / this.trail.length})`;
      ctx.lineWidth = 2 + i * 0.7;
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }

    // Shadow on the floor, darker and tighter as the ball gets closer.
    const near = clamp(1 - (this.floor - y) / 260, 0, 1);
    ctx.fillStyle = `rgba(${INK}, ${0.025 + near * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(x, this.height - 5, this.radius + 2 - near * 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Squash on impact, otherwise stretch along the direction of travel.
    let amount = this.squash;
    let angle = this.squashAngle;
    if (amount < 0.03 && this.state === "free") {
      amount = Math.min(0.16, Math.hypot(this.vx, this.vy) / 6000);
      angle = Math.atan2(this.vy, this.vx);
    }
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1 + amount, 1 / (1 + amount));
    drawBasketball(ctx, this.radius, this.spin);

    if (this.hovered) {
      ctx.strokeStyle = `rgba(${ORANGE}, 0.45)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Orange ball with a soft highlight and the classic seams, rotated by spin.
// Drawn centred on the origin.
export function drawBasketball(ctx: CanvasRenderingContext2D, r: number, spin = 0) {
  const fill = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  fill.addColorStop(0, "#f8a560");
  fill.addColorStop(1, "#d9601c");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.rotate(spin);
  ctx.strokeStyle = SEAM;
  ctx.lineWidth = Math.max(0.8, r / 11);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-r * 1.25, 0, r * 0.95, -0.9, 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = SEAM;
  ctx.lineWidth = Math.max(0.8, r / 12);
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

// Throw velocity from the last ~130ms of pointer movement (a longer window is
// steadier and easier to control). If the pointer had
// already stopped before release, the ball just drops.
export type PointerSample = Vec & { time: number };

export function throwVelocity(samples: PointerSample[], now: number): Vec {
  const recent = samples.filter((s) => now - s.time <= 130);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (recent.length < 2 || now - last.time > 70) return { x: 0, y: 0 };
  const seconds = (last.time - first.time) / 1000;
  if (seconds < 0.004) return { x: 0, y: 0 };
  return {
    x: clamp((last.x - first.x) / seconds, -1600, 1600),
    y: clamp((last.y - first.y) / seconds, -1600, 1600),
  };
}
