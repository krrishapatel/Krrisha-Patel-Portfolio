/*
  The mesh kit the three origami figures are built from.

  These started inside Crane.tsx. Once there were three figures the geometry
  helpers were the only thing they had in common, so they live here and each
  figure file is now just its own folds.
*/

export type Vec = [number, number, number];
export type RGB = [number, number, number];
export type Face = { v: [Vec, Vec, Vec]; rgb: RGB };

// The site palette, as numbers — shading has to multiply these per face.
export const PURPLE: RGB = [167, 139, 250];
export const BLUE: RGB = [96, 165, 250];
export const PINK: RGB = [244, 114, 182];
export const VIOLET: RGB = [141, 124, 233];

export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* One light for all three figures, from up and to the left and slightly toward
   the viewer. Sharing it is what makes the row read as one scene rather than
   three separate drawings. */
export const CAMERA_LIGHT: Vec = unit([-0.42, 0.76, 0.52]);

/* Rodrigues rotation — a point about an arbitrary axis. Wing hinges and petal
   hinges are lines through the model, not coordinate axes, so both need this
   rather than a plain rotateX. */
export const spin = (p: Vec, origin: Vec, axis: Vec, deg: number): Vec => {
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
   the solid's middle. Hand-winding dozens of triangles consistently is exactly
   where hand-built meshes go wrong — one backwards face turns black and gets
   culled from the wrong side. Deriving it from the centre makes that
   impossible. */
export const solid = (centre: Vec, tris: Vec[][], rgb: RGB): Face[] =>
  tris.map((t) => {
    const [a, b, c] = t as [Vec, Vec, Vec];
    const n = cross(sub(b, a), sub(c, a));
    const outward = dot(n, sub(a, centre)) > 0;
    return { v: (outward ? [a, b, c] : [a, c, b]) as [Vec, Vec, Vec], rgb };
  });

/* A ring of `n` points around `c`, in the plane perpendicular to `axis`. Every
   tapered part is built from two of these. The first version derived the beak's
   ring from the NECK's axis: the beak points a different direction, so its base
   was almost edge-on to its own length and the cone collapsed into a sliver.
   Each solid gets a ring on its own axis here. */
export const ring = (c: Vec, axis: Vec, r: number, n: number, phase = 0): Vec[] => {
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
   underside that shades darker than the top. Petals and fins want the same
   treatment, so they use it too. */
export const slab = (quad: [Vec, Vec, Vec, Vec], off: Vec): Vec[][] => {
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
export const tube = (a: Vec[], b: Vec[] | Vec): Vec[][] => {
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

/* A quad with a hinge along one side, folded by `deg`. A petal is a diamond
   rather than a rectangle — narrow at the stem, widest across the middle,
   coming back to a point — which a quad can describe if it walks base, one
   side, tip, the other side. */
export const petal = (
  base: Vec,
  axis: Vec,
  width: Vec,
  len: number,
  halfWidth: number,
  waist = 0.45,
): [Vec, Vec, Vec, Vec] => {
  const a = unit(axis);
  const w = unit(width);
  return [
    base,
    add(add(base, mul(a, len * waist)), mul(w, halfWidth)),
    add(base, mul(a, len)),
    add(add(base, mul(a, len * waist)), mul(w, -halfWidth)),
  ];
};

/* Recentre a built figure on its own balance point, so a pose rotates about the
   middle of the shape rather than about whichever vertex happened to be the
   origin while it was being written. */
export const centreOn = (faces: Face[], c: Vec): Face[] =>
  faces.map((f) => ({ rgb: f.rgb, v: f.v.map((p) => sub(p, c)) as [Vec, Vec, Vec] }));
