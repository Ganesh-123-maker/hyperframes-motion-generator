import { AspectRatio } from '../planner/schema';
import { LayoutGeometry } from './types';

/**
 * Computes deterministic layout geometry and typography scales based on aspect ratio and dimensions.
 */
export function computeLayoutGeometry(width: number, height: number, aspectRatio: AspectRatio): LayoutGeometry {
  const isVertical = aspectRatio === '9:16' || height > width;
  const isSquare = aspectRatio === '1:1' || width === height;
  const isWidescreen = aspectRatio === '16:9' || (!isVertical && !isSquare);

  if (isVertical) {
    // 9:16 (e.g. 1080x1920)
    return {
      width,
      height,
      aspectRatio: '9:16',
      padding: {
        top: 140,
        bottom: 140,
        left: 80,
        right: 80
      },
      typography: {
        headingSize: 68,
        subtitleSize: 32,
        badgeSize: 22,
        bodySize: 26,
        ctaSize: 34,
        lineHeight: 1.3
      },
      maxContentWidth: 920,
      cardMaxWidth: 920,
      imageMaxHeight: 640,
      isVertical: true,
      isSquare: false,
      isWidescreen: false
    };
  }

  if (isSquare) {
    // 1:1 (e.g. 1080x1080)
    return {
      width,
      height,
      aspectRatio: '1:1',
      padding: {
        top: 80,
        bottom: 80,
        left: 80,
        right: 80
      },
      typography: {
        headingSize: 56,
        subtitleSize: 26,
        badgeSize: 18,
        bodySize: 22,
        ctaSize: 28,
        lineHeight: 1.35
      },
      maxContentWidth: 920,
      cardMaxWidth: 880,
      imageMaxHeight: 420,
      isVertical: false,
      isSquare: true,
      isWidescreen: false
    };
  }

  // 16:9 Widescreen (e.g. 1920x1080)
  return {
    width,
    height,
    aspectRatio: '16:9',
    padding: {
      top: 100,
      bottom: 100,
      left: 140,
      right: 140
    },
    typography: {
      headingSize: 64,
      subtitleSize: 28,
      badgeSize: 20,
      bodySize: 24,
      ctaSize: 32,
      lineHeight: 1.3
    },
    maxContentWidth: 1640,
    cardMaxWidth: 760,
    imageMaxHeight: 520,
    isVertical: false,
    isSquare: false,
    isWidescreen: true
  };
}
