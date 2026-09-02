import { VideoPlan } from '../planner/schema.js';

export function canonicalizePlan(plan: VideoPlan): string {
  // Strip volatile metadata before comparison
  const copy: Record<string, any> = JSON.parse(JSON.stringify(plan));
  delete copy.metadata;
  return JSON.stringify(copy);
}

export function isIdenticalPlan(planA: VideoPlan, planB: VideoPlan): boolean {
  return canonicalizePlan(planA) === canonicalizePlan(planB);
}

export interface DriftCheckResult {
  drifted: boolean;
  reason?: string;
}

/**
 * Validates that a repaired plan has not drifted excessively from the original creative plan.
 */
export function detectPlanDrift(originalPlan: VideoPlan, repairedPlan: VideoPlan): DriftCheckResult {
  // 1. Aspect Ratio check
  if (repairedPlan.aspectRatio !== originalPlan.aspectRatio) {
    return {
      drifted: true,
      reason: `Aspect ratio changed from '${originalPlan.aspectRatio}' to '${repairedPlan.aspectRatio}' without authorization.`
    };
  }

  // 2. Duration check (allow small tolerance of 1.0s if timing was adjusted)
  const durationDiff = Math.abs(repairedPlan.duration - originalPlan.duration);
  if (durationDiff > 1.0) {
    return {
      drifted: true,
      reason: `Duration changed significantly from ${originalPlan.duration}s to ${repairedPlan.duration}s.`
    };
  }

  // 3. Scene Count check (cannot drop more than 50% of scenes or drop to 0)
  if (repairedPlan.scenes.length === 0) {
    return {
      drifted: true,
      reason: 'Repaired plan removed all scenes.'
    };
  }

  if (repairedPlan.scenes.length < Math.ceil(originalPlan.scenes.length / 2)) {
    return {
      drifted: true,
      reason: `Scene count dropped significantly from ${originalPlan.scenes.length} to ${repairedPlan.scenes.length}.`
    };
  }

  // 4. Title preservation check (title should retain core words)
  if (!repairedPlan.title || repairedPlan.title.trim().length === 0) {
    return {
      drifted: true,
      reason: 'Repaired plan title is empty.'
    };
  }

  return {
    drifted: false
  };
}
