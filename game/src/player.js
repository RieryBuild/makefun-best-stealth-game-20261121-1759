// player.js — the thief: sneak, walk, sprint, and the coin throw.
//
// Sneak (Shift): slow and quiet, half as visible.
// Walk: the default pace, quiet enough.
// Sprint (hold Space while moving): fast and loud — guards hear your
// footsteps from far off and see you sooner. Coins (click) are the quiet
// alternative: toss one to pull a guard away from your route.

import { TILE, blocksMovement, isBush, tileAt } from "./levels.js";

export const WALK_SPEED = 135;
export const SNEAK_SPEED = 68;
export const SPRINT_SPEED = 215;
export const NOISE_RADIUS_WALK = 0; // walking is silent
export const NOISE_RADIUS_SPRINT = 150;
export const NOISE_RADIUS_COIN = 175;

export class Player {
  constructor(level, startTile) {
    this.level = level;
    this.x = startTile[0] * TILE + TILE / 2;
    this.y = startTile[1] * TILE + TILE / 2;
    this.radius = 12;
    this.sneaking = false;
    this.sprinting = false;
    this.moving = false;
    this.facing = -Math.PI / 2; // start facing up the dock
    this.coins = 3;
    this.stepTimer = 0;
    this.stepLoud = false; // true when the last step made noise
    this.coin = null; // { x, y, tx, ty, t } — a coin in flight, or null
    this.coinLanded = null; // { x, y, ttl } — a landed coin still ringing
  }

  speed() {
    if (this.sneaking) return SNEAK_SPEED;
    if (this.sprinting) return SPRINT_SPEED;
    return WALK_SPEED;
  }

  hitsWall(px, py) {
    const r = this.radius;
    const corners = [
      [px - r, py - r], [px + r, py - r],
      [px - r, py + r], [px + r, py + r],
    ];
    for (const [cx, cy] of corners) {
      if (blocksMovement(this.level, Math.floor(cx / TILE), Math.floor(cy / TILE))) return true;
    }
    return false;
  }

  update(dt, input) {
    this.sneaking = input.sneak;
    this.sprinting = input.sprint && !input.sneak;
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
      const step = this.speed() * dt;
      const nx = this.x + dx * step;
      const ny = this.y + dy * step;
      if (!this.hitsWall(nx, this.y)) this.x = nx;
      if (!this.hitsWall(this.x, ny)) this.y = ny;
      // Footsteps: sprinting steps are loud and frequent, sneaking silent.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.62 : this.sprinting ? 0.26 : 0.4;
        this.stepLoud = this.sprinting;
      } else {
        this.stepLoud = false;
      }
    } else {
      this.stepLoud = false;
    }

    // Coin in flight: it arcs to its target in about half a second.
    if (this.coin) {
      this.coin.t += dt * 2;
      const t = Math.min(this.coin.t, 1);
      this.coin.x = this.coin.x0 + (this.coin.tx - this.coin.x0) * t;
      this.coin.y = this.coin.y0 + (this.coin.ty - this.coin.y0) * t;
      if (this.coin.t >= 1) {
        this.coinLanded = { x: this.coin.tx, y: this.coin.ty, ttl: 1.1 };
        this.coin = null;
      }
    }
    if (this.coinLanded) {
      this.coinLanded.ttl -= dt;
      if (this.coinLanded.ttl <= 0) this.coinLanded = null;
    }
  }

  // Throw a coin toward a canvas point. Returns false with no coins left
  // or while another coin is still in the air.
  throwCoin(targetX, targetY) {
    if (this.coins <= 0 || this.coin) return false;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const reach = Math.min(dist, 260);
    const tx = this.x + (dx / (dist || 1)) * reach;
    const ty = this.y + (dy / (dist || 1)) * reach;
    this.coins--;
    this.coin = { x0: this.x, y0: this.y, x: this.x, y: this.y, tx, ty, t: 0 };
    return true;
  }

  hiddenInBush() {
    return isBush(this.level, Math.floor(this.x / TILE), Math.floor(this.y / TILE));
  }

  standingInLampLight() {
    // A lamp lights its own tile and the neighbours.
    const tx = Math.floor(this.x / TILE);
    const ty = Math.floor(this.y / TILE);
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (tileAt(this.level, x, y) === "L") return true;
      }
    }
    return false;
  }
}
