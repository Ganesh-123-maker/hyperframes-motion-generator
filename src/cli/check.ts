import path from 'path';
import fs from 'fs';
import { checkComposition, formatCheckReport, isCompositionValid } from '../checker/index.js';

function printHelp(): void {
  console.log(`
Usage: npm run check -- [options] [composition-dir]

Options:
  --example          Check the default reference example composition
  --json             Print JSON output instead of human-readable report
  --strict           Treat warnings as fatal errors
  --help             Show this help message

Examples:
  npm run check -- outputs/run_pulse_analytics_developer_plat_16x9/composition
  npm run check -- --example
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const isExample = args.includes('--example');
  const isJson = args.includes('--json');
  const isStrict = args.includes('--strict');

  let compositionDir: string | undefined;

  for (const arg of args) {
    if (!arg.startsWith('--')) {
      compositionDir = arg;
      break;
    }
  }

  if (isExample) {
    compositionDir = 'outputs/run_pulse_analytics_developer_plat_16x9/composition';
  }

  if (!compositionDir) {
    // Check if any output folder exists
    const outputsDir = path.resolve('outputs');
    if (fs.existsSync(outputsDir)) {
      const runs = fs.readdirSync(outputsDir).filter((d) => d.startsWith('run_'));
      if (runs.length > 0) {
        // pick latest run
        runs.sort().reverse();
        const latestRunComp = path.join(outputsDir, runs[0], 'composition');
        if (fs.existsSync(latestRunComp)) {
          compositionDir = latestRunComp;
        }
      }
    }
  }

  if (!compositionDir) {
    console.error('Error: Please provide a composition directory to check or use --example.');
    printHelp();
    process.exit(1);
  }

  const result = await checkComposition(compositionDir, {
    strict: isStrict,
    saveArtifact: true
  });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatCheckReport(result));
  }

  if (isCompositionValid(result)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during HyperFrames verification:', err);
  process.exit(1);
});
