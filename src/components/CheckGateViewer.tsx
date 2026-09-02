import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Code2, 
  Eye, 
  Check, 
  Zap,
  Info
} from 'lucide-react';

interface Finding {
  category: 'lint' | 'runtime' | 'layout' | 'contrast';
  code: string;
  severity: 'error' | 'warning';
  message: string;
  selector?: string;
  fixHint?: string;
  suggestedColor?: string;
  time?: number;
}

const SAMPLE_FAILED_FINDINGS: Finding[] = [
  {
    category: 'lint',
    code: 'missing_timeline_registry',
    severity: 'error',
    message: 'Missing `window.__timelines` registration for composition "main".',
    selector: '[data-composition-id="main"]',
    fixHint: 'window.__timelines["main"] = gsap.timeline({ paused: true });'
  },
  {
    category: 'contrast',
    code: 'contrast_aa_failure',
    severity: 'error',
    message: 'Contrast is 1.14:1 on #subtitle; WCAG AA requires minimum 3.0:1 for large text.',
    selector: '#subtitle',
    suggestedColor: '#0F172A',
    time: 0.5
  },
  {
    category: 'layout',
    code: 'sweep_static',
    severity: 'warning',
    message: 'Element #hero-badge exhibits 0px delta between t=1.0s and t=4.0s (possible static freeze).',
    selector: '#hero-badge',
    fixHint: 'Add entrance stagger or subtle ambient tween to satisfy dynamic motion verification.'
  }
];

export const CheckGateViewer: React.FC = () => {
  const [activePreset, setActivePreset] = useState<'failed' | 'repaired' | 'perfect'>('failed');
  const [repairedSteps, setRepairedSteps] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleSimulateRepair = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setActivePreset('perfect');
      setRepairedSteps((prev) => prev + 1);
      setIsSimulating(false);
    }, 900);
  };

  const isPassed = activePreset === 'perfect';

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              HyperFrames Gate Inspector & Bounded Repair Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Simulates the exact gate workflow: <code className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">npx hyperframes check . --json</code> followed by automated AST repair.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActivePreset('failed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              activePreset === 'failed'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Failed Probe (Exit 1)
          </button>
          <button
            onClick={() => setActivePreset('perfect')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              activePreset === 'perfect'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Passed Probe (Exit 0)
          </button>
          <button
            onClick={handleSimulateRepair}
            disabled={isSimulating || isPassed}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Applying Repair AST...' : 'Auto-Repair (Attempt 1/3)'}</span>
          </button>
        </div>
      </div>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border shadow-sm ${
          isPassed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Gate Verdict
          </div>
          <div className="flex items-center gap-2">
            {isPassed ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">PASSED (ok: true)</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-bold text-red-900">FAILED (ok: false)</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Exit Code: <span className="font-bold">{isPassed ? '0' : '1'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBD5E1] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Lint & Timelines
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isPassed ? '100% Validated' : '1 Registry Error'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isPassed ? 'window.__timelines registered' : 'window.__timelines undefined'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBD5E1] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            WCAG AA Contrast
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isPassed ? 'Ratio 14.2:1 (Pass)' : 'Ratio 1.14:1 (Fail)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isPassed ? 'All typography AA compliant' : 'Foreground too light on white'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBD5E1] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Repair Attempts
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isPassed ? `${repairedSteps}/3 (Passed)` : '0/3 Attempts'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Bounded retry cap: 3 attempts
          </div>
        </div>
      </div>

      {/* Findings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#CBD5E1] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Gate Findings Analysis
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {isPassed ? '0 active errors' : '2 errors, 1 warning'}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {isPassed ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Composition Clean & Gate Ready</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All lint rules, headless runtime hooks, layout bounds, and WCAG AA contrast tests passed with zero errors.
                </p>
              </div>
            ) : (
              SAMPLE_FAILED_FINDINGS.map((finding, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border text-xs space-y-2 ${
                    finding.severity === 'error'
                      ? 'bg-red-50/40 border-red-200 text-red-900'
                      : 'bg-amber-50/40 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-[11px] uppercase px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                      {finding.category} // {finding.code}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      finding.severity === 'error' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {finding.severity}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium">{finding.message}</p>

                  {finding.selector && (
                    <div className="font-mono text-[11px] text-slate-600 bg-white/70 p-1.5 rounded border border-slate-200">
                      Target Selector: <span className="text-blue-700">{finding.selector}</span>
                    </div>
                  )}

                  {finding.suggestedColor && (
                    <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 font-mono text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Suggested Fix Color: <strong>{finding.suggestedColor}</strong> (WCAG AA ratio 14.2:1)</span>
                    </div>
                  )}

                  {finding.fixHint && (
                    <div className="text-slate-600 bg-white/70 p-2 rounded border border-slate-200 font-mono text-[11px]">
                      Hint: {finding.fixHint}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Output Raw JSON */}
        <div className="lg:col-span-5 bg-slate-900 rounded-lg p-5 text-white border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              Raw Gate JSON Stream
            </span>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              v0.8.25
            </span>
          </div>

          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed overflow-x-auto flex-1 bg-slate-950 p-3.5 rounded border border-slate-800 max-h-96 scrollbar-thin">
{isPassed ? `{
  "ok": true,
  "strict": false,
  "lint": { "ok": true, "errorCount": 0, "findings": [] },
  "runtime": { "ok": true, "errorCount": 0, "findings": [] },
  "layout": { "ok": true, "errorCount": 0, "findings": [] },
  "contrast": {
    "ok": true,
    "errorCount": 0,
    "findings": [],
    "checked": 4,
    "passed": 4
  },
  "_meta": {
    "version": "0.8.25",
    "gatePassed": true
  }
}` : `{
  "ok": false,
  "strict": false,
  "lint": {
    "ok": false,
    "errorCount": 1,
    "findings": [
      {
        "code": "missing_timeline_registry",
        "severity": "error",
        "message": "Missing window.__timelines registration."
      }
    ]
  },
  "contrast": {
    "ok": false,
    "errorCount": 1,
    "findings": [
      {
        "code": "contrast_aa_failure",
        "severity": "error",
        "suggestedColor": "#0F172A"
      }
    ]
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
