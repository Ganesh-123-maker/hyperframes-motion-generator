import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { RenderOptions, RenderResult, RenderMetadata } from './types.js';
import { sanitizeOutput } from '../checker/artifact.js';

/**
 * Renders a verified HyperFrames composition into a final MP4 video file.
 */
export async function renderComposition(
  compositionDirectory: string,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const startTime = Date.now();
  const absoluteCompDir = path.resolve(compositionDirectory);
  const timeoutMs = options.timeoutMs ?? 300000; // 5 minute default render timeout

  if (!fs.existsSync(absoluteCompDir)) {
    return {
      ok: false,
      exitCode: 1,
      rawOutput: '',
      stderr: `Composition directory not found: ${absoluteCompDir}`,
      hasFatalProcessError: true,
      errorMessage: `Composition directory not found: ${absoluteCompDir}`
    };
  }

  const renderDir = options.outputDir || path.join(path.dirname(absoluteCompDir), 'render');
  if (!fs.existsSync(renderDir)) {
    fs.mkdirSync(renderDir, { recursive: true });
  }

  const mp4FileName = options.outputFileName || 'render.mp4';
  const targetMp4Path = path.join(renderDir, mp4FileName);

  const executable = options.customExecutable || 'npx';
  const args = options.customArgs || ['hyperframes', 'render', absoluteCompDir, '--output', targetMp4Path];

  // Dynamically attempt resolution of ffmpeg-static and ffprobe-static binaries
  let customPath = process.env.PATH || '';
  try {
    // @ts-ignore
    const ffmpegModule = await import('ffmpeg-static');
    const ffmpegPath = ffmpegModule.default || (ffmpegModule as any);
    if (ffmpegPath && typeof ffmpegPath === 'string') {
      const ffmpegDir = path.dirname(ffmpegPath);
      customPath = `${ffmpegDir}${path.delimiter}${customPath}`;
    }
  } catch {}

  try {
    // @ts-ignore
    const ffprobeModule = await import('ffprobe-static');
    const ffprobePath = ffprobeModule.path || (ffprobeModule as any).path;
    if (ffprobePath && typeof ffprobePath === 'string') {
      const ffprobeDir = path.dirname(ffprobePath);
      customPath = `${ffprobeDir}${path.delimiter}${customPath}`;
    }
  } catch {}

  return new Promise<RenderResult>((resolve) => {
    execFile(
      executable,
      args,
      {
        cwd: process.cwd(),
        shell: true,
        timeout: timeoutMs,
        maxBuffer: 25 * 1024 * 1024, // 25 MB
        env: {
          ...process.env,
          PATH: customPath,
          NODE_ENV: 'production'
        }
      },
      (error, stdout, stderr) => {
        const renderDurationMs = Date.now() - startTime;
        const rawOutput = stdout ? stdout.toString() : '';
        const rawStderr = stderr ? stderr.toString() : '';
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

        const sanitizedStdout = sanitizeOutput(rawOutput, options.additionalSecretPatterns);
        const sanitizedStderr = sanitizeOutput(rawStderr, options.additionalSecretPatterns);

        // Save render log
        const renderLogPath = path.join(renderDir, 'render.log');
        fs.writeFileSync(renderLogPath, `${sanitizedStdout}\n${sanitizedStderr}`.trim(), 'utf-8');

        // Verify output file existence and non-zero size
        const mp4Exists = fs.existsSync(targetMp4Path);
        const stat = mp4Exists ? fs.statSync(targetMp4Path) : null;
        const fileSizeBytes = stat ? stat.size : 0;
        const isNonEmptyMp4 = mp4Exists && fileSizeBytes > 0;

        const ok = exitCode === 0 && isNonEmptyMp4;

        const metadata: RenderMetadata = {
          timestamp: new Date().toISOString(),
          compositionDir: absoluteCompDir,
          mp4Path: targetMp4Path,
          fileSizeBytes,
          renderDurationMs,
          exitCode,
          ok
        };

        const metaPath = path.join(renderDir, 'metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

        if (!isNonEmptyMp4) {
          resolve({
            ok: false,
            exitCode: exitCode || 1,
            rawOutput: sanitizedStdout,
            stderr: sanitizedStderr,
            hasFatalProcessError: true,
            errorMessage: `Rendering failed: MP4 file missing or 0 bytes at ${targetMp4Path}`
          });
          return;
        }

        resolve({
          ok: true,
          exitCode: 0,
          mp4Path: targetMp4Path,
          fileSizeBytes,
          rawOutput: sanitizedStdout,
          stderr: sanitizedStderr,
          hasFatalProcessError: false
        });
      }
    );
  });
}
