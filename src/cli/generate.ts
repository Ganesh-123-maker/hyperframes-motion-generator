#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import '../config/env.js';
import { generatePlanFromBrief } from '../planner/index.js';
import { validateFullPlan } from '../planner/validator.js';
import { runSelfVerificationLoop } from '../repair/index.js';
import { renderComposition } from '../render/index.js';

function printUsage() {
  console.log(`
HyperFrames End-to-End Motion Graphics Pipeline CLI (Phases 1-6)
----------------------------------------------------------------
Usage:
  npm run generate -- --brief "<brief text>" [options]
  npm run generate -- --file <path-to-brief.txt> [options]
  npm run generate -- --example

Options:
  --brief <text>        Plain-language video brief
  --file <path>         Path to text file containing brief
  --example             Use the standard developer platform brief
  --out <dir>           Target output directory (default: ./outputs)
  --plan-model <m>      Planning/Repair LLM model (default: gpt-5.5)
  --image-model <m>     Image model (default: gpt-image-2)
  --force-images        Force regenerate images (bypass cache)
  --max-repair <n>      Maximum repair attempts (default: 3)
  --skip-render         Skip final MP4 rendering stage
  --strict              Treat verification warnings as fatal errors
  --dry-run             Use verified reference plan without calling LLM
  --help                Show this help message
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
  let skipRender = args.includes('--skip-render');
  let isStrict = args.includes('--strict');
  let maxRepairAttempts = 3;

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
    } else if (args[i] === '--max-repair' && args[i + 1]) {
      maxRepairAttempts = parseInt(args[i + 1], 10) || 3;
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
  console.log(' HyperFrames End-to-End Generator (Plan → Repair → Render)');
  console.log('===============================================================\n');

  console.log(`[Input Brief]: "${brief.trim()}"\n`);

  let initialPlan;
  let runId = `run_${Date.now()}`;

  // 1. Initial Planning Stage
  if (isDryRun) {
    console.log('[Dry Run Mode] Using validated reference plan.\n');
    const examplePlanPath = path.join(process.cwd(), 'examples', 'plans', 'example-plan.json');
    const raw = JSON.parse(fs.readFileSync(examplePlanPath, 'utf-8'));
    const val = validateFullPlan(raw);
    if (!val.ok || !val.plan) {
      console.error('Validation failed on example plan:', val.errors);
      process.exit(1);
    }
    initialPlan = val.plan;
  } else if (!process.env.OPENAI_API_KEY) {
    console.error('[FATAL] OPENAI_API_KEY is not set in environment.');
    console.error('Create a .env file in the project root with: OPENAI_API_KEY=<your key>');
    console.error('Or use --dry-run to validate against a reference plan without an API key.');
    process.exit(1);
  } else {
    console.log(`[Stage 1/3] Generating initial structured plan with ${planModel}...`);
    try {
      const planResult = await generatePlanFromBrief(brief, {
        model: planModel,
        outputDir
      });
      initialPlan = planResult.plan;
      runId = path.basename(planResult.outputDirectory);
      console.log('✓ Initial plan generated and validated\n');
    } catch (err: any) {
      console.error('[ERROR] Initial planning failed:', err.message);
      const runDir = path.join(outputDir, runId);
      if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
      fs.writeFileSync(
        path.join(runDir, 'failure.json'),
        JSON.stringify(
          {
            stage: 'planning',
            reason: 'Initial planning generation failed',
            attempt: 0,
            artifacts: [],
            error: err.message,
            timestamp: new Date().toISOString()
          },
          null,
          2
        ),
        'utf-8'
      );
      process.exit(1);
    }
  }

  // 2. Self-Verification and Repair Loop Stage
  console.log(`[Stage 2/3] Running Self-Verification & Automated Repair Loop...\n`);

  const loopResult = await runSelfVerificationLoop(brief, initialPlan, {
    outputDir,
    runId,
    maxRepairAttempts,
    planModel,
    imageModel,
    forceImages,
    strict: isStrict,
    dryRun: isDryRun
  });

  const runDir = path.join(outputDir, runId);

  if (!loopResult.ok || !loopResult.finalCompositionDir) {
    console.error('\n===============================================================');
    console.error(' [FATAL FAILURE] Quality Gate / Repair Loop Failed');
    console.error('===============================================================');
    console.error(`Error: ${loopResult.errorMessage}`);
    console.error(`Total Attempts Executed: ${loopResult.attempts}`);
    if (loopResult.lastCheckResult?.issues) {
      console.error('\nRemaining Unresolved Issues:');
      for (const issue of loopResult.lastCheckResult.issues) {
        console.error(`  - [${issue.category.toUpperCase()}] ${issue.message}`);
      }
    }
    console.error(`\nAll attempt artifacts saved at: ${path.join(outputDir, runId, 'attempts')}`);

    fs.writeFileSync(
      path.join(runDir, 'failure.json'),
      JSON.stringify(
        {
          stage: 'validation_repair',
          reason: loopResult.errorMessage,
          attempt: loopResult.attempts,
          artifacts: [path.join(outputDir, runId, 'attempts')],
          unresolvedIssues: loopResult.lastCheckResult?.issues || [],
          timestamp: new Date().toISOString()
        },
        null,
        2
      ),
      'utf-8'
    );

    process.exit(1);
  }

  // 3. Final MP4 Render Stage
  const renderDir = path.join(runDir, 'render');
  let renderResult;

  if (skipRender) {
    console.warn('\n[Notice] Skipping MP4 render stage (--skip-render).\n');
  } else {
    console.log(`\n[Stage 3/3] Rendering verified composition to MP4 video...`);
    renderResult = await renderComposition(loopResult.finalCompositionDir, {
      outputDir: renderDir
    });

    if (!renderResult.ok || !renderResult.mp4Path) {
      console.error('\n[FATAL ERROR] Video rendering failed.');
      console.error(renderResult.errorMessage || renderResult.stderr);

      fs.writeFileSync(
        path.join(runDir, 'failure.json'),
        JSON.stringify(
          {
            stage: 'rendering',
            reason: renderResult.errorMessage || 'Rendering failed',
            attempt: loopResult.attempts,
            artifacts: [renderDir],
            error: renderResult.stderr || renderResult.errorMessage,
            timestamp: new Date().toISOString()
          },
          null,
          2
        ),
        'utf-8'
      );

      process.exit(1);
    }

    console.log(`✓ MP4 render complete: ${renderResult.mp4Path}`);
  }

  console.log('\n================ Pipeline Final Summary ================');
  console.log(`Status:            SUCCESS`);
  console.log(`Run ID:            ${runId}`);
  console.log(`Attempts Executed: ${loopResult.attempts}`);
  console.log(`Plan JSON:         ${path.join(runDir, 'plan.json')}`);
  console.log(`Composition:       ${loopResult.finalCompositionDir}`);
  console.log(`Repair History:    ${path.join(runDir, 'repair-history.json')}`);
  if (renderResult?.mp4Path) {
    console.log(`Rendered MP4:      ${renderResult.mp4Path}`);
    console.log(`File Size:         ${(renderResult.fileSizeBytes! / (1024 * 1024)).toFixed(2)} MB`);
  }
  console.log(`Duration:          ${loopResult.finalPlan.duration}s`);
  console.log(`Resolution:        ${loopResult.finalPlan.width}x${loopResult.finalPlan.height} (${loopResult.finalPlan.aspectRatio})`);
  console.log('========================================================\n');
}

main();
