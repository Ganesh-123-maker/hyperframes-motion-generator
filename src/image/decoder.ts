import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Validates and decodes a base64 string from gpt-image-2 response into a binary Buffer.
 */
export function decodeBase64Image(b64String: unknown): Buffer {
  if (typeof b64String !== 'string') {
    throw new Error('Image response decoding failed: b64_json is not a string');
  }

  const trimmed = b64String.trim();
  if (trimmed.length === 0) {
    throw new Error('Image response decoding failed: b64_json is empty');
  }

  // Strip data URI prefix if present (e.g., "data:image/png;base64,...")
  const cleanB64 = trimmed.replace(/^data:image\/[a-zA-Z0-9+-]+;base64,/, '').replace(/\s+/g, '');

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanB64, 'base64');
  } catch (err: any) {
    throw new Error(`Failed to decode base64 image data: ${err.message}`);
  }

  if (buffer.length === 0) {
    throw new Error('Decoded image buffer is 0 bytes. Invalid or corrupted base64 data.');
  }

  return buffer;
}

/**
 * Computes SHA-256 hash of a buffer.
 */
export function computeBufferSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Writes image buffer to disk safely, verifying file existence and non-zero size.
 */
export function writeImageFileSafely(
  filePath: string,
  buffer: Buffer
): { sizeBytes: number; sha256: string } {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);

  // Validate on disk
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image write validation failed: file does not exist at ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
    throw new Error(`Image write validation failed: file written to ${filePath} is 0 bytes`);
  }

  const sha256 = computeBufferSha256(buffer);
  return {
    sizeBytes: stat.size,
    sha256
  };
}
