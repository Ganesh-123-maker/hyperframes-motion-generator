import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

let isConfigured = false;

export function loadEnvironment(): void {
  if (isConfigured) return;

  const dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

  const candidatePaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'hyperframes-motion-generator', '.env'),
    path.resolve(dirname, '../../.env'),
    path.resolve(dirname, '../../../.env'),
    path.resolve(dirname, '../.env')
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }

  // Set default models and base URL if not set
  if (!process.env.OPENAI_BASE_URL) {
    process.env.OPENAI_BASE_URL = 'https://llm.ganeshnayak.in/v1';
  }
  if (!process.env.PLANNING_MODEL) {
    process.env.PLANNING_MODEL = 'gpt-5.5';
  }
  if (!process.env.IMAGE_MODEL) {
    process.env.IMAGE_MODEL = 'gpt-image-2';
  }

  isConfigured = true;
}

// Auto-run on import
loadEnvironment();
