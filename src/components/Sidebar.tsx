import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Terminal,
  Activity,
  Server,
  Sparkles
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside id="sidebar-container" className="w-72 bg-white border-r border-[#CBD5E1] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div id="sidebar-header" className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">HyperFrames</h1>
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
          <span>Motion Graphics MVP</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span className="text-blue-600">Phase 0</span>
        </p>
      </div>

      {/* Navigation */}
      <nav id="sidebar-nav" className="flex-1 p-4 space-y-5 overflow-y-auto">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
            Workspace Context
          </div>
          <div className="space-y-1 mt-1">
            <button
              id="tab-overview-btn"
              onClick={() => onTabChange('overview')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-xs transition-colors text-left ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Phase 0: Recon</span>
              </div>
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            </button>

            <button
              id="tab-check-gate-btn"
              onClick={() => onTabChange('check-gate')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-xs transition-colors text-left ${
                activeTab === 'check-gate'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>HyperFrames Gate</span>
            </button>

            <button
              id="tab-architecture-btn"
              onClick={() => onTabChange('architecture')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-xs transition-colors text-left ${
                activeTab === 'architecture'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Pipeline Design</span>
            </button>

            <button
              id="tab-system-btn"
              onClick={() => onTabChange('system')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-xs transition-colors text-left ${
                activeTab === 'system'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Environment Matrix</span>
            </button>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
            Pipeline Roadmap
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex items-center justify-between px-3 py-2 text-slate-400 bg-slate-50/70 rounded-md text-xs border border-dashed border-slate-200">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                Phase 1: GPT-5.5 Planner
              </span>
              <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono">NEXT</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-400 bg-slate-50/70 rounded-md text-xs border border-dashed border-slate-200 opacity-70">
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Phase 2: Code Compiler
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">LATER</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-400 bg-slate-50/70 rounded-md text-xs border border-dashed border-slate-200 opacity-70">
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Phase 3: Render & Repair
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">LATER</span>
            </div>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="pt-2 border-t border-[#E2E8F0]">
          <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
            Environment Status
          </div>
          <div className="px-3 py-1 space-y-2.5 mt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Node.js</span>
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">v22.23.2</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">HyperFrames</span>
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">v0.8.25</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">FFmpeg 4.4</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">INSTALLED</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Chrome Headless</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">VERIFIED</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">LLM Gateway</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Server className="w-3 h-3" /> READY
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer State */}
      <div id="sidebar-footer" className="p-4 border-t border-[#E2E8F0] bg-slate-50">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
          <span className="uppercase font-semibold">Phase 0 Recon Completion</span>
          <span className="text-slate-700 font-bold font-mono">100%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 w-full rounded-full transition-all duration-500"></div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>All inspection criteria verified</span>
        </div>
      </div>
    </aside>
  );
};
