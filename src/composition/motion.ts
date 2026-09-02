import { Scene, EntranceMotion, ExitMotion, AmbientMotion } from '../planner/schema';

export interface SceneMotionSpec {
  sceneId: string;
  start: number;
  duration: number;
  entrance: EntranceMotion;
  exit: ExitMotion;
  ambient: AmbientMotion;
  hasCallouts: boolean;
  hasVisual: boolean;
}

/**
 * Builds deterministic GSAP timeline JavaScript lines for a scene.
 */
export function generateSceneMotionScript(spec: SceneMotionSpec): string[] {
  const lines: string[] = [];
  const { sceneId, start, duration, entrance, exit, ambient, hasCallouts, hasVisual } = spec;

  const sceneInner = `#${sceneId}_inner`;
  const textContainer = `#${sceneId}_text`;
  const visualContainer = `#${sceneId}_visual`;
  const calloutItems = `.${sceneId}_callout`;

  const entranceDur = Math.max(0.4, Math.min(0.7, duration * 0.25));
  const exitDur = Math.max(0.3, Math.min(0.45, duration * 0.15));
  const exitStartTime = Math.max(start + entranceDur, start + duration - exitDur);

  lines.push(`  // --- Motion for Scene: ${sceneId} (${start}s - ${(start + duration).toFixed(2)}s) ---`);

  // 1. Entrance Animations
  switch (entrance) {
    case 'slide_in_left':
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: ${entranceDur}, ease: "power2.out" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: ${entranceDur}, ease: "power2.out" }, ${(start + 0.1).toFixed(3)});`);
      }
      break;

    case 'slide_in_right':
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: ${entranceDur}, ease: "power2.out" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: ${entranceDur}, ease: "power2.out" }, ${(start + 0.1).toFixed(3)});`);
      }
      break;

    case 'scale_up':
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: ${entranceDur}, ease: "back.out(1.2)" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: ${entranceDur}, ease: "back.out(1.2)" }, ${(start + 0.1).toFixed(3)});`);
      }
      break;

    case 'pop_in':
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: ${entranceDur}, ease: "elastic.out(1, 0.75)" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: ${entranceDur}, ease: "elastic.out(1, 0.75)" }, ${(start + 0.15).toFixed(3)});`);
      }
      break;

    case 'stagger_reveal':
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: ${entranceDur}, ease: "power2.out" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: ${entranceDur}, ease: "power2.out" }, ${(start + 0.15).toFixed(3)});`);
      }
      break;

    case 'fade_up':
    default:
      lines.push(`  tl.fromTo("${textContainer}", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: ${entranceDur}, ease: "power2.out" }, ${start.toFixed(3)});`);
      if (hasVisual) {
        lines.push(`  tl.fromTo("${visualContainer}", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: ${entranceDur}, ease: "power2.out" }, ${(start + 0.1).toFixed(3)});`);
      }
      break;
  }

  // 2. Callout Stagger (if present)
  if (hasCallouts) {
    const staggerStart = start + 0.2;
    lines.push(`  tl.fromTo("${calloutItems}", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out" }, ${staggerStart.toFixed(3)});`);
  }

  // 3. Ambient Motion (in mid-portion of scene)
  const ambientStart = start + entranceDur;
  const ambientDur = Math.max(0.5, exitStartTime - ambientStart);

  if (ambient === 'subtle_pulse') {
    lines.push(`  tl.to("${sceneInner}", { scale: 1.015, duration: ${(ambientDur / 2).toFixed(3)}, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${ambientStart.toFixed(3)});`);
  } else if (ambient === 'glow_shift') {
    lines.push(`  tl.to("${visualContainer}", { filter: "brightness(1.12)", duration: ${(ambientDur / 2).toFixed(3)}, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${ambientStart.toFixed(3)});`);
  } else if (ambient === 'slow_pan') {
    lines.push(`  tl.to("${visualContainer}", { y: -8, duration: ${ambientDur.toFixed(3)}, ease: "none" }, ${ambientStart.toFixed(3)});`);
  }

  // 4. Exit Animations (if not 'none' and duration allows)
  if (exit !== 'none' && duration > 1.2) {
    const boundaryTime = (start + duration).toFixed(3);
    switch (exit) {
      case 'slide_out_up':
        lines.push(`  tl.to("${sceneInner}", { opacity: 0, y: -30, duration: ${exitDur}, ease: "power2.in" }, ${exitStartTime.toFixed(3)});`);
        break;
      case 'slide_out_down':
        lines.push(`  tl.to("${sceneInner}", { opacity: 0, y: 30, duration: ${exitDur}, ease: "power2.in" }, ${exitStartTime.toFixed(3)});`);
        break;
      case 'zoom_out':
        lines.push(`  tl.to("${sceneInner}", { opacity: 0, scale: 0.93, duration: ${exitDur}, ease: "power2.in" }, ${exitStartTime.toFixed(3)});`);
        break;
      case 'fade_out':
      default:
        lines.push(`  tl.to("${sceneInner}", { opacity: 0, duration: ${exitDur}, ease: "power2.in" }, ${exitStartTime.toFixed(3)});`);
        break;
    }
    // Hard kill to prevent stale visibility state on non-linear seek
    lines.push(`  tl.set("${sceneInner}", { opacity: 0 }, ${boundaryTime});`);
  }

  return lines;
}

/**
 * Builds the complete GSAP script tag content for all scenes in a video plan.
 */
export function buildGsapTimelineScript(scenes: Scene[]): string {
  const lines: string[] = [];

  lines.push('window.__timelines = window.__timelines || {};');
  lines.push('const tl = gsap.timeline({ paused: true });');
  lines.push('');

  for (const scene of scenes) {
    const hasCallouts = Boolean(scene.text.callouts && scene.text.callouts.length > 0);
    const hasVisual = scene.visual.type !== 'typography_only';

    const motionLines = generateSceneMotionScript({
      sceneId: scene.id,
      start: scene.start,
      duration: scene.duration,
      entrance: scene.motion.entrance,
      exit: scene.motion.exit,
      ambient: scene.motion.ambient,
      hasCallouts,
      hasVisual
    });

    lines.push(...motionLines);
    lines.push('');
  }

  lines.push('window.__timelines["main"] = tl;');

  return lines.join('\n');
}
