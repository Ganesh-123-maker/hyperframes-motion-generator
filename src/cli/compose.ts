#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generateComposition } from '../composition/generator';
import { validateFullPlan } from '../planner/validator';

dotenv.config();

function printUsage() {
  console.log(`
HyperFrames Composition Generator CLI (Phase 2)
-----------------------------------------------
Usage:
  npm run compose -- --plan <path-to-plan.json> [options]
  npm run compose -- --example

Options:
  --plan <path>      Path to validated plan.json file
  --example          Use the example plan (examples/plans/example-plan.json)
  --out <dir>        Target output directory (default: ./outputs)
  --run-id <id>      Explicit run identifier
  --no-placeholders  Skip generating deterministic SVG image placeholders
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
  let isExample = args.includes('--example');
  let createPlaceholders = !args.includes('--no-placeholders');

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
  const planFileName = path.basename(planPath);

  console.log('## Composition generation\n');
  console.log(`Plan:         ${planFileName}`);
  console.log(`Aspect ratio: ${plan.aspectRatio}`);
  console.log(`Resolution:   ${plan.width}x${plan.height}`);
  console.log(`Scenes:       ${plan.scenes.length}`);
  console.log(`Duration:     ${plan.duration}s`);

  try {
    const result = await generateComposition(plan, {
      outputDir,
      runId,
      createPlaceholderAssets: createPlaceholders
    });

    console.log('\n✓ Composition generated');
    console.log('✓ Deterministic IDs generated');
    console.log('✓ Scene timing validated');
    console.log(`✓ Assets referenced (${result.assets.length} image asset${result.assets.length === 1 ? '' : 's'})`);
    console.log(`\nOutput:\n${result.compositionDir}\n`);
  } catch (err: any) {
    console.error('\n[ERROR] Composition Generation Failed:', err.message);
    process.exit(1);
  }
}

main();
