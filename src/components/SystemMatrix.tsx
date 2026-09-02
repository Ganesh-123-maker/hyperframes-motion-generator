import React from 'react';
import { 
  CheckCircle2, 
  Cpu, 
  HardDrive, 
  Layers, 
  Terminal, 
  Zap, 
  Check, 
  Server,
  Globe
} from 'lucide-react';
import { SystemMetric } from '../types';

export const SystemMatrix: React.FC = () => {
  const metrics: SystemMetric[] = [
    { label: 'Node.js Runtime', value: 'v22.23.2 (Linux x64)', status: 'verified', detail: 'ESM / CJS Native Support' },
    { label: 'npm Package Manager', value: '10.9.8', status: 'verified', detail: 'Clean dependency resolution' },
    { label: 'HyperFrames CLI', value: '0.8.25 (Latest)', status: 'verified', detail: 'HeyGen official core build' },
    { label: 'Chrome Headless Shell', value: '152.0.7977.30', status: 'verified', detail: 'Installed at /root/.cache/hyperframes' },
    { label: 'FFmpeg / FFprobe', value: '4.4.2-0ubuntu0.22.04.1', status: 'verified', detail: 'Installed at /usr/bin/ffmpeg' },
    { label: 'CGroup Memory Ceiling', value: '4096 MiB (4 GB)', status: 'verified', detail: '2 CPU Cores · Low-memory aware' },
    { label: 'LLM Gateway Base URL', value: 'https://llm.ganeshnayak.in/v1', status: 'verified', detail: 'OpenAI-Compatible endpoint' },
    { label: 'Planning Model', value: 'gpt-5.5', status: 'verified', detail: 'Structured JSON planning' },
    { label: 'Image Model', value: 'gpt-image-2', status: 'verified', detail: 'Visual assets generation' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Environment & System Diagnostics Baseline
          </h2>
        </div>
        <p className="text-xs text-slate-600">
          Empirically verified during Phase 0 reconnaissance. All dependencies and binaries are locked and ready for pipeline integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-white border border-[#CBD5E1] rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {m.label}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 truncate">
              {m.value}
            </div>
            {m.detail && (
              <div className="text-[11px] text-slate-500 mt-1">
                {m.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CLI Output Reference */}
      <div className="bg-slate-900 rounded-lg p-6 text-white border border-slate-800 shadow-sm font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            HyperFrames Doctor Diagnostic Trace
          </span>
          <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 text-[10px]">
            ALL CORE CHECKS PASSED
          </span>
        </div>

        <pre className="text-slate-300 text-[11px] leading-relaxed overflow-x-auto">
{`hyperframes doctor
  ✓ Version          0.8.25 (latest)
  ✓ Node.js          v22.23.2 (linux x64)
  ✓ Memory           4.0 GB total · 2.0 GB available
  ✓ Disk             754.6 GB free
  ✓ FFmpeg           ffmpeg 4.4.2-0ubuntu0.22.04.1 at /usr/bin/ffmpeg
  ✓ FFprobe          ffprobe 4.4.2-0ubuntu0.22.04.1 at /usr/bin/ffprobe
  ✓ Chrome           Chrome Headless Shell v152.0.7977.30 (Verified)`}
        </pre>
      </div>
    </div>
  );
};
