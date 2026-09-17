import type { Pose } from './rig';
import type { CharSpec } from './generator';

export type ActionId = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'dance';

export interface MotionParams {
  energy: number; // 0..1
  amplitude: number; // 0..1
  bounce: number; // 0..1
}

const TAU = Math.PI * 2;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** onda senoidal (-1..1) ou triangular (-1..1, robótica) */
function wave(spec: CharSpec, t: number): number {
  const ph = ((t % 1) + 1) % 1;
  if (spec.motion.wave === 'tri') return 2 * Math.abs(2 * ph - 1) - 1;
  return Math.sin(ph * TAU);
}

function inWindow(t: number, at: number, dur: number): boolean {
  return t >= at && t < at + dur;
}

interface Gains {
  E: number; // energia 0.6..1.4
  A: number; // amplitude 0.5..1.5
  B: number; // quique 0.4..1.6
}

function gains(p: MotionParams): Gains {
  return { E: 0.6 + p.energy * 0.8, A: 0.5 + p.amplitude, B: 0.4 + p.bounce * 1.2 };
}

/* --------------------------------- BÍPEDE -------------------------------- */

function biped(spec: CharSpec, action: ActionId, t: number, g: Gains): Pose {
  const pose: Pose = { fx: { visible: false } };
  const W = (tt: number) => wave(spec, tt);
  const blink = inWindow(t, spec.motion.blinkAt, 0.09);
  pose.eye = { alt: blink };

  switch (action) {
    case 'idle': {
      const br = W(t) * 0.5 + 0.5; // 0..1
      const rise = -Math.round(br * 1 * g.B);
      pose.torso = { dy: rise };
      pose.legF = { dy: -rise };
      pose.legB = { dy: -rise };
      pose.armF = { rot: Math.round(4 * W(t)) };
      pose.armB = { rot: Math.round(-4 * W(t)) };
      pose.head = { rot: Math.round(2 * W(t + 0.25)) };
      pose.scarf = { rot: Math.round(8 * W(t + 0.5)) };
      pose.antenna = { rot: Math.round(10 * W(t + 0.3)) };
      break;
    }
    case 'walk':
    case 'run': {
      const run = action === 'run';
      const s = W(t);
      const c = W(t + 0.25);
      const swing = Math.max(-30, Math.min(30, Math.round((run ? 26 : 20) * g.A * s)));
      const bob = Math.round((run ? 2 : 1.4) * g.B * Math.abs(s));
      const liftF = Math.round(2 * g.B * Math.max(0, c));
      const liftB = Math.round(2 * g.B * Math.max(0, -c));
      const flight = run ? Math.round(1.5 * g.B * Math.max(0, Math.sin(2 * TAU * t))) : 0;
      const dy = -(bob + flight);
      pose.torso = { dy, dx: run ? 1 : 0 };
      pose.legF = { rot: swing, dy: -dy - liftF };
      pose.legB = { rot: -swing, dy: -dy - liftB };
      const armSwing = Math.round((run ? 20 : 14) * g.A * s);
      pose.armF = { rot: -armSwing };
      pose.armB = { rot: armSwing };
      pose.scarf = { rot: Math.round(10 + 6 * s) };
      pose.antenna = { rot: Math.round(8 * s) };
      break;
    }
    case 'jump': {
      const H = Math.round(7 * g.A);
      if (t < 0.22) {
        const k = smoothstep(0, 0.22, t);
        pose.torso = { dy: Math.round(1 * k), sx: 1 + 0.12 * k, sy: 1 - 0.15 * k };
        pose.legF = { rot: Math.round(-18 * k), dy: Math.round(-1 * k) };
        pose.legB = { rot: Math.round(14 * k), dy: Math.round(-1 * k) };
        pose.armF = { rot: Math.round(25 * k) };
      } else if (t < 0.8) {
        const v = (t - 0.22) / 0.58;
        const h = Math.sin(v * Math.PI);
        pose.torso = { dy: -Math.round(H * h), sx: 1 - 0.08 * h, sy: 1 + 0.12 * h };
        pose.legF = { rot: Math.round(-25 * h), dy: Math.round(H * h) };
        pose.legB = { rot: Math.round(15 * h), dy: Math.round(H * h) };
        pose.armF = { rot: Math.round(-50 * h) };
        pose.armB = { rot: Math.round(30 * h) };
      } else {
        const k = Math.sin(((t - 0.8) / 0.2) * Math.PI);
        pose.torso = { dy: Math.round(1 * k), sx: 1 + 0.12 * k, sy: 1 - 0.15 * k };
        pose.legF = { rot: Math.round(-18 * k), dy: Math.round(-1 * k) };
        pose.legB = { rot: Math.round(14 * k), dy: Math.round(-1 * k) };
      }
      break;
    }
    case 'attack': {
      const wind = smoothstep(0, 0.3, t);
      const strike = smoothstep(0.3, 0.45, t);
      const rec = smoothstep(0.55, 0.92, t);
      const k = 1 - rec;
      pose.torso = {
        dx: Math.round((-2 * wind + 4 * strike) * k),
        rot: Math.round((-4 * wind + 6 * strike) * k),
      };
      pose.armF = { rot: Math.round((45 * wind - 115 * strike + 0 * rec) * k) };
      pose.armB = { rot: Math.round(20 * wind * k) };
      pose.head = { rot: Math.round(-5 * wind * k) };
      pose.legF = { rot: Math.round(-12 * strike * k) };
      pose.legB = { rot: Math.round(10 * strike * k) };
      pose.weapon = { rot: Math.round(-15 * strike * k) };
      if (t >= 0.35 && t < 0.62) {
        pose.fx = { visible: true, rot: Math.round(-20 + 40 * ((t - 0.35) / 0.27)) };
      }
      break;
    }
    case 'dance': {
      const b = Math.abs(W(2 * t));
      const dy = -Math.round(2 * g.B * b);
      pose.torso = { dy, dx: Math.round(2 * W(t)), rot: Math.round(6 * W(t)) };
      pose.legF = { rot: Math.round(15 * Math.max(0, W(t))), dy: -dy };
      pose.legB = { rot: Math.round(15 * Math.max(0, -W(t))), dy: -dy };
      pose.armF = { rot: Math.round(-40 - 35 * W(t)) };
      pose.armB = { rot: Math.round(-40 + 35 * W(t)) };
      pose.head = { rot: Math.round(8 * W(t)) };
      pose.scarf = { rot: Math.round(15 * W(t)) };
      break;
    }
  }
  return pose;
}

/* ------------------------------- BLOB / GHOST ------------------------------ */

function blob(spec: CharSpec, action: ActionId, t: number, g: Gains): Pose {
  const pose: Pose = { fx: { visible: false } };
  const W = (tt: number) => wave(spec, tt);
  const ghost = spec.body === 'ghost';
  const blink = inWindow(t, spec.motion.blinkAt, 0.09);
  pose.eyeL = { alt: blink };
  pose.eyeR = { alt: blink };

  switch (action) {
    case 'idle': {
      if (ghost) {
        const f = W(t) * 0.5 + 0.5;
        pose.body = { dy: -1 - Math.round(f * 2 * g.B), dx: Math.round(W(t + 0.25) * 1) };
        pose.armF = { rot: Math.round(10 * W(t)) };
        pose.armB = { rot: Math.round(-10 * W(t)) };
      } else {
        const br = W(t);
        pose.body = { sx: 1 + 0.045 * br * g.A, sy: 1 - 0.045 * br * g.A };
      }
      pose.acc = { rot: Math.round(5 * W(t + 0.5)) };
      break;
    }
    case 'walk':
    case 'run': {
      const run = action === 'run';
      if (ghost) {
        pose.body = {
          dy: -2 + Math.round(W(t) * 1 * g.B),
          dx: Math.round(2 * W(t + 0.25) * g.A),
          rot: Math.round((run ? 8 : 4) * W(t)),
        };
        pose.armF = { rot: Math.round(20 * W(t)) };
        pose.armB = { rot: Math.round(-20 * W(t)) };
      } else {
        const hops = run ? 2 : 1;
        const h = Math.abs(Math.sin(hops * Math.PI * t));
        const H = Math.round((run ? 3 : 4) * g.B);
        const land = h < 0.25 ? (0.25 - h) / 0.25 : 0;
        pose.body = {
          dy: -Math.round(H * h),
          sx: 1 - 0.1 * h * g.A + 0.14 * land,
          sy: 1 + 0.15 * h * g.A - 0.16 * land,
        };
      }
      break;
    }
    case 'jump': {
      const H = Math.round((ghost ? 6 : 8) * g.A);
      if (t < 0.2) {
        const k = smoothstep(0, 0.2, t);
        pose.body = { sx: 1 + 0.15 * k, sy: 1 - 0.2 * k };
      } else if (t < 0.8) {
        const v = (t - 0.2) / 0.6;
        const h = Math.sin(v * Math.PI);
        pose.body = { dy: -Math.round(H * h), sx: 1 - 0.1 * h, sy: 1 + 0.16 * h };
        if (ghost) {
          pose.mouth = { alt: true };
          pose.armF = { rot: -50 };
          pose.armB = { rot: 50 };
        }
      } else {
        const k = Math.sin(((t - 0.8) / 0.2) * Math.PI);
        pose.body = { sx: 1 + 0.15 * k, sy: 1 - 0.2 * k };
        if (ghost) pose.mouth = { alt: k > 0.4 };
      }
      break;
    }
    case 'attack': {
      if (ghost) {
        const k = smoothstep(0.25, 0.45, t) * (1 - smoothstep(0.6, 0.9, t));
        pose.body = { sx: 1 + 0.12 * k, sy: 1 + 0.12 * k, dy: Math.round(-3 * k) };
        pose.mouth = { alt: k > 0.25 };
        pose.armF = { rot: Math.round(-60 * k) };
        pose.armB = { rot: Math.round(60 * k) };
        if (t >= 0.3 && t < 0.7) pose.fx = { visible: true, rot: Math.round(30 * (t - 0.3)) };
      } else {
        const wind = smoothstep(0, 0.3, t);
        const strike = smoothstep(0.3, 0.45, t);
        const rec = smoothstep(0.6, 0.95, t);
        const k = 1 - rec;
        pose.body = {
          dx: Math.round((-3 * wind + 9 * strike) * k),
          sx: 1 + (0.1 * wind + 0.25 * strike) * k,
          sy: 1 - (0.08 * wind + 0.15 * strike) * k,
        };
        if (t >= 0.32 && t < 0.62) pose.fx = { visible: true };
      }
      break;
    }
    case 'dance': {
      const b = Math.abs(W(2 * t));
      pose.body = {
        dx: Math.round(3 * W(t) * g.A),
        dy: Math.round(-2 * b * g.B),
        rot: Math.round(10 * W(t)),
      };
      if (ghost) {
        pose.armF = { rot: Math.round(-30 - 40 * W(t)) };
        pose.armB = { rot: Math.round(30 + 40 * W(t)) };
      }
      break;
    }
  }
  return pose;
}

/* ------------------------------ QUADRÚPEDE -------------------------------- */

function quad(spec: CharSpec, action: ActionId, t: number, g: Gains): Pose {
  const pose: Pose = { fx: { visible: false } };
  const W = (tt: number) => wave(spec, tt);
  const blink = inWindow(t, spec.motion.blinkAt, 0.09);
  pose.eye = { alt: blink };

  switch (action) {
    case 'idle': {
      const br = W(t) * 0.5 + 0.5;
      pose.head = { dy: -Math.round(br * 1 * g.B) };
      pose.tail = { rot: Math.round(18 * W(2 * t)) };
      pose.earFront = { rot: inWindow(t, 0.4, 0.1) ? -15 : 0 };
      break;
    }
    case 'walk':
    case 'run': {
      const run = action === 'run';
      const s = W(t);
      const A = Math.round((run ? 25 : 18) * g.A);
      if (run) {
        // galope: pares dianteiro/traseiro
        const f = W(t);
        const b = W(t + 0.5);
        pose.legNF = { rot: Math.round(A * f) };
        pose.legFF = { rot: Math.round(A * f) };
        pose.legNB = { rot: Math.round(A * b) };
        pose.legFB = { rot: Math.round(A * b) };
        pose.body = {
          dy: -Math.round(2 * g.B * Math.abs(s)),
          rot: Math.round(5 * s),
          sx: 1 + 0.05 * s * g.A,
          sy: 1 - 0.05 * s * g.A,
        };
        pose.tail = { rot: 35 };
        pose.head = { rot: Math.round(-6 + 5 * s) };
      } else {
        // trote: pares diagonais
        pose.legNF = { rot: Math.round(A * s) };
        pose.legFB = { rot: Math.round(A * s) };
        pose.legNB = { rot: Math.round(-A * s) };
        pose.legFF = { rot: Math.round(-A * s) };
        const bob = Math.round(1 * g.B * Math.abs(s));
        pose.body = { dy: -bob };
        pose.legNF.dy = bob;
        pose.legNB.dy = bob;
        pose.legFF.dy = bob;
        pose.legFB.dy = bob;
        pose.tail = { rot: Math.round(15 * W(2 * t)) };
        pose.head = { rot: Math.round(3 * s) };
      }
      break;
    }
    case 'jump': {
      const H = Math.round(6 * g.A);
      if (t < 0.22) {
        const k = smoothstep(0, 0.22, t);
        pose.body = { dy: Math.round(1 * k) };
        pose.legNF = { rot: Math.round(-15 * k) };
        pose.legNB = { rot: Math.round(15 * k) };
        pose.legFF = { rot: Math.round(-15 * k) };
        pose.legFB = { rot: Math.round(15 * k) };
      } else if (t < 0.8) {
        const v = (t - 0.22) / 0.58;
        const h = Math.sin(v * Math.PI);
        pose.body = { dy: -Math.round(H * h), sx: 1 + 0.06 * h, sy: 1 - 0.04 * h };
        pose.legNF = { rot: Math.round(-22 * h), dy: Math.round(H * h) };
        pose.legNB = { rot: Math.round(22 * h), dy: Math.round(H * h) };
        pose.legFF = { rot: Math.round(-18 * h), dy: Math.round(H * h) };
        pose.legFB = { rot: Math.round(18 * h), dy: Math.round(H * h) };
        pose.tail = { rot: Math.round(25 * h) };
      } else {
        const k = Math.sin(((t - 0.8) / 0.2) * Math.PI);
        pose.body = { dy: Math.round(1 * k) };
      }
      break;
    }
    case 'attack': {
      const strike = smoothstep(0.3, 0.45, t);
      const rec = smoothstep(0.6, 0.92, t);
      const k = 1 - rec;
      pose.body = { dx: Math.round(4 * strike * k) };
      pose.head = { rot: Math.round(22 * strike * k), dx: Math.round(2 * strike * k) };
      pose.mouth = { alt: strike * k > 0.3 };
      pose.tail = { rot: Math.round(-30 * strike * k) };
      pose.legNF = { rot: Math.round(-14 * strike * k) };
      if (t >= 0.35 && t < 0.6) pose.fx = { visible: true };
      break;
    }
    case 'dance': {
      const b = Math.abs(W(2 * t));
      pose.body = { dy: Math.round(-2 * b * g.B), rot: Math.round(8 * W(t)) };
      pose.head = { rot: Math.round(12 * W(2 * t)) };
      pose.tail = { rot: Math.round(25 * W(3 * t)) };
      pose.legNF = { rot: Math.round(20 * Math.max(0, W(t))) };
      pose.legNB = { rot: Math.round(20 * Math.max(0, -W(t))) };
      break;
    }
  }
  return pose;
}

/* --------------------------------- entrada --------------------------------- */

export function samplePose(spec: CharSpec, action: ActionId, t: number, params: MotionParams): Pose {
  const g = gains(params);
  switch (spec.group) {
    case 'blob': return blob(spec, action, t, g);
    case 'quad': return quad(spec, action, t, g);
    default: return biped(spec, action, t, g);
  }
}
