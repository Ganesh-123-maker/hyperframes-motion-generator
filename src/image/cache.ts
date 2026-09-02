import fs from 'fs';
import { computeBufferSha256 } from './decoder';

export interface CacheCheckResult {
  isCached: boolean;
  sizeBytes: number;
  sha256?: string;
  reason?: string;
}

/**
 * Checks whether an asset is already present and valid on disk.
 */
export function checkAssetCache(filePath: string): CacheCheckResult {
  if (!fs.existsSync(filePath)) {
    return { isCached: false, sizeBytes: 0, reason: 'file_not_found' };
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { isCached: false, sizeBytes: 0, reason: 'empty_file' };
    }

    const buffer = fs.readFileSync(filePath);
    const sha256 = computeBufferSha256(buffer);

    return {
      isCached: true,
      sizeBytes: stat.size,
      sha256
    };
  } catch (err: any) {
    return { isCached: false, sizeBytes: 0, reason: `read_error: ${err.message}` };
  }
}
