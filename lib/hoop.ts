// A basketball hoop mounted on the right edge of the viewport. The backboard
// and rim are solid for the ball; dropping the ball down through the rim scores.
// Drawn in two passes (back, then front) so the ball passes inside the net.

import { INK, ORANGE, drawBasketball, type Ball, type Capsule, type Vec } from "./ball";

const RIM_RADIUS = 38; // half the opening; the ball is 30px across
const RIM_TILT = 6; // vertical radius of the rim ellipse (perspective)
const NET_DEPTH = 48;
const NET_STRANDS = 10;
// Regulation proportions, scaled from the 18" rim (76px ≈ 4.2px per inch):
// 42" tall board, rim 6" above its bottom edge and 6" out from its face,
// 24" × 18" shooter's square sitting on the rim.
const BOARD_TOP = 150; // backboard extends this far above the rim…
const BOARD_BOTTOM = 25; // …and this far below
const BOARD_DEPTH = 34; // how wide the angled board looks
const BOARD_RECEDE = 12; // far edge is this much shorter at each end (perspective)
const RIM_OFFSET = 25; // gap between the board and the back of the rim
const SQUARE_HEIGHT = 76;
const MIN_WIDTH = 640; // hidden on narrow screens where it would cover text

// Gentle pull toward the middle of the rim for balls dropping just above it.
const ASSIST_STRENGTH = 8; // px/s² per px off-center
const ASSIST_HEIGHT = 150;

const RIM_SHADE = "#b4511a";
const STEEL = "#a3a3a3";

export class Hoop {
  count: number | null = null; // all-time baskets, null until loaded
  onScore?: () => void;

  private visible = false;
  private boardX = 0; // face of the backboard
  private rimY = 0;
  private cx = 0; // rim center
  private swish = 0; // net animation, 1 → 0
  private bump = 0; // scoreboard pulse, 1 → 0
  private popups: { y: number; life: number }[] = [];

  get active() {
    return this.swish > 0.01 || this.bump > 0.01 || this.popups.length > 0;
  }

  layout(width: number, height: number) {
    this.visible = width >= MIN_WIDTH;
    this.boardX = width - 70;
    this.rimY = Math.round(height * 0.45);
    this.cx = this.boardX - RIM_OFFSET - RIM_RADIUS;
  }

  get colliders(): Capsule[] {
    if (!this.visible) return [];
    const { boardX, rimY, cx } = this;
    return [
      { a: { x: boardX, y: rimY - BOARD_TOP }, b: { x: boardX, y: rimY + BOARD_BOTTOM }, r: 2 },
      // Front of the rim
      { a: { x: cx - RIM_RADIUS, y: rimY }, b: { x: cx - RIM_RADIUS, y: rimY }, r: 2 },
      // Back of the rim and the bracket holding it to the board
      { a: { x: cx + RIM_RADIUS, y: rimY }, b: { x: boardX, y: rimY }, r: 2 },
    ];
  }

  // Runs after each physics step: aim assist, scoring, and the net slowing the ball.
  handleStep = (ball: Ball, from: Vec) => {
    if (!this.visible) return;
    const offset = this.cx - ball.x;
    const above = ball.y < this.rimY && ball.y > this.rimY - ASSIST_HEIGHT;
    if (above && ball.vy > 0 && Math.abs(offset) < RIM_RADIUS + 30) {
      ball.vx += offset * ASSIST_STRENGTH * (1 / 120);
    }

    const inside = Math.abs(offset) < RIM_RADIUS - 4;
    if (inside && ball.vy > 0 && from.y < this.rimY && ball.y >= this.rimY) {
      this.swish = 1;
      this.bump = 1;
      this.popups.push({ y: this.rimY - 30, life: 1 });
      if (this.count !== null) this.count++;
      this.onScore?.();
    }
    if (inside && ball.y > this.rimY && ball.y < this.rimY + NET_DEPTH) {
      ball.vx *= 0.95;
      ball.vy *= 0.985;
    }
  };

  update(dt: number) {
    this.swish *= Math.exp(-dt * 4);
    this.bump *= Math.exp(-dt * 6);
    for (const p of this.popups) {
      p.life -= dt / 1.1;
      p.y -= dt * 46;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  // Point on the backboard face: u runs across (0 = rim side), v runs down.
  private boardPoint(u: number, v: number) {
    const top = this.rimY - BOARD_TOP + u * BOARD_RECEDE;
    const bottom = this.rimY + BOARD_BOTTOM - u * BOARD_RECEDE;
    return { x: this.boardX + u * BOARD_DEPTH, y: top + (bottom - top) * v };
  }

  // v on the board's near edge for a given screen y.
  private boardV(y: number) {
    return (y - (this.rimY - BOARD_TOP)) / (BOARD_TOP + BOARD_BOTTOM);
  }

  private quad(ctx: CanvasRenderingContext2D, u1: number, u2: number, v1: number, v2: number) {
    const corners = [
      this.boardPoint(u1, v1),
      this.boardPoint(u2, v1),
      this.boardPoint(u2, v2),
      this.boardPoint(u1, v2),
    ];
    ctx.beginPath();
    corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
    ctx.closePath();
  }

  // Everything that should appear behind the ball.
  drawBack(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.drawMount(ctx);
    this.drawBoard(ctx);
    this.drawBracket(ctx);
    this.drawNet(ctx, false);
    this.drawRim(ctx, false);
    this.drawScoreboard(ctx);
    this.drawPopups(ctx);
    ctx.restore();
  }

  // Everything that should appear in front of the ball.
  drawFront(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;
    ctx.save();
    ctx.lineCap = "round";
    this.drawNet(ctx, true);
    this.drawRim(ctx, true);
    ctx.restore();
  }

  // Arm and diagonal brace from the back of the board to a plate on the wall.
  private drawMount(ctx: CanvasRenderingContext2D) {
    const wall = this.boardX + 70;
    const back = this.boardX + BOARD_DEPTH;
    const { rimY } = this;
    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(back - 2, rimY - 100);
    ctx.lineTo(wall - 3, rimY - 100);
    ctx.moveTo(back - 2, rimY - 18);
    ctx.lineTo(wall - 3, rimY - 88);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wall - 2, rimY - 116);
    ctx.lineTo(wall - 2, rimY - 72);
    ctx.stroke();
  }

  private drawBoard(ctx: CanvasRenderingContext2D) {
    const top = this.boardPoint(0, 0);
    const back = this.boardPoint(1, 0);

    // Panel with a soft light-to-shade gradient across the face
    this.quad(ctx, 0, 1, 0, 1);
    const face = ctx.createLinearGradient(top.x, 0, back.x, 0);
    face.addColorStop(0, "#ffffff");
    face.addColorStop(1, "#ececec");
    ctx.fillStyle = face;
    ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = `rgba(${INK}, 0.85)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Thick front edge facing the rim
    ctx.strokeStyle = `rgb(${INK})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    const bottom = this.boardPoint(0, 1);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();

    // Painted target square just above the rim
    this.quad(ctx, 1 / 3, 2 / 3, this.boardV(this.rimY - SQUARE_HEIGHT), this.boardV(this.rimY - 2));
    ctx.strokeStyle = `rgb(${ORANGE})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Rim connector plus a small support strut underneath.
  private drawBracket(ctx: CanvasRenderingContext2D) {
    const { boardX, rimY, cx } = this;
    ctx.strokeStyle = `rgb(${INK})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + RIM_RADIUS - 2, rimY);
    ctx.lineTo(boardX, rimY);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + RIM_RADIUS - 4, rimY + 2);
    ctx.lineTo(boardX, rimY + 16);
    ctx.stroke();
  }

  // Half the rim: the far half sits behind the ball, the near half in front.
  private drawRim(ctx: CanvasRenderingContext2D, front: boolean) {
    const [start, end] = front ? [0, Math.PI] : [Math.PI, Math.PI * 2];
    ctx.lineWidth = 2;
    ctx.strokeStyle = RIM_SHADE;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.rimY + 1.5, RIM_RADIUS, RIM_TILT, 0, start, end);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgb(${ORANGE})`;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.rimY, RIM_RADIUS, RIM_TILT, 0, start, end);
    ctx.stroke();
  }

  private drawNet(ctx: CanvasRenderingContext2D, front: boolean) {
    const { cx, rimY } = this;
    // A basket stretches the net down and pinches it in.
    const depth = NET_DEPTH + 12 * this.swish;
    const bottomRadius = RIM_RADIUS * (0.55 - 0.15 * this.swish);
    const sway = Math.sin(this.swish * 12) * 4 * this.swish;
    const at = (angle: number, radius: number, y: number, shift: number) => ({
      x: cx + shift + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * RIM_TILT * (radius / RIM_RADIUS),
    });

    ctx.strokeStyle = `rgba(${INK}, ${front ? 0.38 : 0.2})`;
    ctx.lineWidth = 1;

    // Strands cross their neighbours, bowing inward slightly like real cord.
    for (let i = 0; i < NET_STRANDS; i++) {
      const a = (i / NET_STRANDS) * Math.PI * 2;
      const b = ((i + 1) / NET_STRANDS) * Math.PI * 2;
      for (const [top, bottom] of [
        [a, b],
        [b, a],
      ]) {
        if (Math.sin((top + bottom) / 2) > 0 !== front) continue;
        const p1 = at(top, RIM_RADIUS, rimY, 0);
        const p2 = at(bottom, bottomRadius, rimY + depth, sway);
        const mid = at((top + bottom) / 2, (RIM_RADIUS + bottomRadius) / 2 - 3, rimY + depth / 2, sway / 2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mid.x, mid.y, p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Bottom ring
    const c = at(0, 0, rimY + depth, sway);
    ctx.beginPath();
    ctx.ellipse(c.x, rimY + depth, bottomRadius, RIM_TILT * (bottomRadius / RIM_RADIUS), 0,
      front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.stroke();
  }

  // Small white card above the backboard, styled like the dock.
  private drawScoreboard(ctx: CanvasRenderingContext2D) {
    const width = 132;
    const height = 46;
    const right = this.boardX + BOARD_DEPTH + 6;
    const x = right - width;
    const y = this.rimY - BOARD_TOP - height - 16;
    const font = getComputedStyle(document.body).fontFamily;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = this.bump > 0.05 ? `rgba(${ORANGE}, ${0.15 + this.bump * 0.6})` : "rgba(0, 0, 0, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Basketball icon
    ctx.save();
    ctx.translate(x + 23, y + height / 2);
    drawBasketball(ctx, 10, -0.4);
    ctx.restore();

    // Count, popping on each basket
    const text = this.count === null ? "–" : this.count.toLocaleString();
    ctx.save();
    ctx.translate(x + 42, y + 25);
    const scale = 1 + 0.18 * this.bump;
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgb(${INK})`;
    ctx.font = `600 17px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(text, 0, 0);
    ctx.restore();

    ctx.fillStyle = `rgba(${INK}, 0.45)`;
    ctx.font = `500 10px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText("all-time baskets", x + 42, y + 38);
    ctx.restore();
  }

  // "+1" that pops in large, settles, then floats up and fades.
  private drawPopups(ctx: CanvasRenderingContext2D) {
    const font = getComputedStyle(document.body).fontFamily;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.popups) {
      const age = 1 - p.life;
      const pop = age < 0.15 ? 0.6 + (age / 0.15) * 0.7 : 1.3 - Math.min(0.3, (age - 0.15) * 1.5);
      ctx.save();
      ctx.translate(this.cx, p.y);
      ctx.scale(pop, pop);
      ctx.font = `700 26px ${font}`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.9})`;
      ctx.strokeText("+1", 0, 0);
      ctx.fillStyle = `rgba(${ORANGE}, ${Math.min(1, p.life * 1.5)})`;
      ctx.fillText("+1", 0, 0);
      ctx.restore();
    }
  }
}
