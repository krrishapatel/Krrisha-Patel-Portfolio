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
  type RGB,
  type Vec,
} from './origami';

/*
  An origami dragon — the western kind: an arched neck, a barrel chest, four legs,
  fingered bat wings, a spiked back and a barbed tail.

  Its geometry is a different kind from the other two on purpose. The crane is
  hinged panels and the lotus is a ring of creased petals; the dragon is a CHAIN.
  Its body is a run of linked segments, each one placed by walking along a curve
  rather than positioned by hand, which is what lets a ripple travel down it.

  It went through a version that was exactly that and nothing else — an evenly
  tapered tube with one sine wave along it, a continuous dorsal fin, and one flat
  quad per wing — and it read as a flappy snake, because every one of those
  choices is a snake's. What fixed it was giving it a SKELETON: a radius that
  swells into a ribcage between the shoulders and the hips, a spine that bends in
  three separate places instead of waving as one rope, wings with an arm and
  fingers in them, legs to hold it off the ground, and a jaw under the skull. None
  of that is more triangles for their own sake — each part answers a specific
  thing the eye was using to decide it was looking at a snake.

  Its trick is the lunge. `coil` runs 1 (neck arched hard back over the chest,
  tail cocked, legs tucked) through 0 (thrown out forward) to negative (overshot
  past straight). A travelling wave rides on top, so the tail whips as the body
  goes rather than swinging as one rigid piece — the ripple is what makes it read
  as alive rather than as a rotating ornament.
*/

/* The body is sampled at these fractions of its length. The radius is NOT a
   plain taper: it runs thin at the neck, swells hard across the chest where the
   wings and forelegs load it, holds through the hips and then whips away to
   nothing.

   That swell is doing most of the work. Sampled as an even taper the figure was
   a tube of constant slenderness from nose to tail — which is a snake, whatever
   you hang off it. A dragon has a barrel between its shoulders and its hips, and
   the eye reads that barrel before it reads any of the detail. */
const SEGS = [
  { u: 0.0, r: 0.058 },
  { u: 0.08, r: 0.068 },
  { u: 0.17, r: 0.084 },
  { u: 0.26, r: 0.106 },
  { u: 0.35, r: 0.118 },
  { u: 0.44, r: 0.112 },
  { u: 0.53, r: 0.096 },
  { u: 0.62, r: 0.078 },
  { u: 0.71, r: 0.06 },
  { u: 0.79, r: 0.045 },
  { u: 0.86, r: 0.032 },
  { u: 0.93, r: 0.021 },
  { u: 1.0, r: 0.012 },
];

/* Where the limbs and wings attach, as fractions along the body. The wings sit
   at the top of the chest with the forelegs just ahead of them and the hind legs
   back at the hips, so the four attachment points bracket the barrel and the
   torso reads as a torso. */
const WING_AT = 0.35;
const FORE_AT = 0.26;
const HIND_AT = 0.53;

/* Wind and push one part on its own centre. Each part here is convex, so its
   own middle is a safe reference. Deriving winding from the whole figure's
   centre is what silently deleted most of the lotus's petals: a long bent part's
   overall centroid falls outside its own surface, those triangles wind backwards
   and back-face culling throws them away. A coiled dragon is the most bent thing
   in the row, so this matters here more than anywhere. */
const pushPart = (faces: Face[], tris: Vec[][], rgb: RGB) => {
  const pts = tris.flat();
  const centre = mul(pts.reduce(add, [0, 0, 0] as Vec), 1 / pts.length);
  faces.push(...solid(centre, tris, rgb));
};

/* Mass sits over the shoulders where the wings load the spine, so the pose
   rotates about there rather than about the nose.

   Offset from the true geometric centre because the ink is not spread evenly
   along the body — the arched neck stacks mass high and forward while the tail
   runs long and thin — so centring on the geometry put the drawn figure a few
   pixels off in its band while the other two were centred. Measured against the
   lotus and the crane rather than derived. */
const MODEL_CENTRE: Vec = [0.02, 0.1, 0];

/* A side/up pair perpendicular to `axis`, for hanging fins, horns and wings off
   the spine.

   The reference axis is chosen as whichever world axis `axis` leans on least,
   rather than always using world up. Once the body's S became vertical, parts of
   the spine run nearly straight up — and crossing a vertical tangent with world
   up gives a zero vector, which would have collapsed the dorsal fins and the
   wings to nothing exactly where the curve is most interesting. */
const frame = (axis: Vec): [Vec, Vec] => {
  const a = unit(axis);
  const ref: Vec = Math.abs(a[1]) < 0.85 ? [0, 1, 0] : [0, 0, 1];
  const side = unit(cross(a, ref));
  return [side, unit(cross(side, a))];
};

/* The spine, as a curve in space. `u` is how far along (0 nose, 1 tail tip).
   `coil` bends it: at coil=1 the neck is arched hard back over the chest and the
   tail is cocked up behind, at coil=0 the whole animal is thrown out forward, and
   negative overshoots. `wave` is the phase of the ripple travelling down it.

   THE CURVE IS PIECEWISE, and that is the fix for the thing this figure got wrong
   for a long time. It used to be one sine wave running nose to tail — and one
   sine wave along a tube is a snake, no matter what you hang off it. An animal
   with a skeleton bends in three distinct places instead: a long arched NECK, a
   torso that stays essentially STRAIGHT and level because there is a ribcage in
   it, and a TAIL that leaves the hips and keeps curving. Three regions with
   different rules is what reads as a creature; one continuous wave reads as a
   rope.

   All three still come out of this one function, which is why the ripple stays
   continuous — the wings, the legs, the head and the tail all read the same
   curve rather than each animating on their own clock. */
const spineAt = (u: number, coil: number, wave: number): Vec => {
  const c = Math.max(0, coil);
  /* Gathered when coiled: the body spends its length on the curve rather than on
     reach, so it draws back into itself and extends as it lets go. */
  const len = 1.5 - 0.3 * c;

  /* How far into the neck (1 at the nose, 0 by the shoulders) and how far into
     the tail (0 at the hips, 1 at the tip). Squared, so each bend is
     concentrated out at its own end rather than smeared across the torso.

     Both are clamped at 1 because the head and the tail barb are placed by asking
     for points slightly PAST the ends of the body — u = -0.2 and u = 1.08. Left
     unclamped the neck term at u = -0.2 evaluates to 2.5, and the head flies off
     the end of its own neck. */
  const neck = Math.min(1, Math.max(0, 1 - u / 0.34)) ** 2;
  const tail = Math.min(1, Math.max(0, (u - 0.53) / 0.47)) ** 2;

  /* The neck draws BACK over the chest as it arches, and the tail carries
     forward under the body. Both shorten the figure's reach while it is coiled,
     which is what gives the lunge something to spend. */
  const x = -0.58 + u * len - neck * 0.26 * c + tail * 0.1 * c;

  /* Neck arch. There is a standing 0.2 of it even at full extension — a dragon
     with a level neck is a snake — and the coil adds to that rather than being
     the only thing holding the head up. */
  const arch = neck * (0.2 + 0.32 * c);
  // Tail: leaves the hips low, then cocks up behind when coiled, like a whip
  // held back.
  const whip = -tail * 0.13 + tail * (0.3 * c);
  // Ripple: small, and it grows toward the tail because a whip's tip moves
  // furthest. Deliberately weak across the torso — ribs do not ripple.
  const ripple = Math.sin(u * Math.PI * 2.6 - wave) * 0.032 * (0.1 + tail * 1.1 + neck * 0.3);
  const y = 0.02 + arch + whip + ripple;

  /* A sideways sweep as well, mostly in the tail. It carries no read on its own
     — the arch is what makes the silhouette — but without it the body is a flat
     cutout, and this is what puts the far wing behind the barrel and gives the
     figure volume. */
  const z = tail * 0.26 * c + neck * 0.1 * c + Math.sin(u * Math.PI * 2.4 - wave) * 0.022;
  return [x, y, z];
};

function buildDragon(shape: Shape): Face[] {
  const coil = shape.coil;
  const wave = shape.wave;
  const faces: Face[] = [];

  // Sample the curve, then build a ring at each sample oriented along the local
  // tangent, so the body's cross-section stays perpendicular to the curve
  // however hard it bends.
  const pts = SEGS.map((s) => spineAt(s.u, coil, wave));
  const rings = SEGS.map((s, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tangent = sub(b, a);
    // Six-sided: folded paper has creases down its flanks, and six faces give a
    // lit back, two flanks and a shadowed belly with visible edges between.
    return ring(pts[i], tangent, s.r, 6, Math.PI / 6);
  });

  /* Body, one link at a time. Per-link rather than one long solid is the whole
     reason the coil renders: a single centre for a body folded back on itself
     would wind the far half inside out. */
  for (let i = 0; i < rings.length - 1; i++) {
    pushPart(
      faces,
      tube(rings[i], rings[i + 1]),
      i % 2 === 0 ? PURPLE : (PURPLE.map((c) => Math.round(c * 0.82)) as RGB),
    );
  }
  // Tail comes to a point; the head end is capped by the skull below.
  pushPart(faces, tube(rings[rings.length - 1], spineAt(1.08, coil, wave)), VIOLET);

  /* Dorsal ridge — a row of separate SPIKES down the spine, each raked back
     toward the tail. Drawn before as a continuous fin joining every sample to the
     next, which gave the back one unbroken sawtooth edge — and an unbroken fin
     down the length of a tube is the single most fish-like thing you can put on
     it. Separate spikes with gaps between them read as vertebrae instead, and the
     gaps are what the eye counts.

     Tallest over the neck and shoulders and shrinking away down the tail, so the
     ridge agrees with the barrel about where the animal's mass is. */
  for (let i = 1; i < SEGS.length - 2; i++) {
    const base = pts[i];
    const along = sub(pts[i + 1], pts[i - 1]);
    const [across, up] = frame(along);
    const h = SEGS[i].r * (2.3 - 1.2 * SEGS[i].u);
    // Raked back: the tip leans toward the tail rather than standing straight up.
    const tip = add(add(base, mul(up, h)), mul(unit(along), -SEGS[i].r * 0.5));
    const root = add(base, mul(up, SEGS[i].r * 0.62));
    const w = SEGS[i].r * 0.34;
    pushPart(
      faces,
      slab(
        [
          add(root, mul(unit(along), -SEGS[i].r * 0.7)),
          add(tip, mul(across, w * 0.15)),
          add(root, mul(unit(along), SEGS[i].r * 0.7)),
          add(tip, mul(across, -w * 0.15)),
        ] as [Vec, Vec, Vec, Vec],
        mul(across, w),
      ),
      PINK,
    );
  }

  /* Head — a deep skull with a long muzzle and a separate lower JAW, angled down
     off the back of the skull.

     The jaw is the whole read. Without it the head was one smooth six-sided cone
     on the end of the neck — which is indistinguishable from more neck, and it
     was a large part of why the figure came across as a snake. A muzzle with a
     gap under it is a mouth, and a mouth is the first thing the eye looks for. */
  const nose = spineAt(-0.2, coil, wave);
  const brow = pts[0];
  const skullAxis = sub(nose, brow);
  const [skullSide, skullUp] = frame(skullAxis);
  // Deeper than the neck it sits on, which is what makes it a head rather than
  // the body's blunt end.
  const skull = ring(add(brow, mul(skullUp, 0.012)), skullAxis, 0.098, 6, Math.PI / 6);
  const muzzle = ring(add(add(brow, mul(skullAxis, 0.62)), mul(skullUp, 0.03)), skullAxis, 0.042, 6, Math.PI / 6);
  pushPart(
    faces,
    [...tube(skull, muzzle), ...tube(muzzle, add(nose, mul(skullUp, 0.035))), ...tube(skull, brow)],
    VIOLET,
  );

  // Lower jaw — hinged at the back of the skull and hanging slightly open, so
  // there is a visible wedge of shadow between it and the muzzle.
  const jawBack = add(brow, mul(skullUp, -0.05));
  const jawTip = add(add(brow, mul(skullAxis, 0.78)), mul(skullUp, -0.055));
  const jawR = ring(jawBack, sub(jawTip, jawBack), 0.045, 4);
  pushPart(faces, [...tube(jawR, jawTip), ...tube(jawR, jawBack)], PURPLE);

  /* Horns, swept back off the brow. Two pairs at slightly different rakes — a
     single pair reads as antennae, a splayed set reads as a crown, and the crown
     is the silhouette people recognise from across the row.

     Kept SHORTER than the skull is long. At 0.2 they stood taller than the head
     was deep and the figure read as antlered; horns are a crest on a head, and the
     moment they outgrow it they become the subject. */
  for (const side of [1, -1]) {
    for (const [out, up, backRake, len] of [
      [0.045, 0.055, 0.34, 0.105],
      [0.07, 0.025, 0.24, 0.07],
    ] as [number, number, number, number][]) {
      const root = add(brow, add(mul(skullSide, out * side), mul(skullUp, up)));
      const tip = add(
        root,
        add(mul(skullUp, len), add(mul(sub(brow, nose), backRake), mul(skullSide, 0.03 * side))),
      );
      const hn = ring(root, sub(tip, root), 0.014, 4);
      pushPart(faces, [...tube(hn, tip), ...tube(hn, root)], PINK);
    }
  }

  // Eyes — small, but they are what fixes which way the head is facing.
  for (const side of [1, -1]) {
    const eye = add(add(brow, mul(skullAxis, 0.3)), add(mul(skullSide, 0.066 * side), mul(skullUp, 0.046)));
    const rim = ring(eye, skullSide, 0.026, 5);
    pushPart(faces, tube(rim, add(eye, mul(skullSide, 0.02 * side))), BLUE);
  }

  // Nearest body sample to a fraction along, for hanging limbs off the spine.
  const at = (u: number) => pts[SEGS.findIndex((s) => s.u >= u)];
  const rAt = (u: number) => SEGS[SEGS.findIndex((s) => s.u >= u)].r;
  const c = Math.max(0, coil);

  /* Wings — an ARM out to a wrist, then four FINGERS fanning from it, with a
     SCALLOPED membrane spanning between them.

     This is the single biggest change from the version that read as a flappy
     snake. That one gave each wing one tapered quad: a paper fin, and two paper
     fins on a tube is a fish. What makes a wing read as a dragon's is the
     skeleton inside it, and specifically the notches — the membrane between two
     fingers hangs SLACK, dipping back toward the wrist, so the trailing edge is a
     row of scallops rather than one clean arc. Built with the membrane pulled taut
     between the finger tips the whole thing projected as a flat paddle again, and
     the fingers inside it were invisible. The notch is the read.

     `spread` is how far the wing is thrown open. It reads `coil` inverted, so
     the wings are folded against the body while it is drawn back and sweep wide
     as it lunges — driven by the same number as the spine, which is why the whole
     motion reads as one animal rather than a body with wings on their own timer.

     The wings hang off WORLD axes — chord along the body's overall run, span up
     and out to the sides — not off the spine's local frame at the shoulder. Built
     in the local frame, they broke the moment the body's arch became steep: where
     the spine runs steeply uphill its own "up" points sideways in screen space, so
     one wing swung into the plane of the picture as a single huge triangle
     covering the whole animal and the other folded flat and vanished. A wing's
     orientation belongs to the creature, not to the local slope of its neck.

     The sweep is deliberately shallow. At the 50-odd degrees this first had, the
     wings projected as two near-vertical spikes standing off the back and stopped
     reading as wings at all. */
  const shoulderAt = at(WING_AT);
  const chord: Vec = [1, 0, 0];
  const spread = 1 - 0.34 * c;
  const sweep = 20 * c;
  for (const side of [1, -1]) {
    /* Span goes mostly UP and only partly out across depth. Angled the other way
       — wide and shallow — the two wings lay along the body's own line and the
       nearer one buried the far one; raked up like this they clear the back and
       both read against the background, which is what makes them a pair. */
    const span = unit([0, 0.88, 0.62 * side] as Vec);
    /* Each wing roots on its OWN side of the spine, not both on the centreline.
       Rooted together the two wings started from one point and the near one's
       membrane covered the far one's from the shoulder outward; offset by most of
       the body's radius they diverge from the first vertex. */
    const shoulder = add(shoulderAt, [0, rAt(WING_AT) * 0.62, rAt(WING_AT) * 0.8 * side] as Vec);
    const fold = (p: Vec) => spin(p, shoulder, chord, sweep * side);

    // Arm: shoulder out to the wrist, which is where the wing breaks. Every
    // finger and every membrane panel hangs off this one point, so the whole wing
    // folds as a unit.
    const armRoot = add(shoulder, mul(chord, -0.06));
    const wrist = add(armRoot, add(mul(span, 0.34 * spread), mul(chord, -0.04)));
    /* Four fingers, fanning from forward-and-up round to back-and-down. Both the
       length and the direction change along the fan, so the wing has a leading
       edge that reaches and a trailing edge that sweeps back to the body. */
    const fingers = ([
      [0.34, -0.16],
      [0.3, 0.1],
      [0.22, 0.3],
      [0.09, 0.42],
    ] as [number, number][]).map(([up, back]) =>
      add(wrist, add(mul(span, up * spread), mul(chord, back))),
    );

    /* Membrane, one panel per gap between fingers. Each is a quad walking wrist →
       finger → NOTCH → next finger, where the notch is the slack point pulled
       back toward the wrist. Thin slabs, not flat quads — a panel with no
       thickness is culled from behind, so the wing would vanish every time the
       drag rotation carried it past edge-on. */
    for (let i = 0; i < fingers.length - 1; i++) {
      const mid = mul(add(fingers[i], fingers[i + 1]), 0.5);
      const notch = add(wrist, mul(sub(mid, wrist), 0.74));
      const q = [wrist, fingers[i], notch, fingers[i + 1]].map(fold) as [Vec, Vec, Vec, Vec];
      const mn = mul(unit(cross(sub(q[1], q[0]), sub(q[3], q[0]))), 0.008);
      // Alternating shades across the panels, so the fan reads as separate spans
      // of membrane even where two of them face the light the same way.
      pushPart(faces, slab(q, mn), i % 2 === 0 ? PURPLE : VIOLET);
    }
    /* A small tie from the last finger back down to the flank, so the wing is
       attached along the body rather than bolted on at a single point.

       It is SMALL and in the body's own palette on purpose. Drawn first as a full
       inner sail running the whole way from the arm to the hip in blue, it was the
       largest flat area in the figure and the brightest — it swallowed the far wing
       completely and read as a fish's tail fin standing behind the back. A wing's
       fingers are what the eye should be counting; anything larger than them
       competes. */
    const tq = [
      fingers[fingers.length - 1],
      add(shoulder, mul(chord, 0.26)),
      add(shoulder, mul(chord, 0.1)),
      wrist,
    ].map(fold) as [Vec, Vec, Vec, Vec];
    pushPart(
      faces,
      slab(tq, mul(unit(cross(sub(tq[1], tq[0]), sub(tq[3], tq[0]))), 0.008)),
      side > 0 ? VIOLET : PURPLE,
    );

    // The bones. The arm is thicker than the fingers, which is what makes the
    // wrist read as a joint rather than as a crease.
    const bones: [Vec, Vec, number][] = [[armRoot, wrist, 0.017]];
    for (const f of fingers) bones.push([wrist, f, 0.009]);
    for (const [a, b, t] of bones) {
      const p = fold(a);
      const q = fold(b);
      const bone = ring(p, sub(q, p), t, 4);
      pushPart(faces, [...tube(bone, q), ...tube(bone, p)], PINK);
    }
  }

  /* Four legs. The other half of why this stopped being a snake: a limbless tube
     has nothing holding it off the ground, so the eye reads it as sliding. Two
     pairs bracketing the barrel give the torso a front and a back.

     Each leg is a bent pair of tapered prisms — thigh going down and BACK, shin
     coming down and FORWARD to the foot. The bend is the point: a straight leg is
     a spike, and a spike on a tube is a fin again. Hind legs are heavier than
     fore, the way they are on anything that launches. */
  for (const [u, len, thick, back] of [
    [FORE_AT, 0.2, 0.036, 0.05],
    [HIND_AT, 0.29, 0.05, 0.09],
  ] as [number, number, number, number][]) {
    for (const side of [1, -1]) {
      const root = add(at(u), [0, -rAt(u) * 0.55, rAt(u) * 0.72 * side] as Vec);
      // Drawn up under the body while coiled, reaching down as it extends — the
      // same number the spine and the wings run on.
      const tuck = 1 - 0.3 * c;
      const knee = add(root, [back, -len * 0.58 * tuck, 0.055 * side] as Vec);
      const foot = add(knee, [-back * 1.5, -len * 0.5 * tuck, 0.02 * side] as Vec);
      const hipR = ring(root, sub(knee, root), thick, 3);
      const kneeR = ring(knee, sub(foot, knee), thick * 0.68, 3);
      pushPart(faces, tube(hipR, kneeR), VIOLET);
      pushPart(faces, [...tube(kneeR, foot), ...tube(kneeR, knee)], PURPLE);
      // A splayed foot, so the leg ends in something that could bear weight
      // rather than in a point.
      const toe = ring(foot, [0.2, -1, 0] as Vec, thick * 0.5, 3);
      pushPart(faces, [...tube(toe, add(foot, [0.06, -0.02, 0] as Vec)), ...tube(toe, foot)], PINK);
    }
  }

  /* Tail barb — a flat spade on the tip. Small, and it is the last thing to
     arrive at the end of the ripple, which is what reads as the wave running
     out of the body. */
  const tipA = pts[pts.length - 1];
  const tipB = spineAt(1.08, coil, wave);
  const barbDir = sub(tipB, tipA);
  const [barbSide] = frame(barbDir);
  pushPart(
    faces,
    slab(
      [
        // Rooted a little way BACK from the tip rather than exactly on it: the
        // spade's own root is its narrowest point, so starting it at the very end
        // of the cone left a hairline of background between the two and the barb
        // read as a separate pink box floating off the tail.
        add(sub(tipB, mul(barbDir, 0.5)), mul(barbSide, 0.012)),
        add(add(tipB, mul(barbDir, 0.9)), mul(barbSide, 0.058)),
        add(tipB, mul(barbDir, 2.2)),
        add(add(tipB, mul(barbDir, 0.9)), mul(barbSide, -0.058)),
      ],
      [0, 0.008, 0],
    ),
    PINK,
  );

  return centreOn(faces, MODEL_CENTRE);
}

/* Half-coiled at rest — the tension pose, neck arched and tail cocked but not yet
   released, so the lunge has somewhere to come FROM.

   A three-quarter angle like the lotus's and the crane's, which the arch makes
   possible: the neck's curve lives in y, so it reads at ANY yaw, and the yaw is
   free to be chosen for the wings instead. Nearly side-on the two wings lay one
   behind the other and the near one buried the far one; turned to here they
   separate across the frame and read as a pair.

   Barely pitched, for the reason the others are — looking down on it flattens the
   arch and the wings into a squiggle. */
const IDLE: Pose = { pitch: -8, yaw: 46, roll: 0, dx: 0, dy: 0, shape: { coil: 0.62, wave: 0 } };

export const dragonSpec: Spec = {
  // Sits on the same resting line as the lotus and the crane — the three are
  // side by side, so a mismatch reads as one of them floating. The reared neck
  // puts this figure's ink centre above its geometric middle.
  view: { w: 200, h: 116, centreY: 70, scale: 71 },
  // 12 body links x 12 + 6 tail tip + 10 spikes x 12 + 24 head + 8 jaw
  // + 32 horns + 10 eyes + 112 wings + 72 legs + 12 barb = 540, rounded up.
  maxFaces: 560,
  idle: IDLE,
  build: buildDragon,
  play: (pose, t, start) => {
    /* Coil, lunge, recover.

       The ripple runs for the whole animation at a constant rate, so the body is
       never rigid even while the coil itself is held — that continuous wave is
       what separates this from a model being rotated. */
    pose.shape.wave = t * Math.PI * 2 * 3;
    const DRAW = 0.3;
    const STRIKE = 0.62;
    if (t < DRAW) {
      // Draw back: tighten past the resting coil, gathering.
      const k = t / DRAW;
      pose.shape.coil = IDLE.shape.coil + (1 - IDLE.shape.coil) * k;
      pose.dy = 5 * k;
    } else if (t < STRIKE) {
      /* Strike: uncoil hard and overshoot past straight, which is the frame that
         reads as the lunge. Eased out, so it leaves fast and arrives slow. */
      const k = (t - DRAW) / (STRIKE - DRAW);
      const eased = 1 - (1 - k) ** 3;
      pose.shape.coil = 1 - 1.22 * eased;
      pose.dy = 5 - 22 * Math.sin(eased * Math.PI * 0.85);
      // Nose drops as it drives forward.
      pose.pitch = start.pitch - 12 * eased;
    } else {
      // Recover: settle back to the resting coil.
      const k = (t - STRIKE) / (1 - STRIKE);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      pose.shape.coil = -0.22 + (IDLE.shape.coil + 0.22) * eased;
      pose.dy = -22 * Math.sin((1 - k) * Math.PI * 0.5) * (1 - eased);
      pose.pitch = start.pitch - 12 * (1 - eased);
    }
    pose.yaw = start.yaw + 360 * (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    pose.roll = 9 * Math.sin(t * Math.PI * 2);
    /* Drives out and comes back, so it lands where it started. Small: this figure
       is scaled to nearly fill its band, so the lunge has only a few pixels of
       side room before the wings clip the edge. */
    pose.dx = 6 * Math.sin(t * Math.PI);
  },
  // The coil and release with the ripple, but no travel and no spin.
  playReduced: (pose, t) => {
    pose.shape.wave = t * Math.PI * 2;
    pose.shape.coil = IDLE.shape.coil - (IDLE.shape.coil + 0.2) * Math.sin(t * Math.PI);
  },
  durationMs: 3000,
  reducedMs: 1200,
  className: 'dragon-svg',
  label: 'origami dragon, drag to rotate or click to make it lunge',
};

export default function Dragon() {
  return <OrigamiFigure spec={dragonSpec} />;
}
