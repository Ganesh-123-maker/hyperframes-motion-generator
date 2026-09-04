#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import '../config/env.js';
import { validateFullPlan } from '../planner/validator';
import { generateImageAssets } from '../image/generator';

function printUsage() {
  console.log(`
HyperFrames Image Asset Pipeline CLI (Phase 3)
-----------------------------------------------
Usage:
  npm run image -- --plan <path-to-plan.json> [options]
  npm run image -- --example

Options:
  --plan <path>      Path to validated plan.json file
  --example          Use the example plan (examples/plans/example-plan.json)
  --out <dir>        Target output directory (default: ./outputs)
  --run-id <id>      Explicit run identifier
  --model <name>     Image model name (default: gpt-image-2)
  --force            Force regenerate assets (bypass cache)
  --dry-run          Use mock sample asset without calling remote LLM
  --help             Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  let planPath = '';
  let outputDir = path.join(process.cwd(), 'outputs');
  let runId: string | undefined = undefined;
  let modelName = process.env.IMAGE_MODEL || 'gpt-image-2';
  let isExample = args.includes('--example');
  let forceRegenerate = args.includes('--force');
  let isDryRun = args.includes('--dry-run');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan' && args[i + 1]) {
      planPath = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outputDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--run-id' && args[i + 1]) {
      runId = args[i + 1];
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      modelName = args[i + 1];
      i++;
    }
  }

  if (isExample && !planPath) {
    planPath = path.join(process.cwd(), 'examples', 'plans', 'example-plan.json');
  }

  if (!planPath) {
    console.error('Error: No plan specified. Use --plan <path> or --example.');
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(planPath)) {
    console.error(`Error: Plan file not found at ${planPath}`);
    process.exit(1);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
  } catch (err: any) {
    console.error(`Error: Invalid JSON in plan file ${planPath}:`, err.message);
    process.exit(1);
  }

  const validation = validateFullPlan(rawJson);
  if (!validation.ok || !validation.plan) {
    console.error(`Error: Plan validation failed:`);
    validation.errors.forEach((e) => console.error(`  - [${e.field}] ${e.message}`));
    process.exit(1);
  }

  const plan = validation.plan;

  let openaiClient;
  if (isDryRun) {
    console.log('[Dry Run Mode] Using mock asset fixture.\n');
    const sampleB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    openaiClient = {
      images: {
        generate: async () => ({ data: [{ b64_json: sampleB64 }] })
      }
    } as any;
  } else if (!process.env.OPENAI_API_KEY) {
    console.error('[FATAL] OPENAI_API_KEY is not set in environment.');
    console.error('Create a .env file in the project root with: OPENAI_API_KEY=<your key>');
    console.error('Or use --dry-run to use mock asset fixtures without an API key.');
    process.exit(1);
  }

  try {
    const manifest = await generateImageAssets(plan, {
      outputDir,
      runId,
      model: modelName,
      forceRegenerate,
      openaiClient
    });

    console.log(`\n================ Asset Manifest ================\n`);
    console.log(JSON.stringify(manifest, null, 2));
    console.log(`\n================================================\n`);
    console.log(`✓ Image pipeline completed successfully.`);
    console.log(`✓ Total assets processed: ${manifest.totalAssets}`);
  } catch (err: any) {
    console.error(`\n[ERROR] Image Pipeline Failed:`, err.message);
    process.exit(1);
  }
}

main();
