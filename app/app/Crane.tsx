'use client';

import { useEffect, useRef } from 'react';

/*
  The crane, as an actual 3D model rather than a set of folded planes.

  Every CSS attempt at this hit the same wall: the browser depth-sorts whole
  planes, not pixels, so any two shapes that cross in space fight over which
  draws on top and one of them loses entirely. That caps a CSS crane at flat
  panels arranged to never intersect — no closed forms, no occlusion, and
  nothing that shades itself.

  So the geometry is real here: named solids with vertices in 3D, rotated,
  perspective-projected, sorted back-to-front and lit per face from a fixed
  light. The beak is a cone that comes to a point in depth, the body is a closed
  octahedron, and the wings are wedges with thickness — and because the wings
  hinge on their root edge, they can beat, which is what makes the click read as
  flight instead of a spin.
*/

type Vec = [number, number, number];
type RGB = [number, number, number];
type Face = { v: [Vec, Vec, Vec]; rgb: RGB };

// The site palette, as numbers — shading has to multiply these per face.
const PURPLE: RGB = [167, 139, 250];
const BLUE: RGB = [96, 165, 250];
const PINK: RGB = [244, 114, 182];
const VIOLET: RGB = [141, 124, 233];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* Rodrigues rotation — a point about an arbitrary axis. The wing hinge is a
   line through the body, not one of the coordinate axes, so the flap needs
   this rather than a plain rotateX. */
const spin = (p: Vec, origin: Vec, axis: Vec, deg: number): Vec => {
  const r = (deg * Math.PI) / 180;
  const k = unit(axis);
  const v = sub(p, origin);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return add(
    origin,
    add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))),
  );
};

/* Build a solid's faces, winding each triangle so its normal points away from
   the solid's middle. Hand-winding 29 triangles consistently is exactly where
   hand-built meshes go wrong — one backwards face turns black and gets culled
   from the wrong side. Deriving it from the centre makes that impossible. */
const solid = (centre: Vec, tris: Vec[][], rgb: RGB): Face[] =>
  tris.map((t) => {
    const [a, b, c] = t as [Vec, Vec, Vec];
    const n = cross(sub(b, a), sub(c, a));
    const outward = dot(n, sub(a, centre)) > 0;
    return { v: (outward ? [a, b, c] : [a, c, b]) as [Vec, Vec, Vec], rgb };
  });

/* The model sits nose-left, tail-right, and is written around its own origin;
   this offset re-centres it so rotation happens about the bird's middle rather
   than about a point inside its chest. */
/* Every vertex is measured from the chest, but the mass sits above and behind
   it, so the bird hung high in the box until the pivot moved up to where it
   actually balances. This is also the point the pose rotates about. */
const MODEL_CENTRE: Vec = [0.12, 0.44, 0];

/* A ring of `n` points around `c`, in the plane perpendicular to `axis`. Every
   tapered part is built from two of these. The first version derived the beak's
   ring from the NECK's axis: the beak points a different direction, so its base
   was almost edge-on to its own length and the cone collapsed into a sliver.
   Each solid gets a ring on its own axis here. */
const ring = (c: Vec, axis: Vec, r: number, n: number, phase = 0): Vec[] => {
  const k = unit(axis);
  // Any vector not parallel to the axis works as a seed for the perpendicular
  // basis; picking by smallest component keeps it well away from parallel.
  const seed: Vec =
    Math.abs(k[0]) < Math.abs(k[1]) && Math.abs(k[0]) < Math.abs(k[2])
      ? [1, 0, 0]
      : Math.abs(k[1]) < Math.abs(k[2])
        ? [0, 1, 0]
        : [0, 0, 1];
  const u = unit(cross(k, seed));
  const w = cross(k, u);
  return Array.from({ length: n }, (_, i) => {
    const a = ((i / n) * 2 * Math.PI) + phase;
    return add(c, add(mul(u, Math.cos(a) * r), mul(w, Math.sin(a) * r)));
  });
};

/* A flat panel with thickness: the planform quad offset either side of its own
   plane, then skinned around the perimeter. Wings built as a wedge to a single
   tip vertex tapered to a needle and read as fins; a slab has span, chord and an
   underside that shades darker than the top. */
const slab = (quad: [Vec, Vec, Vec, Vec], off: Vec): Vec[][] => {
  const top = quad.map((p) => add(p, off));
  const bot = quad.map((p) => sub(p, off));
  const tris: Vec[][] = [
    [top[0], top[1], top[2]],
    [top[0], top[2], top[3]],
    [bot[0], bot[1], bot[2]],
    [bot[0], bot[2], bot[3]],
  ];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    tris.push([top[i], top[j], bot[j]], [top[i], bot[j], bot[i]]);
  }
  return tris;
};

/* Skin two rings into a tube, or a ring into an apex when `top` is a point. */
const tube = (a: Vec[], b: Vec[] | Vec): Vec[][] => {
  const tris: Vec[][] = [];
  const apex = !Array.isArray(b[0]);
  for (let i = 0; i < a.length; i++) {
    const j = (i + 1) % a.length;
    if (apex) tris.push([a[i], a[j], b as Vec]);
    else {
      const r = b as Vec[];
      tris.push([a[i], a[j], r[j]], [a[i], r[j], r[i]]);
    }
  }
  return tris;
};

/* `flap` is the wing dihedral in degrees. Everything else is fixed, so one
   number rebuilds the whole bird mid-beat. */
function buildMesh(flap: number): Face[] {
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

  /* Tail — a wedge off the rump, swept up and back. It used to end inside the
     body's own silhouette and never showed; this one clears the rump. */
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

  return faces.map((f) => ({
    rgb: f.rgb,
    v: f.v.map((p) => sub(p, MODEL_CENTRE)) as [Vec, Vec, Vec],
  }));
}

// The bird is wider than it is tall, so a square viewBox left a third of its
// height empty above and below — which is what read as a gap around the crane.
// VIEW_H is the drawn band, cropped to just hold the flight; CENTRE_Y is where
// the projection puts y=0, chosen so the leftover space splits evenly rather
// than piling up above the wings.
const VIEW = 200;
const VIEW_H = 116;
const CENTRE_Y = 62;
const SCALE = 58;
// Long lens. A short one (3.4) magnified whichever wing swung toward the
// viewer until it covered the body; at 6.2 the near and far tips differ by
// about 15% instead of 80%, which reads as depth rather than distortion.
const FOCAL = 6.2;
const CAMERA: Vec = [0, 0, FOCAL];
const LIGHT = unit([-0.42, 0.76, 0.52]);

// 24 body + 8 neck + 8 beak + 24 wings + 4 tail. Slots are allocated once and
// reused every frame; back-facing triangles leave their slot empty, so the
// count only has to cover the worst case rather than what's visible.
const MAX_FACES = 72;

/* Idle pose. Viewed from above and off to one side: from nearer the bird's own
   plane the far wing disappeared behind the body. `flap` opens the wings into a
   shallow V, which is what a crane at rest actually holds. */
/* Three-quarter view from slightly above: the wingspan runs across the frame
   rather than away from it, and the pitch looks down far enough to see the
   spread as a spread instead of edge-on. `flap` is the resting dihedral. */
const IDLE = { pitch: -42, yaw: 44, roll: 0, flap: 9, dx: 0, dy: 0 };
const FLIGHT_MS = 2800;
const WINGBEATS = 3.5;

export default function Crane() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const polysRef = useRef<(SVGPolygonElement | null)[]>([]);
  const poseRef = useRef({ ...IDLE });
  const flyingRef = useRef(false);
  const rafRef = useRef(0);
  const dragRef = useRef({ active: false, x: 0, y: 0, moved: 0 });

  useEffect(() => {
    const pose = poseRef.current;

    const draw = () => {
      const { pitch, yaw, roll, flap, dx, dy } = poseRef.current;
      const rz = (roll * Math.PI) / 180;
      const rx = (pitch * Math.PI) / 180;
      const ry = (yaw * Math.PI) / 180;
      const cz = Math.cos(rz);
      const sz = Math.sin(rz);
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);

      const place = (p: Vec): Vec => {
        const x1 = p[0] * cz - p[1] * sz;
        const y1 = p[0] * sz + p[1] * cz;
        const y2 = y1 * cx - p[2] * sx;
        const z2 = y1 * sx + p[2] * cx;
        return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
      };

      const project = (p: Vec): [number, number] => {
        // Perspective divide. Nearer vertices spread wider, which is the whole
        // reason a wing sweeping toward the viewer reads as coming forward.
        const k = FOCAL / (FOCAL - p[2]);
        return [VIEW / 2 + p[0] * SCALE * k + dx, CENTRE_Y - p[1] * SCALE * k + dy];
      };

      const drawable: { depth: number; pts: string; fill: string }[] = [];

      for (const face of buildMesh(flap)) {
        const [a, b, c] = face.v.map(place) as [Vec, Vec, Vec];
        const n = unit(cross(sub(b, a), sub(c, a)));
        const centroid = mul(add(add(a, b), c), 1 / 3);
        // Cull anything turned away from the camera. On closed solids those
        // faces are always hidden, and dropping them keeps the sort honest.
        if (dot(n, sub(centroid, CAMERA)) >= 0) continue;
        // Wrap lighting: remap n·l from [-1,1] rather than clamping at 0, so a
        // face angled away shades down instead of dropping straight to the
        // floor. Straight Lambert put most of the bird at the minimum and it
        // read as a silhouette.
        const wrap = (dot(n, LIGHT) + 1) / 2;
        const lum = 0.52 + 0.66 * wrap * wrap;
        const [r, g, bl] = face.rgb;
        drawable.push({
          depth: centroid[2],
          pts: [a, b, c].map((p) => project(p).map((q) => q.toFixed(2)).join(',')).join(' '),
          fill: `rgb(${Math.min(255, Math.round(r * lum))},${Math.min(
            255,
            Math.round(g * lum),
          )},${Math.min(255, Math.round(bl * lum))})`,
        });
      }

      // Painter's algorithm: farthest first, so nearer triangles paint over.
      drawable.sort((p, q) => p.depth - q.depth);

      for (let i = 0; i < MAX_FACES; i++) {
        const el = polysRef.current[i];
        if (!el) continue;
        const f = drawable[i];
        if (!f) {
          el.setAttribute('points', '');
          continue;
        }
        el.setAttribute('points', f.pts);
        // Stroking each triangle in its own fill closes the hairline gaps
        // antialiasing leaves between neighbours.
        el.setAttribute('fill', f.fill);
        el.setAttribute('stroke', f.fill);
      }
    };

    draw();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fly = () => {
      if (flyingRef.current) return;
      flyingRef.current = true;
      const startYaw = pose.yaw;
      const startPitch = pose.pitch;
      const t0 = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / FLIGHT_MS);
        const beat = Math.sin(t * Math.PI * 2 * WINGBEATS);
        // Ease the circuit so it launches and settles rather than starting and
        // stopping at full speed.
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        // Wings lead; the body answers a beat behind. Downstroke lifts the bird
        // and pitches its nose up, which is what stops the beat looking like a
        // wing wobbling next to a static body.
        pose.flap = IDLE.flap + 42 * beat;
        pose.yaw = startYaw + 360 * ease;
        pose.pitch = startPitch - 7 * beat;
        pose.roll = 15 * Math.sin(t * Math.PI * 2);
        pose.dy = -14 * Math.sin(t * Math.PI) - 4 * beat;
        pose.dx = 18 * Math.sin(t * Math.PI * 2);
        draw();
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // A full 360 of yaw lands on the pose it left from.
          Object.assign(pose, { ...IDLE, yaw: startYaw, pitch: startPitch });
          draw();
          flyingRef.current = false;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    // With reduced motion the flight path and the travel are dropped; a single
    // slow beat still acknowledges the click.
    const beatOnce = () => {
      if (flyingRef.current) return;
      flyingRef.current = true;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 900);
        pose.flap = IDLE.flap + 42 * Math.sin(t * Math.PI);
        draw();
        if (t < 1) rafRef.current = requestAnimationFrame(step);
        else {
          pose.flap = IDLE.flap;
          draw();
          flyingRef.current = false;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const el = svgRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      dragRef.current = { active: true, x: e.clientX, y: e.clientY, moved: 0 };
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || flyingRef.current) return;
      const ddx = e.clientX - d.x;
      const ddy = e.clientY - d.y;
      d.moved += Math.abs(ddx) + Math.abs(ddy);
      pose.yaw += ddx * 0.6;
      // Clamped: past vertical the bird reads as upside down rather than tilted.
      pose.pitch = Math.max(-72, Math.min(72, pose.pitch + ddy * 0.45));
      d.x = e.clientX;
      d.y = e.clientY;
      draw();
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      d.active = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      // A press that never travelled is a click. Deciding here rather than with
      // a separate onClick keeps the end of a drag from also launching a flight.
      if (d.moved < 6) (reduced ? beatOnce : fly)();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="crane-svg"
      viewBox={`0 0 ${VIEW} ${VIEW_H}`}
      role="img"
      aria-label="origami crane, drag to rotate or click to make it fly"
    >
      {Array.from({ length: MAX_FACES }, (_, i) => (
        <polygon
          key={i}
          ref={(node) => {
            polysRef.current[i] = node;
          }}
          points=""
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
