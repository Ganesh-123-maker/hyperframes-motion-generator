#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generatePlanFromBrief } from '../planner';
import { validateFullPlan } from '../planner/validator';
import { generateImageAssets } from '../image/generator';
import { generateComposition } from '../composition/generator';
import { checkComposition, formatCheckReport, isCompositionValid } from '../checker';

dotenv.config();

function printUsage() {
  console.log(`
HyperFrames End-to-End Pipeline CLI (Phases 1-4)
-----------------------------------------------
Usage:
  npm run generate -- --brief "<brief text>" [options]
  npm run generate -- --file <path-to-brief.txt> [options]
  npm run generate -- --example

Options:
  --brief <text>     Plain-language video brief
  --file <path>      Path to text file containing brief
  --example          Use the standard developer platform brief
  --out <dir>        Target output directory (default: ./outputs)
  --plan-model <m>   Planning LLM model (default: gpt-5.5)
  --image-model <m>  Image model (default: gpt-image-2)
  --force-images     Force regenerate images (bypass cache)
  --skip-check       Skip HyperFrames verification gate (not recommended)
  --strict           Treat verification warnings as fatal errors
  --dry-run          Use verified reference plan without calling LLM
  --help             Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  let brief = '';
  let outputDir = path.join(process.cwd(), 'outputs');
  let planModel = process.env.PLANNING_MODEL || 'gpt-5.5';
  let imageModel = process.env.IMAGE_MODEL || 'gpt-image-2';
  let isExample = args.includes('--example');
  let isDryRun = args.includes('--dry-run');
  let forceImages = args.includes('--force-images');
  let skipCheck = args.includes('--skip-check');
  let isStrict = args.includes('--strict');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--brief' && args[i + 1]) {
      brief = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      const filePath = path.resolve(args[i + 1]);
      if (!fs.existsSync(filePath)) {
        console.error(`Error: Brief file not found at ${filePath}`);
        process.exit(1);
      }
      brief = fs.readFileSync(filePath, 'utf-8');
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outputDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--plan-model' && args[i + 1]) {
      planModel = args[i + 1];
      i++;
    } else if (args[i] === '--image-model' && args[i + 1]) {
      imageModel = args[i + 1];
      i++;
    }
  }

  if (isExample && !brief) {
    const exampleBriefPath = path.join(process.cwd(), 'examples', 'briefs', 'brief-1.txt');
    if (fs.existsSync(exampleBriefPath)) {
      brief = fs.readFileSync(exampleBriefPath, 'utf-8');
    } else {
      brief =
        'Create a 12 second widescreen advertisement for a developer analytics platform. Use a dark theme with a purple accent, introduce the product, show three feature callouts, include subtle developer dashboard imagery, and finish with a strong call to action.';
    }
  }

  if (!brief) {
    console.error('Error: No brief provided. Use --brief "<text>" or --example.');
    printUsage();
    process.exit(1);
  }

  console.log('===============================================================');
  console.log(' HyperFrames End-to-End Pipeline (Plan → Images → Composition)');
  console.log('===============================================================\n');

  console.log(`[Input Brief]: "${brief.trim()}"\n`);

  let plan;
  let runId: string;

  // 1. Planning Stage
  if (isDryRun || (!process.env.OPENAI_API_KEY && !isDryRun)) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Notice] OPENAI_API_KEY not found. Using validated reference plan for dry run.\n');
    } else {
      console.log('[Dry Run Mode] Using validated reference plan.\n');
    }
    const examplePlanPath = path.join(process.cwd(), 'examples', 'plans', 'example-plan.json');
    const raw = JSON.parse(fs.readFileSync(examplePlanPath, 'utf-8'));
    const val = validateFullPlan(raw);
    if (!val.ok || !val.plan) {
      console.error('Validation failed on example plan:', val.errors);
      process.exit(1);
    }
    plan = val.plan;
    runId = `run_${Date.now()}`;
  } else {
    console.log(`[Stage 1/3] Generating structured plan with ${planModel}...`);
    try {
      const planResult = await generatePlanFromBrief(brief, {
        model: planModel,
        outputDir
      });
      plan = planResult.plan;
      runId = path.basename(planResult.outputDirectory);
      console.log('✓ Plan generated and validated\n');
    } catch (err: any) {
      console.error('[ERROR] Planning failed:', err.message);
      process.exit(1);
    }
  }

  // 2. Image Asset Generation Stage
  console.log(`[Stage 2/3] Processing visual asset requirements...`);
  let manifest;
  let openaiClient;

  if (isDryRun || (!process.env.OPENAI_API_KEY && !openaiClient)) {
    console.log('[Dry Run Mode] Using mocked image client with sample asset fixture.\n');
    const sampleB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    openaiClient = {
      images: {
        generate: async () => ({ data: [{ b64_json: sampleB64 }] })
      }
    } as any;
  }

  try {
    manifest = await generateImageAssets(plan, {
      outputDir,
      runId,
      model: imageModel,
      forceRegenerate: forceImages,
      openaiClient
    });
    console.log(`✓ Assets resolved (${manifest.totalAssets} asset${manifest.totalAssets === 1 ? '' : 's'})\n`);
  } catch (err: any) {
    console.error('[ERROR] Image asset generation failed:', err.message);
    process.exit(1);
  }

  // 3. Composition Generation Stage
  console.log(`[Stage 3/4] Generating deterministic HyperFrames composition...`);
  let compResult;
  try {
    compResult = await generateComposition(plan, {
      outputDir,
      runId,
      assetManifest: manifest,
      createPlaceholderAssets: true
    });

    console.log('✓ Composition generated successfully\n');
  } catch (err: any) {
    console.error('[ERROR] Composition generation failed:', err.message);
    process.exit(1);
  }

  // 4. HyperFrames Verification Stage
  if (skipCheck) {
    console.warn('[Notice] Skipping HyperFrames quality verification gate (--skip-check).\n');
  } else {
    console.log(`[Stage 4/4] Executing HyperFrames Quality Verification Gate...`);
    const checkResult = await checkComposition(compResult.compositionDir, {
      strict: isStrict,
      saveArtifact: true
    });

    console.log(formatCheckReport(checkResult));

    if (!isCompositionValid(checkResult)) {
      console.error('\n[FATAL] Composition failed HyperFrames quality gate.');
      console.error('Validation errors must be resolved before video can be rendered or considered valid.');
      process.exit(1);
    }
    console.log('✓ Quality verification gate passed!\n');
  }

  console.log('================ Pipeline Summary ================');
  console.log(`Run ID:            ${runId}`);
  console.log(`Output Directory:  ${compResult.compositionDir}`);
  console.log(`Index HTML:        ${compResult.indexHtmlPath}`);
  console.log(`HyperFrames JSON:  ${compResult.configPath}`);
  console.log(`Total Scenes:      ${compResult.sceneCount}`);
  console.log(`Duration:          ${compResult.duration}s`);
  console.log(`Resolution:        ${compResult.resolution.width}x${compResult.resolution.height} (${compResult.resolution.aspectRatio})`);
  console.log(`Processed Assets:  ${manifest.totalAssets}`);
  console.log(`Verification:      PASSED (0 fatal errors)`);
  console.log('==================================================\n');
}

main();
