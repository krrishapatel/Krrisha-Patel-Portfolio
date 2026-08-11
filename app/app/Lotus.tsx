'use client';

import OrigamiFigure, { type Pose, type Shape, type Spec } from './OrigamiFigure';
import {
  add,
  centreOn,
  cross,
  mul,
  PINK,
  PURPLE,
  BLUE,
  ring,
  solid,
  spin,
  tube,
  unit,
  VIOLET,
  type Face,
  type RGB,
  type Vec,
} from './origami';

/*
  An origami lotus — the classic folded water lily, three rings of petals
  hinged on a common base.

  It is built the same way as the crane and for the same reason: the petals
  overlap, so whichever one is nearer has to genuinely occlude the ones behind
  it, and that needs real geometry rather than stacked CSS planes.

  The whole flower is one number. `open` runs 0 (a closed bud, petals almost
  vertical and gathered) to 1 (fully splayed), and each ring reads it with its
  own lift range, so the outer ring falls away first and the inner three are
  still cupped when the outer ones are flat. Reading one shared number rather
  than animating each ring separately is what keeps the bloom looking like one
  motion.
*/

/* Three rings, outermost first. `r` is where the petals hinge, `y` the height
   of that hinge, `phase` staggers each ring so a petal never sits directly
   behind the one outside it, and `shut`/`wide` are that ring's lift angle at
   open=0 and open=1 — measured from horizontal, so a smaller number is flatter.
   The inner rings stay steeper at full bloom, which is what gives the flower a
   cup instead of a plate. Fifteen petals rather than twelve: with twelve, the
   open flower had visible gaps between the outer ones and read as a pinwheel.

   `half` is set from the arc each petal actually owns at its widest point, so
   neighbours just touch: too wide and the ring fuses into a disc, too narrow
   and it reads as a pinwheel of blades. */
const RINGS = [
  { n: 6, r: 0.2, y: 0.05, len: 0.6, half: 0.19, phase: 0, shut: 58, wide: 34, rgb: PINK },
  { n: 5, r: 0.15, y: 0.13, len: 0.48, half: 0.17, phase: 0.5, shut: 66, wide: 46, rgb: VIOLET },
  { n: 4, r: 0.09, y: 0.21, len: 0.36, half: 0.12, phase: 1.0, shut: 74, wide: 58, rgb: PURPLE },
];

/* The petal's outline, as a width profile along its own length: `t` is how far
   up the petal, `w` its half-width there as a fraction of the ring's `half`,
   and `h` how high the middle crease rides above the flat edges.

   This is the shape the flower was missing. A petal drawn as a diamond — a
   point at the root, a point at the tip — projects as a blade from every angle,
   which is exactly what the bloom looked like: fifteen shards. A real petal is
   narrow where it attaches, broadest a third of the way up, and BLUNT at the
   tip, and the blunt tip is what gives the eye a surface to read instead of a
   vanishing point. */
const ROWS = [
  { t: 0, w: 0.3, h: 0.08 },
  { t: 0.42, w: 1, h: 0.5 },
  { t: 0.78, w: 0.76, h: 0.34 },
  { t: 1, w: 0.2, h: 0.1 },
];

/* Petals in one ring are the same colour and sit edge to edge, so at full bloom
   neighbours merged into a single sheet with no crease between them. Alternating
   the shade petal by petal is what separates them; `half` is also kept under the
   arc each petal actually has, so they no longer physically overlap. */
const shade = (rgb: RGB, i: number): RGB =>
  i % 2 === 0 ? rgb : (rgb.map((c) => Math.round(c * 0.78)) as RGB);

/* The mass sits above the base — the petals fan out around a third of the way
   up — so the pivot goes there rather than at the origin, or the flower hangs
   high in the box and rotates about its own foot. */
const MODEL_CENTRE: Vec = [0, 0.26, 0];

function buildLotus(shape: Shape): Face[] {
  const open = shape.open;
  const faces: Face[] = [];

  /* Receptacle — the little seed pod the petals hinge around. Closed, so it
     shades itself and reads as something the petals are attached TO; without it
     the middle of the flower was a hole you could see the far petals through. */
  const podBase = ring([0, 0.02, 0], [0, 1, 0], 0.07, 6);
  const podTop = ring([0, 0.16, 0], [0, 1, 0], 0.09, 6);
  faces.push(
    ...solid(
      [0, 0.1, 0],
      [...tube(podBase, [0, -0.03, 0]), ...tube(podBase, podTop), ...tube(podTop, [0, 0.22, 0])],
      BLUE,
    ),
  );

  for (const band of RINGS) {
    // Lift is measured from horizontal: 90 would stand the petal straight up.
    const lift = band.shut + (band.wide - band.shut) * open;
    const rad = (lift * Math.PI) / 180;
    for (let i = 0; i < band.n; i++) {
      const a = (i / band.n) * 2 * Math.PI + band.phase;
      const radial: Vec = [Math.cos(a), 0, Math.sin(a)];
      // Tangent at the hinge — the petal's width runs along it, and it doubles
      // as the axis the tip curls about.
      const tangent: Vec = [-Math.sin(a), 0, Math.cos(a)];
      const axis: Vec = [
        radial[0] * Math.cos(rad),
        Math.sin(rad),
        radial[2] * Math.cos(rad),
      ];
      const base = add(mul(radial, band.r), [0, band.y, 0] as Vec);
      const up = unit(cross(tangent, axis));

      /* The petal is a ladder of rows following ROWS' outline. Each row has a
         left and right edge and a crease point riding above the middle, so the
         petal is a creased sheet with a real belly rather than a flat panel.

         Building it row by row is also what keeps it valid while it bends: a
         single quad with a folded corner isn't planar, and its own triangles
         crossed each other — which is why the earlier version rendered as
         shards. Every row here is straight, so every strip between two rows
         stays a well-formed solid at any curl. */
      const curl = 24 + 34 * open;
      // Hinge for the curl sits at the widest row — paper turns over where it
      // is broadest, not at the root.
      const hinge = add(base, mul(axis, band.len * ROWS[1].t));
      const rows = ROWS.map((row) => {
        const mid = add(base, mul(axis, band.len * row.t));
        const halfW = band.half * row.w;
        const bend = Math.max(0, (row.t - ROWS[1].t) / (1 - ROWS[1].t)) ** 2 * curl;
        const place = (p: Vec) => spin(p, hinge, tangent, -bend);
        return {
          left: place(add(mid, mul(tangent, halfW))),
          right: place(add(mid, mul(tangent, -halfW))),
          crest: place(add(mid, mul(up, band.half * row.h))),
        };
      });

      /* Each strip is wound against its OWN middle, one strip at a time, rather
         than the petal's overall centroid.

         This is what was actually wrong with the flower. `solid()` derives
         winding from a single centre, which is only correct for a convex blob;
         a petal is a long bent tent, so its overall centroid falls outside the
         surface near the tip, those triangles wound backwards, and back-face
         culling threw them away. 263 of 300 triangles were being dropped, and
         the handful that survived were the "slivers". Per-strip centres are
         local enough to stay inside. */
      const rgb = shade(band.rgb, i);
      for (let k = 0; k < rows.length - 1; k++) {
        const a = rows[k];
        const b = rows[k + 1];
        const mid = mul(
          [a.left, a.right, a.crest, b.left, b.right, b.crest].reduce(add, [0, 0, 0] as Vec),
          1 / 6,
        );
        faces.push(
          ...solid(
            mid,
            [
              // Upper surface — two panels either side of the crease.
              [a.left, b.left, b.crest],
              [a.left, b.crest, a.crest],
              [a.right, a.crest, b.crest],
              [a.right, b.crest, b.right],
              // Underside, flat: it shades darker than either upper panel, so
              // the petal reads as having a back when the flower tips over.
              [a.left, a.right, b.right],
              [a.left, b.right, b.left],
            ],
            rgb,
          ),
        );
      }
    }
  }

  return centreOn(faces, MODEL_CENTRE);
}

/* Half open at rest — a bud reads as a blob and a fully flat flower has nowhere
   left to go, so resting between the two is what makes the bloom legible.

   Seen from above and slightly to the side, looking down into the cup — which is
   the view that shows the flower as a flower, because every petal is separated
   from its neighbours and the inner ring is visible behind them. Seen from below
   the same mesh flattens into a fan of pink slivers.

   It was briefly pitched all the way to -62 for that reason, but the slivers were
   a winding bug rather than a camera problem, and at that angle the flower read as
   lying on its back. Here it reads as sitting in front of you. */
const IDLE: Pose = { pitch: 34, yaw: 14, roll: 0, dx: 0, dy: 0, shape: { open: 0.45 } };

export const lotusSpec: Spec = {
  // Scaled so the BUD fits, not the open flower: closed, the petals stand
  // nearly vertical and the flower is taller than at full bloom, so sizing to
  // the resting silhouette pushed the bud out of the bottom of the band.
  // centreY is set so the flower's resting ink centres on the same line as the
  // crane's and the dragon's. The three sit side by side, so any mismatch reads as
  // one of them floating rather than as three toys on a shelf — and the crane is
  // the one that can't move, since it already grazes the top of its band
  // mid-flight.
  view: { w: 200, h: 116, centreY: 64, scale: 72 },
  // 24 pod + 15 petals x 18 (three strips of six).
  maxFaces: 300,
  idle: IDLE,
  build: buildLotus,
  play: (pose, t, start) => {
    // Gather, then burst. Going straight to wide open looked like the flower
    // being stretched; closing to a bud first gives the bloom somewhere to come
    // FROM, which is the whole read. SHUT is the bud, and the two phases share
    // it as their handover value so there is no jump at t=0.28.
    const SHUT = 0.06;
    if (t < 0.28) {
      const gather = t / 0.28;
      pose.shape.open = IDLE.shape.open + (SHUT - IDLE.shape.open) * gather;
      pose.dy = 7 * gather;
    } else {
      const burst = (t - 0.28) / 0.72;
      const eased = burst < 0.5 ? 2 * burst * burst : 1 - Math.pow(-2 * burst + 2, 2) / 2;
      // Overshoot past the eased value and settle back, so the petals spring
      // rather than slide. Clamped because the petal lift is only tuned to 1.
      const swell = Math.min(1, eased * (1 + 0.16 * Math.sin(eased * Math.PI)));
      pose.shape.open = SHUT + (1 - SHUT) * swell;
      pose.dy = 7 * (1 - burst) - 9 * Math.sin(burst * Math.PI);
    }
    pose.yaw = start.yaw + 360 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    pose.roll = 5 * Math.sin(t * Math.PI * 2);
  },
  // The bloom without the spin or the travel: still the point of the thing.
  playReduced: (pose, t) => {
    pose.shape.open = IDLE.shape.open + (1 - IDLE.shape.open) * Math.sin(t * Math.PI);
  },
  durationMs: 2600,
  reducedMs: 1100,
  className: 'lotus-svg',
  label: 'origami lotus, drag to rotate or click to make it bloom',
};

export default function Lotus() {
  return <OrigamiFigure spec={lotusSpec} />;
}
