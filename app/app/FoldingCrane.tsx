'use client';

import OrigamiFigure, { type Pose, type Shape, type Spec } from './OrigamiFigure';
import { PINK, PURPLE, spin, sub, type Face, type RGB, type Vec } from './origami';

const A = 1.3;

const B = 0.44;

const C = 0.17;
const C2 = 0.062;

const WB = 0.3;

const XH = -1.02;
const XT = 1.02;

const TE = 1 - B / A;

const NECK_TIP: Vec = [-A, 0, 0];
const TAIL_TIP: Vec = [A, 0, 0];

const FRONT: RGB = PURPLE;
const BACK: RGB = [228, 222, 252];
const WING_UP: RGB = [129, 155, 250];
const WING_DOWN: RGB = [206, 205, 245];

const KEEL = 52;
const WING = 82;
const NECK = 92;
const HEAD = -100;
const TAIL = 80;
const TTIP = -16;

type Panel = {
  poly: Vec[];
  hinge: [Vec, Vec];
  deg: number;
  parent: number | null;
  front: RGB;
  back: RGB;
};

const PANELS: Panel[] = [
  {
    poly: [[-B, 0, 0], [-B, 0, -WB], [B, 0, -WB], [B, 0, 0]],
    hinge: [[-1, 0, 0], [1, 0, 0]],
    deg: -KEEL,
    parent: null,
    front: FRONT,
    back: BACK,
  },
  {
    poly: [[-B, 0, 0], [B, 0, 0], [B, 0, WB], [-B, 0, WB]],
    hinge: [[-1, 0, 0], [1, 0, 0]],
    deg: KEEL,
    parent: null,
    front: FRONT,
    back: BACK,
  },
  {
    poly: [[-B, 0, -WB], [-B, 0, -A * TE], [0, 0, -A], [B, 0, -A * TE], [B, 0, -WB]],
    hinge: [[-1, 0, -WB], [1, 0, -WB]],
    deg: WING,
    parent: 0,
    front: WING_UP,
    back: WING_DOWN,
  },
  {
    poly: [[-B, 0, WB], [B, 0, WB], [B, 0, A * TE], [0, 0, A], [-B, 0, A * TE]],
    hinge: [[-1, 0, WB], [1, 0, WB]],
    deg: -WING,
    parent: 1,
    front: WING_UP,
    back: WING_DOWN,
  },
  {
    poly: [[-B, 0, C], [-B, 0, -C], [XH, 0, -C2], [XH, 0, C2]],
    hinge: [[-B, 0, C], [-B, 0, -C]],
    deg: NECK,
    parent: null,
    front: FRONT,
    back: BACK,
  },
  {
    poly: [[XH, 0, -C2], [XH, 0, C2], NECK_TIP],
    hinge: [[XH, 0, C2], [XH, 0, -C2]],
    deg: HEAD,
    parent: 4,
    front: PINK,
    back: PINK,
  },
  {
    poly: [[B, 0, -C], [B, 0, C], [XT, 0, C2], [XT, 0, -C2]],
    hinge: [[B, 0, -C], [B, 0, C]],
    deg: TAIL,
    parent: null,
    front: FRONT,
    back: BACK,
  },
  {
    poly: [[XT, 0, C2], [XT, 0, -C2], TAIL_TIP],
    hinge: [[XT, 0, -C2], [XT, 0, C2]],
    deg: TTIP,
    parent: 6,
    front: FRONT,
    back: BACK,
  },
];

const foldPoint = (p: Vec, index: number, s: number): Vec => {
  let q = p;
  let at: number | null = index;
  while (at !== null) {
    const panel = PANELS[at];
    const [h0, h1] = panel.hinge;
    q = spin(q, h0, sub(h1, h0), panel.deg * s);
    at = panel.parent;
  }
  return q;
};

function buildFoldingCrane(shape: Shape): Face[] {
  const s = shape.s;
  const faces: Face[] = [];
  for (let i = 0; i < PANELS.length; i++) {
    const panel = PANELS[i];
    const pts = panel.poly.map((p) => foldPoint(p, i, s));
    for (const front of [true, false]) {
      const ring = front ? pts : [...pts].reverse();
      const rgb = front ? panel.front : panel.back;
      for (let k = 1; k < ring.length - 1; k++) {
        faces.push({ v: [ring[0], ring[k], ring[k + 1]], rgb });
      }
    }
  }

  return faces;
}

const FLAT: Pose = { pitch: 68, yaw: 0, roll: 0, dx: 0, dy: 0, shape: { s: 0 } };
const IDLE: Pose = { pitch: 8, yaw: 48, roll: 0, dx: 0, dy: 0, shape: { s: 1 } };

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const foldingCraneSpec: Spec = {
  view: { w: 330, h: 330, centreY: 164, scale: 118 },
  maxFaces: 44,
  idle: IDLE,
  build: buildFoldingCrane,
  play: (pose, t) => {
    const s = ease(t);
    pose.shape.s = s;
    pose.pitch = FLAT.pitch + (IDLE.pitch - FLAT.pitch) * s;
    pose.yaw = FLAT.yaw + (IDLE.yaw - FLAT.yaw) * s;
  },
  playReduced: (pose, t) => {
    const s = ease(t);
    pose.shape.s = s;
    pose.pitch = FLAT.pitch + (IDLE.pitch - FLAT.pitch) * s;
    pose.yaw = FLAT.yaw + (IDLE.yaw - FLAT.yaw) * s;
  },
  durationMs: 3400,
  reducedMs: 1200,
  autoplay: true,
  className: 'folding-crane-svg',
  label: 'a square of paper that folds itself into a crane, drag to rotate or click to refold',
};

export default function FoldingCrane({ hold }: { hold?: boolean }) {
  return <OrigamiFigure spec={foldingCraneSpec} hold={hold} />;
}
