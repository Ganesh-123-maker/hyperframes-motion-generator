import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  FileCheck2, 
  ExternalLink 
} from 'lucide-react';
import { ArtifactItem, ArchitectureRisk } from '../types';

interface ReconOverviewProps {
  onSwitchToCheckGate: () => void;
}

const ARTIFACTS: ArtifactItem[] = [
  {
    id: '1',
    fileName: 'docs/phase-0-reconnaissance.md',
    status: 'CREATED',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    responsibility: 'Technical Recon Baseline',
    summary: 'Full CLI inspection, exit codes, JSON schema, and gotchas.'
  },
  {
    id: '2',
    fileName: '.env.example',
    status: 'CREATED',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    responsibility: 'Security & Secret Policy',
    summary: 'OpenAI Gateway base URL, GPT-5.5 & GPT-Image-2 placeholders.'
  },
  {
    id: '3',
    fileName: '.gitignore',
    status: 'UPDATED',
    statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
    responsibility: 'Asset & Output Protection',
    summary: 'Excludes runs/, renders/, temp/, .env*, snapshots, MP4 binaries.'
  },
  {
    id: '4',
    fileName: 'metadata.json & index.html',
    status: 'UPDATED',
    statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
    responsibility: 'App Identity Alignment',
    summary: 'Set exact applet title, descriptions, and OpenGraph metadata.'
  },
  {
    id: '5',
    fileName: 'package.json',
    status: 'INSPECTED',
    statusColor: 'bg-slate-100 text-slate-700 border-slate-200',
    responsibility: 'Dependency Management',
    summary: 'Added hyperframes@0.8.25 and verified toolchain.'
  }
];

const RISKS: ArchitectureRisk[] = [
  {
    id: 'r1',
    title: 'Dynamic Motion Requirement (sweep_static)',
    description: 'HyperFrames check fails if a timeline has static elements without movement across seek samples.',
    mitigation: 'Compiler automatically binds animated entrance/exit or ambient tweens spanning the full clip duration.',
    severity: 'high'
  },
  {
    id: 'r2',
    title: 'Strict WCAG AA Contrast Enforcement',
    description: 'Contrast AA failures are fatal errors returning non-zero exit codes (1) during gate validation.',
    mitigation: 'Plan schema mandates verified high-contrast palettes (>7:1); repair loop applies check.suggestedColor.',
    severity: 'high'
  },
  {
    id: 'r3',
    title: 'Model Hallucinations vs Deterministic Code',
    description: 'Direct LLM generation of HTML/GSAP code causes broken tags, missing attributes, or invalid IDs.',
    mitigation: 'Strict separation: GPT-5.5 outputs structured plan.json; deterministic TypeScript compiler generates HTML.',
    severity: 'high'
  },
  {
    id: 'r4',
    title: 'Timeline Registry Failure',
    description: 'Missing window.__timelines[id] registration triggers a 45-second discovery timeout and fatal check error.',
    mitigation: 'Rigid HTML scaffold guarantees paused GSAP timeline registration before checking.',
    severity: 'medium'
  }
];

export const ReconOverview: React.FC<ReconOverviewProps> = ({ onSwitchToCheckGate }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
      {/* Main Section (8 cols) */}
      <section className="lg:col-span-8 space-y-6">
        {/* CLI Discovery Terminal Box */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                CLI Discovery: HyperFrames Quality Gate
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                npx hyperframes check . --json
              </span>
              <button
                onClick={() => copyToClipboard('npx hyperframes check . --json', 'check-cmd')}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Copy command"
              >
                {copiedCode === 'check-cmd' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="p-5 font-mono text-sm leading-relaxed bg-slate-950">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 pb-2 border-b border-slate-800">
              <span className="text-emerald-400 font-semibold">// Verified Gate Structure Captured During Recon</span>
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 px-1.5 py-0.5 rounded">
                Exit Code 1 (on finding)
              </span>
            </div>
            <pre className="text-emerald-400 text-[11px] leading-5 overflow-x-auto max-h-72 scrollbar-thin">
{`{
  "ok": false,
  "strict": false,
  "lint": {
    "ok": false,
    "errorCount": 1,
    "warningCount": 0,
    "findings": [
      {
        "code": "missing_timeline_registry",
        "severity": "error",
        "message": "Missing window.__timelines registration.",
        "selector": "[data-composition-id]",
        "fixHint": "Register composition timeline on window.__timelines['main']."
      }
    ]
  },
  "runtime": { "ok": true, "errorCount": 0, "findings": [] },
  "layout": { "ok": true, "errorCount": 0, "findings": [] },
  "contrast": {
    "ok": false,
    "errorCount": 1,
    "findings": [
      {
        "code": "contrast_aa_failure",
        "severity": "error",
        "text": "Low contrast text",
        "ratio": 1.14,
        "requiredRatio": 3.0,
        "suggestedColor": "rgb(148,148,148)"
      }
    ]
  }
}`}
            </pre>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-600">
            <span>Unified Gate: Linter + Headless Chrome Runtime + Layout Overlap + WCAG AA Contrast</span>
            <button
              onClick={onSwitchToCheckGate}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              Open Interactive Simulator &rarr;
            </button>
          </div>
        </div>

        {/* Artifact Inventory Table */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Phase 0 Artifact Inventory</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All mandatory configuration files, ignore policies, and documentation baselines created.
              </p>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded border border-blue-200">
              5/5 Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-medium">File Name</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Responsibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ARTIFACTS.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono text-xs text-blue-600 font-medium">
                      {item.fileName}
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">{item.summary}</div>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-xs text-slate-600 font-medium">
                      {item.responsibility}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Core Principles Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Assignment Engineering Directives</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-800 block mb-1">1. Explicit Planning Artifact</strong>
              <span>GPT-5.5 produces plan.json before any HTML/composition code is compiled.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-800 block mb-1">2. Zero-Bypass Quality Gate</strong>
              <span>Never emit an MP4 that has not passed npx hyperframes check . --json.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-800 block mb-1">3. Bounded Automated Repair</strong>
              <span>Feed exact check JSON issues back to repair model, capped at 3 attempts.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-800 block mb-1">4. Deterministic Generation</strong>
              <span>Avoid unseeded randomness. Re-running the same brief yields identical video.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sidebar Risks & Next Actions (4 cols) */}
      <section className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded-lg p-6 text-white shadow-md border border-slate-800 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Architecture Risks</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-900/50">
                4 Mitigated
              </span>
            </div>

            <ul className="space-y-4">
              {RISKS.map((risk) => (
                <li key={risk.id} className="text-xs space-y-1">
                  <div className="flex items-start gap-2 text-slate-200 font-semibold">
                    <span className="w-1.5 h-1.5 mt-1.5 bg-amber-400 rounded-full shrink-0"></span>
                    <span>{risk.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal pl-3.5">
                    {risk.description}
                  </p>
                  <div className="text-[11px] text-emerald-400/90 pl-3.5 pt-0.5">
                    <span className="font-semibold text-emerald-300">Fix:</span> {risk.mitigation}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 p-4 bg-slate-800/80 rounded border border-slate-700">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Next Execution Commands
            </h4>
            <div className="font-mono text-[11px] text-blue-300 space-y-2">
              <div>
                <span className="text-slate-500 block text-[10px]"># 1. Ensure Chrome Headless Engine</span>
                <span className="text-emerald-400">npx hyperframes browser ensure</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]"># 2. Execute Quality Gate</span>
                <span className="text-blue-300">npx hyperframes check . --json</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]"># 3. Render Final MP4</span>
                <span className="text-amber-300">npx hyperframes render -o out.mp4</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
