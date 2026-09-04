import OpenAI from 'openai';

export interface ImageApiCallOptions {
  model?: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024' | string;
  timeoutMs?: number;
}

/**
 * Safely initializes an OpenAI client for gpt-image-2 with lazy resolution of environment variables.
 */
export function getOpenAIImageClient(apiKey?: string, baseURL?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  const url = baseURL || process.env.OPENAI_BASE_URL || 'https://llm.ganeshnayak.in/v1';

  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your environment or provide it in options.'
    );
  }

  return new OpenAI({
    apiKey: key,
    baseURL: url
  });
}

/**
 * Invokes gpt-image-2 using the OpenAI SDK images.generate API.
 * The endpoint returns base64 image data in response.data[0].b64_json.
 */
export async function callGptImage2(
  client: OpenAI,
  prompt: string,
  options: ImageApiCallOptions = {}
): Promise<string> {
  const model = options.model || process.env.IMAGE_MODEL || 'gpt-image-2';
  const timeoutMs = options.timeoutMs || 180000;
  const size = options.size || '1024x1024';

  try {
    const response = await client.images.generate(
      {
        model: model,
        prompt: prompt,
        n: 1,
        size: size as any,
        response_format: 'b64_json'
      },
      { timeout: timeoutMs }
    );

    if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`LLM Image Gateway returned an empty response array.`);
    }

    const imageObj = response.data[0];
    if (!imageObj) {
      throw new Error(`LLM Image Gateway returned a null image object.`);
    }

    if (!imageObj.b64_json || typeof imageObj.b64_json !== 'string' || imageObj.b64_json.trim().length === 0) {
      if (imageObj.url) {
        throw new Error(
          `Unexpected image response format: received URL instead of requested b64_json.`
        );
      }
      throw new Error(`Image API returned an empty or missing b64_json field.`);
    }

    return imageObj.b64_json;
  } catch (err: any) {
    // Sanitize any potential error output to prevent credential leaking
    if (err.name === 'APIConnectionTimeoutError' || err.code === 'ETIMEDOUT') {
      throw new Error(`Image generation request timed out after ${timeoutMs}ms.`);
    }
    if (err.status === 401) {
      throw new Error(`Image Gateway authentication failed (401). Check OPENAI_API_KEY.`);
    }
    if (err.status === 404) {
      throw new Error(`Image Model '${model}' or endpoint not found (404).`);
    }
    if (err.status === 429) {
      throw new Error(`Image Gateway rate limit exceeded (429).`);
    }
    throw new Error(`Image API call failed: ${err.message || String(err)}`);
  }
}
