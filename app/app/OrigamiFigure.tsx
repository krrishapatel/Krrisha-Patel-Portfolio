'use client';

import { useEffect, useRef } from 'react';
import { CAMERA_LIGHT, cross, dot, mul, add, sub, unit, type Face, type Vec } from './origami';

/*
  The renderer the three origami figures share.

  Each figure supplies only its own folds and its own trick. Everything below
  the geometry — perspective projection, back-face culling, per-face lighting,
  the painter sort, the fixed polygon pool and the drag-versus-click decision —
  is identical for all of them, and was identical when it was copied inside the
  crane too.

  Two details that look arbitrary and are not:

  FOCAL is deliberately long. A short lens (3.4) magnified whichever part swung
  toward the viewer by 1.8x, so the crane's near wing covered its own body; at
  6.2 near and far differ by about 15%, which reads as depth rather than as
  distortion.

  The polygon pool is allocated once and mutated by ref. Re-rendering React 176
  polygons per frame is the difference between this animating and this
  stuttering, and culled faces simply leave their slot empty rather than
  reshuffling the list.
*/

export type Shape = Record<string, number>;
export type Pose = {
  pitch: number;
  yaw: number;
  roll: number;
  dx: number;
  dy: number;
  shape: Shape;
};

export type Spec = {
  /* Drawn band and projection. VIEW_H is a band rather than a square because a
     square box around a wide subject leaves a third of its height empty, and
     that emptiness reads as page padding. centreY is where the projection puts
     y=0 — not the middle of the band, since a figure's mass rarely sits at its
     geometric centre. */
  view: { w: number; h: number; centreY: number; scale: number };
  /* Worst-case triangle count, not the visible count: culled faces leave their
     slot empty, so this only has to cover the whole mesh. */
  maxFaces: number;
  idle: Pose;
  build: (shape: Shape) => Face[];
  /* Both mutate `pose` in place for a normalised time t. `play` is the trick;
     `playReduced` is the same acknowledgement without travel or spin, for
     anyone who asked the OS for less motion. Both must land back on `idle` at
     t=1, give or take a whole turn of yaw. */
  play: (pose: Pose, t: number, start: Pose) => void;
  playReduced: (pose: Pose, t: number) => void;
  durationMs: number;
  reducedMs: number;
  className: string;
  label: string;
};

const FOCAL = 6.2;
const CAMERA: Vec = [0, 0, FOCAL];

// Deep copy: `shape` is nested, so a spread would alias the idle shape and the
// first animation would quietly overwrite the pose it has to return to.
const freshPose = (p: Pose): Pose => ({ ...p, shape: { ...p.shape } });

export default function OrigamiFigure({ spec }: { spec: Spec }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const polysRef = useRef<(SVGPolygonElement | null)[]>([]);
  const poseRef = useRef(freshPose(spec.idle));
  const busyRef = useRef(false);
  const rafRef = useRef(0);
  const dragRef = useRef({ active: false, x: 0, y: 0, moved: 0 });

  useEffect(() => {
    const { view, maxFaces, idle, build, play, playReduced } = spec;
    const pose = poseRef.current;

    const draw = () => {
      const { pitch, yaw, roll, dx, dy, shape } = pose;
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
        return [
          view.w / 2 + p[0] * view.scale * k + dx,
          view.centreY - p[1] * view.scale * k + dy,
        ];
      };

      const drawable: { depth: number; pts: string; fill: string }[] = [];

      for (const face of build(shape)) {
        const [a, b, c] = face.v.map(place) as [Vec, Vec, Vec];
        const n = unit(cross(sub(b, a), sub(c, a)));
        const centroid = mul(add(add(a, b), c), 1 / 3);
        // Cull anything turned away from the camera. On closed solids those
        // faces are always hidden, and dropping them keeps the sort honest.
        if (dot(n, sub(centroid, CAMERA)) >= 0) continue;
        // Wrap lighting: remap n·l from [-1,1] rather than clamping at 0, so a
        // face angled away shades down instead of dropping straight to the
        // floor. Straight Lambert put most of the mesh at the minimum and it
        // read as a silhouette.
        const wrap = (dot(n, CAMERA_LIGHT) + 1) / 2;
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

      for (let i = 0; i < maxFaces; i++) {
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

    const run = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      const start = freshPose(pose);
      const ms = reduced ? spec.reducedMs : spec.durationMs;
      const t0 = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        if (reduced) playReduced(pose, t);
        else play(pose, t, start);
        draw();
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // Land exactly on the pose it left from. A trick that turns a whole
          // 360 keeps the viewer's own yaw and pitch; everything else returns.
          Object.assign(pose, freshPose(idle), { yaw: start.yaw, pitch: start.pitch });
          draw();
          busyRef.current = false;
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
      if (!d.active || busyRef.current) return;
      const ddx = e.clientX - d.x;
      const ddy = e.clientY - d.y;
      d.moved += Math.abs(ddx) + Math.abs(ddy);
      pose.yaw += ddx * 0.6;
      // Clamped: past vertical the figure reads as upside down rather than
      // tilted.
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
      // a separate onClick keeps the end of a drag from also starting a trick.
      if (d.moved < 6) run();
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
  }, [spec]);

  return (
    <svg
      ref={svgRef}
      className={`origami-svg ${spec.className}`}
      viewBox={`0 0 ${spec.view.w} ${spec.view.h}`}
      role="img"
      aria-label={spec.label}
    >
      {Array.from({ length: spec.maxFaces }, (_, i) => (
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
