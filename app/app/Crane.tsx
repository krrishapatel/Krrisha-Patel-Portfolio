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
  slab,
  solid,
  spin,
  sub,
  tube,
  unit,
  VIOLET,
  type Face,
  type Vec,
} from './origami';

/*
  The crane, as an actual 3D model rather than a set of folded planes.

  Every CSS attempt at this hit the same wall: the browser depth-sorts whole
  planes, not pixels, so any two shapes that cross in space fight over which
  draws on top and one of them loses entirely. That caps a CSS crane at flat
  panels arranged to never intersect — no closed forms, no occlusion, and
  nothing that shades itself.

  So the geometry is real: named solids with vertices in 3D, rotated,
  perspective-projected, sorted back-to-front and lit per face. The beak is a
  cone that comes to a point in depth, the body is a closed hull, and the wings
  are slabs with thickness — and because the wings hinge on their root edge,
  they can beat, which is what makes the click read as flight instead of a spin.

  Projection, lighting, sorting and the pointer handling live in
  OrigamiFigure.tsx, shared with the lotus and the koi.
*/

/* Every vertex is measured from the chest, but the mass sits above and behind
   it, so the bird hung high in the box until the pivot moved up to where it
   actually balances. This is also the point the pose rotates about. */
const MODEL_CENTRE: Vec = [0.12, 0.44, 0];

/* `flap` is the wing dihedral in degrees. Everything else is fixed, so one
   number rebuilds the whole bird mid-beat. */
function buildCrane(shape: Shape): Face[] {
  const flap = shape.flap;
  const faces: Face[] = [];

  /* Body — a closed hull: chest apex, a six-point ring at the shoulders, a
     narrower ring at the hips, rump apex. Two rings rather than one so the back
     and the belly can catch different light instead of the whole flank reading
     as a single plane. */
  const chest: Vec = [-0.46, 0.06, 0];
  const rump: Vec = [0.72, 0.3, 0];
  const along: Vec = [1, 0.2, 0];
  const shoulder = ring([0.0, 0.12, 0], along, 0.3, 6, Math.PI / 6);
  const hip = ring([0.42, 0.2, 0], along, 0.22, 6, Math.PI / 6);
  faces.push(
    ...solid(
      [0.14, 0.16, 0],
      [...tube(shoulder, chest), ...tube(shoulder, hip), ...tube(hip, rump)],
      PURPLE,
    ),
  );

  /* Neck — a tapered four-sided prism from the chest up to the head. Square
     rather than round: a paper crane's neck is a folded ridge, and four faces
     give a lit side and a shadowed side with a crease between them. */
  const neckBase: Vec = [-0.3, 0.16, 0];
  const head: Vec = [-0.74, 0.86, 0];
  const neckAxis = sub(head, neckBase);
  const nb = ring(neckBase, neckAxis, 0.13, 4);
  const nt = ring(head, neckAxis, 0.085, 4);
  faces.push(...solid(mul(add(neckBase, head), 0.5), tube(nb, nt), PURPLE));

  /* Beak — a cone on its own axis, from a ring at the head to a single point
     out front. This was the giveaway before: a flat triangle with no thickness,
     so it read as cut paper however carefully the rest was folded. */
  const tip: Vec = [-1.16, 0.68, 0];
  const beakAxis = sub(tip, head);
  const beakBase = ring(head, beakAxis, 0.1, 4);
  faces.push(
    ...solid(
      add(head, mul(beakAxis, 0.3)),
      [...tube(beakBase, tip), ...tube(beakBase, head)],
      PINK,
    ),
  );

  /* Wings — slabs with real planform, hinged on the root edge where they meet
     the back. Four corners (leading and trailing, root and tip) give the wing
     span AND chord; the thickness offset gives it a top and an underside that
     shade differently. Every corner rotates about the hinge, so `flap` beats the
     wing without detaching it from the body. */
  const hingeA: Vec = [-0.14, 0.28, 0];
  const hingeB: Vec = [0.5, 0.32, 0];
  const hinge = sub(hingeB, hingeA);
  for (const side of [1, -1]) {
    // Root leading, root trailing, tip trailing, tip leading — the quad walks
    // the perimeter, so slab() can skin it. The leading edge rakes from -0.2
    // back to 0.3 across the span while the chord narrows from 0.72 to 0.32.
    const plan: [Vec, Vec, Vec, Vec] = [
      [-0.34, 0.26, 0.07 * side],
      [0.6, 0.33, 0.07 * side],
      [0.62, 0.34, 0.94 * side],
      [0.06, 0.3, 1.0 * side],
    ];
    const turned = plan.map((p) => spin(p, hingeA, hinge, -flap * side)) as [Vec, Vec, Vec, Vec];
    // Thickness along the wing's own normal, so it stays perpendicular to the
    // panel however far the wing has beaten.
    const n = unit(cross(sub(turned[1], turned[0]), sub(turned[3], turned[0])));
    const centre = mul(turned.reduce(add, [0, 0, 0] as Vec), 0.25);
    faces.push(...solid(centre, slab(turned, mul(n, 0.035)), side > 0 ? PURPLE : BLUE));
  }

  /* Tail — a wedge off the rump, swept up and back. Over-lengthening this once
     made it the biggest plank in the frame and the bird looked like it had three
     wings; it is a fin, deliberately. */
  const ta: Vec = [0.56, 0.24, 0.13];
  const tb: Vec = [0.56, 0.24, -0.13];
  const tt: Vec = [1.06, 0.58, 0];
  const td: Vec = [0.86, 0.26, 0];
  faces.push(
    ...solid(
      mul(add(add(ta, tb), add(tt, td)), 0.25),
      [
        [ta, tb, tt],
        [ta, tb, td],
        [ta, tt, td],
        [tb, tt, td],
      ],
      VIOLET,
    ),
  );

  return centreOn(faces, MODEL_CENTRE);
}

const WINGBEATS = 3.5;

/* Near side-on and looking slightly UP at it, which is the view of this bird
   worth having: the neck and the beak draw one continuous line across the frame,
   the wing panel reads as a broad plane rather than as an edge, and the tail sits
   clear behind the body.

   It sat mirrored from here for a long time — turned three-quarters away and
   pitched down onto its back — which buried the neck against the near wing and
   pointed the beak into the body. `flap` is the resting dihedral, the shallow V a
   crane at rest actually holds. */
const IDLE: Pose = { pitch: 24, yaw: -8, roll: 0, dx: 0, dy: 0, shape: { flap: 9 } };

export const craneSpec: Spec = {
  // The bird is wider than it is tall, so a square viewBox left a third of its
  // height empty above and below — which is what read as a gap around it. The
  // band is cropped to just hold the flight; centreY is where the projection
  // puts y=0, chosen so the leftover space splits evenly rather than piling up
  // above the wings.
  view: { w: 200, h: 116, centreY: 62, scale: 58 },
  // 24 body + 8 neck + 8 beak + 24 wings + 4 tail.
  maxFaces: 72,
  idle: IDLE,
  build: buildCrane,
  play: (pose, t, start) => {
    const beat = Math.sin(t * Math.PI * 2 * WINGBEATS);
    // Ease the circuit so it launches and settles rather than starting and
    // stopping at full speed.
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    // Wings lead; the body answers a beat behind. Downstroke lifts the bird and
    // pitches its nose up, which is what stops the beat looking like a wing
    // wobbling next to a static body. The travel is pulled in to fit the
    // cropped band — an earlier -18 lift put a wingtip outside it.
    pose.shape.flap = IDLE.shape.flap + 42 * beat;
    pose.yaw = start.yaw + 360 * ease;
    pose.pitch = start.pitch - 7 * beat;
    pose.roll = 15 * Math.sin(t * Math.PI * 2);
    pose.dy = -14 * Math.sin(t * Math.PI) - 4 * beat;
    pose.dx = 18 * Math.sin(t * Math.PI * 2);
  },
  // No flight path and no travel; a single slow beat still acknowledges the
  // click.
  playReduced: (pose, t) => {
    pose.shape.flap = IDLE.shape.flap + 42 * Math.sin(t * Math.PI);
  },
  durationMs: 2800,
  reducedMs: 900,
  className: 'crane-svg',
  label: 'origami crane, drag to rotate or click to make it fly',
};

export default function Crane() {
  return <OrigamiFigure spec={craneSpec} />;
}
