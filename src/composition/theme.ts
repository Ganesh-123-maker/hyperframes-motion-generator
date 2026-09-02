import { ThemeConfig } from '../planner/schema';
import { ThemeResolvedTokens } from './types';

/**
 * Parses a 6-digit hex color string into RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) || 0;
  const g = parseInt(sanitized.substring(2, 4), 16) || 0;
  const b = parseInt(sanitized.substring(4, 6), 16) || 0;
  return { r, g, b };
}

/**
 * Converts RGB components to hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG 2.1 relative luminance for a given hex color.
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (val: number) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Computes contrast ratio between two hex colors (returns value between 1.0 and 21.0).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Resolves safe, high-contrast text color against a given background.
 */
export function ensureSafeTextContrast(bgHex: string, desiredTextHex: string, minRatio = 4.5): string {
  const ratio = getContrastRatio(bgHex, desiredTextHex);
  if (ratio >= minRatio) {
    return desiredTextHex;
  }
  const bgLum = getRelativeLuminance(bgHex);
  // If background is dark, use crisp light text; otherwise crisp dark text
  return bgLum < 0.5 ? '#F8FAFC' : '#0F172A';
}

/**
 * Defensively adjusts a hex color towards black or white until it satisfies minRatio contrast against bgHex.
 */
export function adjustColorForContrast(bgHex: string, desiredColorHex: string, minRatio = 4.5): string {
  if (getContrastRatio(bgHex, desiredColorHex) >= minRatio) {
    return desiredColorHex;
  }

  const bgLum = getRelativeLuminance(bgHex);
  const isBgLight = bgLum >= 0.4;
  let { r, g, b } = hexToRgb(desiredColorHex);

  // Perform up to 20 progressive steps
  for (let i = 0; i < 20; i++) {
    if (isBgLight) {
      // Darken towards black
      r = Math.floor(r * 0.88);
      g = Math.floor(g * 0.88);
      b = Math.floor(b * 0.88);
    } else {
      // Lighten towards white
      r = Math.min(255, Math.ceil(r + (255 - r) * 0.15));
      g = Math.min(255, Math.ceil(g + (255 - g) * 0.15));
      b = Math.min(255, Math.ceil(b + (255 - b) * 0.15));
    }

    const testHex = rgbToHex(r, g, b);
    if (getContrastRatio(bgHex, testHex) >= minRatio) {
      return testHex;
    }
  }

  // Fallback if extreme
  return isBgLight ? '#0F172A' : '#F8FAFC';
}

/**
 * Resolves safe secondary/muted text color.
 */
export function getMutedTextColor(bgHex: string): string {
  const bgLum = getRelativeLuminance(bgHex);
  return bgLum < 0.5 ? '#94A3B8' : '#475569';
}

/**
 * Resolves full CSS theme tokens from the ThemeConfig with guaranteed WCAG AA contrast.
 */
export function resolveThemeTokens(theme: ThemeConfig): ThemeResolvedTokens {
  const bgHex = theme.backgroundColor;
  const gradientEnd = theme.gradientEnd || bgHex;
  const isDark = getRelativeLuminance(bgHex) < 0.5;

  let backgroundCss = bgHex;
  if (theme.backgroundType === 'gradient') {
    backgroundCss = `linear-gradient(135deg, ${bgHex} 0%, ${gradientEnd} 100%)`;
  } else if (theme.backgroundType === 'mesh') {
    backgroundCss = `radial-gradient(at 0% 0%, ${theme.primaryColor}22 0px, transparent 50%), radial-gradient(at 100% 100%, ${theme.accentColor}22 0px, transparent 50%), ${bgHex}`;
  }

  const safeTextColor = ensureSafeTextContrast(bgHex, theme.textColor, 4.5);
  const textMutedColor = getMutedTextColor(bgHex);

  const surfaceHex = theme.surfaceColor || (isDark ? '#1E293B' : '#FFFFFF');
  const surfaceBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  let fontFamilyCss = '"Inter", sans-serif';
  if (theme.fontFamily === 'mono') {
    fontFamilyCss = '"JetBrains Mono", monospace';
  } else if (theme.fontFamily === 'serif') {
    fontFamilyCss = '"Playfair Display", Georgia, serif';
  }

  // Ensure primary and accent colors meet contrast requirements against the background when used as text/accents
  const contrastSafePrimary = adjustColorForContrast(bgHex, theme.primaryColor, 4.5);
  const contrastSafeAccent = adjustColorForContrast(bgHex, theme.accentColor, 4.5);

  // Badge button contrast
  const badgeBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const badgeText = contrastSafePrimary;

  // CTA button styling
  const ctaBtnBg = theme.primaryColor;
  const ctaBtnText = ensureSafeTextContrast(ctaBtnBg, '#FFFFFF', 4.5);

  return {
    backgroundCss,
    surfaceCss: surfaceHex,
    surfaceBorderCss: surfaceBorder,
    textColor: safeTextColor,
    textMutedColor,
    primaryColor: contrastSafePrimary,
    accentColor: contrastSafeAccent,
    fontFamilyCss,
    badgeBgCss: badgeBg,
    badgeTextCss: badgeText,
    ctaButtonBgCss: ctaBtnBg,
    ctaButtonTextCss: ctaBtnText
  };
}
