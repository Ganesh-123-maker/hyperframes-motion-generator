import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateComposition } from '../src/composition/generator';
import { VideoPlan } from '../src/planner/schema';
import { resolveThemeTokens, getContrastRatio, ensureSafeTextContrast } from '../src/composition/theme';
import { computeLayoutGeometry } from '../src/composition/layout';

const TEST_OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'test_runs');

describe('HyperFrames Deterministic Composition Generator', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  const basePlan16x9: VideoPlan = {
    title: 'Test 16:9 Plan',
    duration: 10,
    fps: 30,
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    theme: {
      name: 'dark-purple',
      backgroundType: 'gradient',
      backgroundColor: '#0F172A',
      gradientEnd: '#1E1B4B',
      primaryColor: '#A855F7',
      accentColor: '#C084FC',
      textColor: '#F8FAFC',
      surfaceColor: '#1E293B',
      fontFamily: 'sans'
    },
    scenes: [
      {
        id: 'scene_1',
        start: 0,
        duration: 5,
        purpose: 'intro',
        text: {
          badge: 'NEW RELEASE',
          heading: 'Supercharge Your Code',
          subtitle: 'The modern developer workflow'
        },
        visual: {
          type: 'typography_only',
          layout: 'centered'
        },
        motion: {
          entrance: 'fade_up',
          exit: 'fade_out',
          ambient: 'subtle_pulse',
          transition: 'fade'
        }
      },
      {
        id: 'scene_2',
        start: 5,
        duration: 5,
        purpose: 'cta',
        text: {
          badge: 'GET STARTED',
          heading: 'Join Thousands Today',
          subtitle: 'Free 14-day trial'
        },
        visual: {
          type: 'cta_badge',
          layout: 'centered'
        },
        motion: {
          entrance: 'scale_up',
          exit: 'none',
          ambient: 'none',
          transition: 'fade'
        }
      }
    ],
    cta: {
      actionText: 'Get Started Now',
      subText: 'No credit card required',
      urlOrBrand: 'example.com',
      badge: 'PRO ACCESS'
    }
  };

  const verticalPlan9x16: VideoPlan = {
    title: 'Vertical 9:16 Plan',
    duration: 8,
    fps: 30,
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    theme: {
      name: 'warm-amber',
      backgroundType: 'gradient',
      backgroundColor: '#FFFBEB',
      gradientEnd: '#FEF3C7',
      primaryColor: '#B45309',
      accentColor: '#D97706',
      textColor: '#78350F',
      surfaceColor: '#FFFFFF',
      fontFamily: 'serif'
    },
    scenes: [
      {
        id: 'scene_vert_1',
        start: 0,
        duration: 4,
        purpose: 'intro',
        text: {
          badge: 'SPECIALTY COFFEE',
          heading: 'Artisanal Roasts',
          subtitle: 'Hand-crafted every morning'
        },
        visual: {
          type: 'generated_image',
          imagePrompt: 'A steaming cup of pour over coffee',
          layout: 'centered'
        },
        motion: {
          entrance: 'fade_up',
          exit: 'fade_out',
          ambient: 'subtle_pulse',
          transition: 'fade'
        }
      },
      {
        id: 'scene_vert_2',
        start: 4,
        duration: 4,
        purpose: 'cta',
        text: {
          heading: 'Visit Our Roastery',
          subtitle: 'Downtown Arts District'
        },
        visual: {
          type: 'cta_badge',
          layout: 'centered'
        },
        motion: {
          entrance: 'scale_up',
          exit: 'none',
          ambient: 'none',
          transition: 'fade'
        }
      }
    ],
    cta: {
      actionText: 'Order Ahead',
      urlOrBrand: 'artisancoffee.shop'
    }
  };

  it('generates a valid 16:9 composition with correct viewport and root dimensions', () => {
    const result = generateComposition(basePlan16x9, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_16x9'
    });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(result.indexHtmlPath)).toBe(true);
    expect(fs.existsSync(result.configPath)).toBe(true);

    const html = fs.readFileSync(result.indexHtmlPath, 'utf-8');
    expect(html).toContain('content="width=1920, height=1080"');
    expect(html).toContain('width: 1920px;');
    expect(html).toContain('height: 1080px;');
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
    expect(html).toContain('data-duration="10"');
  });

  it('generates a valid 9:16 vertical composition with correct geometry', () => {
    const result = generateComposition(verticalPlan9x16, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_9x16'
    });

    expect(result.ok).toBe(true);
    const html = fs.readFileSync(result.indexHtmlPath, 'utf-8');
    expect(html).toContain('content="width=1080, height=1920"');
    expect(html).toContain('width: 1080px;');
    expect(html).toContain('height: 1920px;');
    expect(html).toContain('data-width="1080"');
    expect(html).toContain('data-height="1920"');
    expect(html).toContain('data-duration="8"');
  });

  it('preserves scene timing and clip boundaries in the DOM and GSAP timeline', () => {
    const result = generateComposition(basePlan16x9, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_timing'
    });

    const html = fs.readFileSync(result.indexHtmlPath, 'utf-8');
    expect(html).toContain('id="scene_1" class="clip" data-start="0" data-duration="5"');
    expect(html).toContain('id="scene_2" class="clip" data-start="5" data-duration="5"');

    // Check GSAP timeline registration
    expect(html).toContain('window.__timelines["main"] = tl;');
    expect(html).toContain('tl.set("#scene_1_inner", { opacity: 0 }, 5.000);');
  });

  it('applies theme colors, typography, and contrast tokens', () => {
    const theme = basePlan16x9.theme;
    const tokens = resolveThemeTokens(theme);

    expect(tokens.fontFamilyCss).toContain('Inter');
    expect(getContrastRatio(theme.backgroundColor, tokens.textColor)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(theme.backgroundColor, tokens.textMutedColor)).toBeGreaterThanOrEqual(3.0);
  });

  it('creates deterministic placeholder image files for scenes with generated_image', () => {
    const result = generateComposition(verticalPlan9x16, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_assets'
    });

    expect(result.assets.length).toBe(1);
    expect(result.assets[0]).toBe('assets/scene_vert_1_visual.svg');

    const assetPath = path.join(result.compositionDir, 'assets', 'scene_vert_1_visual.svg');
    expect(fs.existsSync(assetPath)).toBe(true);
    const svgContent = fs.readFileSync(assetPath, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('Artisanal Roasts');
  });

  it('renders CTA block when CTA is defined in the plan', () => {
    const result = generateComposition(basePlan16x9, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_cta'
    });

    const html = fs.readFileSync(result.indexHtmlPath, 'utf-8');
    expect(html).toContain('id="cta_component"');
    expect(html).toContain('Get Started Now');
    expect(html).toContain('example.com');
    expect(html).toContain('PRO ACCESS');
  });

  it('is strictly deterministic: two generation runs from the same plan produce identical outputs', () => {
    const res1 = generateComposition(basePlan16x9, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'run_a'
    });

    const res2 = generateComposition(basePlan16x9, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'run_b'
    });

    const html1 = fs.readFileSync(res1.indexHtmlPath, 'utf-8');
    const html2 = fs.readFileSync(res2.indexHtmlPath, 'utf-8');

    expect(html1).toBe(html2);

    const config1 = fs.readFileSync(res1.configPath, 'utf-8');
    const config2 = fs.readFileSync(res2.configPath, 'utf-8');

    expect(config1).toBe(config2);
  });

  it('escapes HTML entities defensively in titles, headings, and subtitles', () => {
    const unsafePlan: VideoPlan = {
      ...basePlan16x9,
      title: 'Unsafe <script>alert(1)</script> Plan',
      scenes: [
        {
          id: 'scene_unsafe_1',
          start: 0,
          duration: 10,
          purpose: 'intro',
          text: {
            heading: 'Dangerous <b>Heading</b> & "Quotes"',
            subtitle: 'More <img src=x onerror=alert(1)>'
          },
          visual: {
            type: 'typography_only',
            layout: 'centered'
          },
          motion: {
            entrance: 'fade_up',
            exit: 'none',
            ambient: 'none',
            transition: 'fade'
          }
        }
      ]
    };

    const result = generateComposition(unsafePlan, {
      outputDir: TEST_OUTPUT_DIR,
      runId: 'test_escaped'
    });

    const html = fs.readFileSync(result.indexHtmlPath, 'utf-8');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Dangerous &lt;b&gt;Heading&lt;/b&gt; &amp; &quot;Quotes&quot;');
  });

  it('throws a descriptive error when attempting to generate from an invalid plan', () => {
    const invalidPlan = {
      ...basePlan16x9,
      duration: 10,
      scenes: [
        {
          id: 'scene_1',
          start: 0,
          duration: 6, // 6s + 6s = 12s > 10s total duration
          purpose: 'intro',
          text: { heading: 'Test' },
          visual: { type: 'typography_only', layout: 'centered' },
          motion: { entrance: 'fade_up', exit: 'none', ambient: 'none', transition: 'fade' }
        },
        {
          id: 'scene_2',
          start: 6,
          duration: 6,
          purpose: 'cta',
          text: { heading: 'Test 2' },
          visual: { type: 'typography_only', layout: 'centered' },
          motion: { entrance: 'fade_up', exit: 'none', ambient: 'none', transition: 'fade' }
        }
      ]
    };

    expect(() => generateComposition(invalidPlan as any)).toThrow(/Cannot generate composition from invalid plan/);
  });
});
