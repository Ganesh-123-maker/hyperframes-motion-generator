import { VideoPlan } from '../planner/schema.js';
import { NormalizedIssue } from '../checker/types.js';
import { validateFullPlan } from '../planner/validator.js';
import { extractJsonFromResponse, getOpenAIClient } from '../planner/planner.js';
import { REPAIR_SYSTEM_PROMPT, buildRepairUserPrompt } from './prompt.js';
import { isIdenticalPlan, detectPlanDrift } from './drift.js';
import { RepairOptions, RepairResult } from './types.js';
import { sanitizeOutput } from '../checker/artifact.js';

export async function repairPlan(
  originalPlan: VideoPlan,
  currentPlan: VideoPlan,
  issues: NormalizedIssue[],
  options: RepairOptions = {}
): Promise<RepairResult> {
  const model = options.model || process.env.PLANNING_MODEL || 'gpt-5.5';
  const timeoutMs = options.timeoutMs || 120000;
  const seed = options.seed ?? 42;

  const userPrompt = buildRepairUserPrompt(originalPlan, currentPlan, issues);

  let rawResponseContent = '';

  if (options.mockResponse) {
    rawResponseContent = options.mockResponse;
  } else if (!process.env.OPENAI_API_KEY && !options.apiKey) {
    return {
      ok: false,
      error: 'OPENAI_API_KEY is not configured. Cannot repair plan without an API key. ' +
        'Set OPENAI_API_KEY in your .env file or pass apiKey in options.'
    };
  } else {
    try {
      const client = getOpenAIClient(options.apiKey, options.baseURL);
      const response = await client.chat.completions.create(
        {
          model: model,
          messages: [
            { role: 'system', content: REPAIR_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          seed: seed,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        },
        { timeout: timeoutMs }
      );

      const choice = response.choices?.[0];
      if (!choice || !choice.message?.content) {
        return {
          ok: false,
          error: 'LLM repair request returned an empty completion content.'
        };
      }
      rawResponseContent = choice.message.content;
    } catch (err: any) {
      return {
        ok: false,
        error: `LLM repair API call failed: ${err.message || String(err)}`
      };
    }
  }

  const sanitizedRawResponse = sanitizeOutput(rawResponseContent, options.additionalSecretPatterns);

  // 1. JSON Parsing Check
  let parsedJson: unknown;
  try {
    const jsonString = extractJsonFromResponse(sanitizedRawResponse);
    parsedJson = JSON.parse(jsonString);
  } catch (parseErr: any) {
    return {
      ok: false,
      rawResponse: sanitizedRawResponse,
      error: `Repair model returned malformed JSON syntax: ${parseErr.message}`
    };
  }

  // 2. Schema and Semantic Validation
  const valResult = validateFullPlan(parsedJson);
  if (!valResult.ok || !valResult.plan) {
    const errorSummary = valResult.errors.map((e) => `[${e.field}] ${e.message}`).join('; ');
    return {
      ok: false,
      rawResponse: sanitizedRawResponse,
      error: `Repaired plan failed schema/semantic validation: ${errorSummary}`
    };
  }

  const repairedPlan = valResult.plan;

  // Preserve metadata trace
  repairedPlan.metadata = {
    ...currentPlan.metadata,
    repairedAt: new Date().toISOString(),
    repairModel: model
  };

  // 3. Identical Plan Detection
  if (isIdenticalPlan(currentPlan, repairedPlan)) {
    return {
      ok: false,
      rawResponse: sanitizedRawResponse,
      isIdenticalPlan: true,
      error: 'Repair model produced an identical plan without fixing reported issues.'
    };
  }

  // 4. Drift Prevention Check
  const driftResult = detectPlanDrift(originalPlan, repairedPlan);
  if (driftResult.drifted) {
    return {
      ok: false,
      rawResponse: sanitizedRawResponse,
      driftDetected: true,
      driftMessage: driftResult.reason,
      error: `Repaired plan exhibits unauthorized creative drift: ${driftResult.reason}`
    };
  }

  return {
    ok: true,
    repairedPlan,
    rawResponse: sanitizedRawResponse
  };
}
