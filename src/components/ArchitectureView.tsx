import React from 'react';
import { 
  FileJson, 
  Sparkles, 
  Image as ImageIcon, 
  Code2, 
  ShieldCheck, 
  Film, 
  ArrowRight, 
  ArrowDown, 
  RefreshCw, 
  CheckCircle2, 
  AlertOctagon 
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Human Video Brief',
      icon: Sparkles,
      tag: 'INPUT',
      tagColor: 'bg-slate-100 text-slate-700',
      description: 'Plain-language video prompt with target aspect ratio (16:9 widescreen or 9:16 portrait) and duration.'
    },
    {
      step: '02',
      title: 'GPT-5.5 Planning Module',
      icon: FileJson,
      tag: 'MODEL 1',
      tagColor: 'bg-blue-100 text-blue-700',
      description: 'Generates an explicit, validated plan.json artifact specifying scene sequences, typographic copy, timestamps, and color tokens.'
    },
    {
      step: '03',
      title: 'Asset Generation Module',
      icon: ImageIcon,
      tag: 'MODEL 2',
      tagColor: 'bg-purple-100 text-purple-700',
      description: 'Invokes gpt-image-2 for required visuals. Saves outputs deterministically to runs/<run_id>/assets/.'
    },
    {
      step: '04',
      title: 'Deterministic Code Compiler',
      icon: Code2,
      tag: 'COMPILER',
      tagColor: 'bg-emerald-100 text-emerald-700',
      description: 'Synthesizes plan.json into hyperframes.json and index.html with GSAP timeline registrations and high-contrast styling.'
    },
    {
      step: '05',
      title: 'HyperFrames Quality Gate',
      icon: ShieldCheck,
      tag: 'GATE CHECK',
      tagColor: 'bg-amber-100 text-amber-800',
      description: 'Runs npx hyperframes check . --json evaluating HTML lint, runtime errors, layout bounds, and WCAG AA contrast.'
    },
    {
      step: '06',
      title: 'HyperFrames MP4 Render Engine',
      icon: Film,
      tag: 'OUTPUT',
      tagColor: 'bg-emerald-100 text-emerald-800',
      description: 'Headless Chrome frame capture + FFmpeg assembly. Never executed unless Gate produces ok: true.'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Title */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          End-to-End System Pipeline & Bounded Repair Architecture
        </h2>
        <p className="text-xs text-slate-600">
          Strict separation of concerns: Model decides content, deterministic compiler builds composition, HyperFrames validates before render.
        </p>
      </div>

      {/* Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={idx} 
              className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm relative flex flex-col justify-between hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    STEP {s.step}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${s.tagColor}`}>
                    {s.tag}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Auditable Artifact</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bounded Repair Loop Deep Dive */}
      <div className="bg-slate-900 text-white rounded-lg p-6 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Bounded Repair Loop Specification (Max 3 Retries)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
          <div className="p-4 bg-slate-800/80 rounded border border-slate-700">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
              Trigger Condition
            </span>
            <p className="text-slate-300 leading-relaxed">
              Gate returns <code className="text-red-400 font-mono">ok: false</code> or exit code 1 with one or more findings in lint, runtime, layout, or contrast AA.
            </p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded border border-slate-700">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
              Targeted Correction
            </span>
            <p className="text-slate-300 leading-relaxed">
              The repair routine injects the exact finding codes, selectors, and <code className="text-emerald-400 font-mono">suggestedColor</code> into the AST compiler.
            </p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded border border-slate-700">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
              Strict Failure Cap
            </span>
            <p className="text-slate-300 leading-relaxed">
              If the gate continues to fail after attempt #3, the pipeline fails loudly. <strong>No unvalidated video is ever returned.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
