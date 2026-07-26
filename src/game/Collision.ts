import type { Obstacle } from "./constants";
import { ARENA_RADIUS } from "./constants";

export interface Point2D {
  x: number;
  z: number;
}

export function resolveCollisions(pos: Point2D, radius: number, obstacles: Obstacle[]): Point2D {
  let x = pos.x;
  let z = pos.z;

  for (const ob of obstacles) {
    const dx = x - ob.x;
    const dz = z - ob.z;
    const minDist = radius + ob.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const push = (minDist - dist) / dist;
      x += dx * push;
      z += dz * push;
    } else if (distSq <= 1e-6) {
      x += minDist;
    }
  }

  const distFromCenter = Math.sqrt(x * x + z * z);
  const maxDist = ARENA_RADIUS - radius;
  if (distFromCenter > maxDist) {
    const scale = maxDist / distFromCenter;
    x *= scale;
    z *= scale;
  }

  return { x, z };
}
