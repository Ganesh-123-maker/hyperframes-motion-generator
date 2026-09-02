import fs from 'fs';
import path from 'path';
import { VideoPlan } from '../planner/schema.js';
import { generateImageAssets } from '../image/generator.js';
import { generateComposition } from '../composition/generator.js';
import { checkComposition, isCompositionValid } from '../checker/hyperframesChecker.js';
import { formatCheckReport } from '../checker/formatter.js';
import { repairPlan } from './repair.js';
import { VerificationLoopOptions, VerificationLoopResult, RepairAttemptHistoryItem } from './types.js';
import { sanitizeOutput } from '../checker/artifact.js';
import { AssetManifest } from '../image/types.js';
import { HyperFramesCheckResult } from '../checker/types.js';

export const DEFAULT_MAX_REPAIR_ATTEMPTS = 3;

/**
 * Copies a directory recursively.
 */
function copyDirSync(src: string, dest: string) {
  if (fs.cpSync) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export async function runSelfVerificationLoop(
  brief: string,
  initialPlan: VideoPlan,
  options: VerificationLoopOptions = {}
): Promise<VerificationLoopResult> {
  const maxRepairAttempts =
    options.maxRepairAttempts ??
    (process.env.MAX_REPAIR_ATTEMPTS ? parseInt(process.env.MAX_REPAIR_ATTEMPTS, 10) : DEFAULT_MAX_REPAIR_ATTEMPTS);

  const outputDir = options.outputDir || path.join(process.cwd(), 'outputs');
  const runId = options.runId || `run_${Date.now()}`;
  const runDir = path.join(outputDir, runId);
  const attemptsDir = path.join(runDir, 'attempts');

  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }
  if (!fs.existsSync(attemptsDir)) {
    fs.mkdirSync(attemptsDir, { recursive: true });
  }

  // Save brief
  fs.writeFileSync(path.join(runDir, 'brief.txt'), brief.trim(), 'utf-8');

  let currentPlan = initialPlan;
  const repairHistory: RepairAttemptHistoryItem[] = [];
  let assetManifest: AssetManifest | undefined;
  let lastCheckResult: HyperFramesCheckResult | undefined;

  for (let attempt = 1; attempt <= maxRepairAttempts; attempt++) {
    const attemptDir = path.join(attemptsDir, `attempt-${attempt}`);
    if (!fs.existsSync(attemptDir)) {
      fs.mkdirSync(attemptDir, { recursive: true });
    }

    // 1. Save attempt plan
    const attemptPlanPath = path.join(attemptDir, 'plan.json');
    fs.writeFileSync(attemptPlanPath, JSON.stringify(currentPlan, null, 2), 'utf-8');

    console.log(`\n===============================================================`);
    console.log(` Attempt ${attempt} of ${maxRepairAttempts}`);
    console.log(`===============================================================`);

    // 2. Generate / resolve visual assets
    try {
      assetManifest = await generateImageAssets(currentPlan, {
        outputDir: runDir,
        runId,
        model: options.imageModel || 'gpt-image-2',
        forceRegenerate: options.forceImages || false,
        openaiClient: options.openaiClient
      });
    } catch (assetErr: any) {
      console.warn(`[Notice] Visual asset generation note: ${assetErr.message}`);
    }

    // 3. Generate deterministic HyperFrames composition
    console.log(`Generating composition for Attempt ${attempt}...`);
    const compResult = generateComposition(currentPlan, {
      outputDir: attemptDir,
      runId: 'comp',
      assetManifest,
      createPlaceholderAssets: true
    });
    const compDir = compResult.compositionDir;
    console.log(`✓ Composition generated at: ${compDir}`);

    // 4. Run HyperFrames quality check gate
    console.log(`Running HyperFrames quality verification gate...`);
    let checkResult: HyperFramesCheckResult;

    if (options.mockCheckResults && options.mockCheckResults[attempt - 1]) {
      checkResult = options.mockCheckResults[attempt - 1]!;
    } else {
      checkResult = await checkComposition(compDir, {
        strict: options.strict,
        saveArtifact: true,
        artifactsDir: attemptDir,
        attemptNumber: attempt,
        timeoutMs: 180000
      });
    }

    lastCheckResult = checkResult;

    // Save check.json artifact in attempt directory
    const checkJsonPath = path.join(attemptDir, 'check.json');
    fs.writeFileSync(
      checkJsonPath,
      JSON.stringify(
        {
          attempt,
          timestamp: new Date().toISOString(),
          ok: checkResult.ok,
          exitCode: checkResult.exitCode,
          summary: checkResult.summary,
          issues: checkResult.issues,
          durationMs: checkResult.durationMs
        },
        null,
        2
      ),
      'utf-8'
    );

    const historyItem: RepairAttemptHistoryItem = {
      attempt,
      status: checkResult.ok ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      durationMs: checkResult.durationMs,
      issues: checkResult.issues,
      planPath: attemptPlanPath,
      compositionDir: compDir,
      checkArtifactPath: checkJsonPath
    };

    if (checkResult.ok && isCompositionValid(checkResult)) {
      console.log(`\n✓ HyperFrames check PASSED for Attempt ${attempt}!`);
      repairHistory.push(historyItem);

      // Promote successful composition to main output directory
      const finalCompDir = path.join(runDir, 'composition');
      copyDirSync(compDir, finalCompDir);
      fs.writeFileSync(path.join(runDir, 'plan.json'), JSON.stringify(currentPlan, null, 2), 'utf-8');

      // Write repair history JSON
      const sanitizedHistory = JSON.parse(sanitizeOutput(JSON.stringify(repairHistory, null, 2)));
      fs.writeFileSync(path.join(runDir, 'repair-history.json'), JSON.stringify(sanitizedHistory, null, 2), 'utf-8');

      return {
        ok: true,
        attempts: attempt,
        finalPlan: currentPlan,
        finalCompositionDir: finalCompDir,
        repairHistory,
        assetManifest,
        lastCheckResult: checkResult
      };
    }

    // Attempt failed verification
    console.log(`\n✗ HyperFrames check FAILED for Attempt ${attempt} (${checkResult.issues.length} issue(s) found)`);
    for (const issue of checkResult.issues) {
      console.log(`  - [${issue.category.toUpperCase()}] (${issue.severity}) ${issue.message}`);
    }

    if (attempt === maxRepairAttempts) {
      repairHistory.push(historyItem);
      const sanitizedHistory = JSON.parse(sanitizeOutput(JSON.stringify(repairHistory, null, 2)));
      fs.writeFileSync(path.join(runDir, 'repair-history.json'), JSON.stringify(sanitizedHistory, null, 2), 'utf-8');

      console.error(`\n[FATAL] HyperFrames validation did not pass after ${maxRepairAttempts} repair attempts.`);
      console.error(`Attempt artifacts saved in: ${attemptsDir}`);

      return {
        ok: false,
        attempts: attempt,
        finalPlan: currentPlan,
        repairHistory,
        assetManifest,
        lastCheckResult: checkResult,
        errorMessage: `HyperFrames validation did not pass after ${maxRepairAttempts} repair attempts.`
      };
    }

    // 5. Repair Plan for next attempt
    console.log(`\nRepairing plan for next attempt...`);
    const mockRepairResponse =
      options.mockRepairResponses && options.mockRepairResponses[attempt - 1] !== undefined
        ? options.mockRepairResponses[attempt - 1]!
        : undefined;

    const repairRes = await repairPlan(initialPlan, currentPlan, checkResult.issues, {
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      model: options.planModel,
      mockResponse: mockRepairResponse
    });

    if (repairRes.ok && repairRes.repairedPlan) {
      historyItem.repaired = true;
      currentPlan = repairRes.repairedPlan;
      console.log(`✓ Repaired plan validated successfully for Attempt ${attempt + 1}`);
    } else {
      historyItem.repaired = false;
      historyItem.repairError = repairRes.error;
      console.warn(`✗ Plan repair attempt failed: ${repairRes.error}`);
    }

    repairHistory.push(historyItem);
  }

  const sanitizedHistory = JSON.parse(sanitizeOutput(JSON.stringify(repairHistory, null, 2)));
  fs.writeFileSync(path.join(runDir, 'repair-history.json'), JSON.stringify(sanitizedHistory, null, 2), 'utf-8');

  return {
    ok: false,
    attempts: maxRepairAttempts,
    finalPlan: currentPlan,
    repairHistory,
    assetManifest,
    lastCheckResult,
    errorMessage: `HyperFrames validation did not pass after ${maxRepairAttempts} repair attempts.`
  };
}
