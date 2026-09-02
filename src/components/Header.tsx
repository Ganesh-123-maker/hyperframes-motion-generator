import React from 'react';
import { Play, FileCode, CheckCircle, ExternalLink, Terminal } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  onRunTestGate: () => void;
  isTesting: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onRunTestGate, isTesting }) => {
  const getTabDetails = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'docs/phase-0-reconnaissance.md',
          status: 'VERIFIED & COMPLETE',
          statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      case 'check-gate':
        return {
          title: 'npx hyperframes check . --json (Quality Gate Simulator)',
          status: 'TESTED & PROVEN',
          statusColor: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'architecture':
        return {
          title: 'Pipeline Architecture & Bounded Repair Loop',
          status: 'STAGE SPECIFICATION',
          statusColor: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'system':
        return {
          title: 'Runtime Environment & Dependency Matrix',
          status: 'DIAGNOSTICS PASSED',
          statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
    }
  };

  const details = getTabDetails();

  return (
    <header id="main-header" className="h-16 bg-white border-b border-[#CBD5E1] flex items-center justify-between px-8 shrink-0 select-none">
      <div className="flex items-center gap-3.5 min-w-0">
        <h2 className="text-sm font-semibold text-[#1E293B] truncate font-mono">
          {details.title}
        </h2>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${details.statusColor}`}>
          {details.status}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <a
          href="https://hyperframes.heygen.com"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          <span>HyperFrames Docs</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        <button
          id="run-gate-header-btn"
          onClick={onRunTestGate}
          disabled={isTesting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors active:translate-y-px disabled:opacity-60"
        >
          {isTesting ? (
            <>
              <Terminal className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating Gate...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Gate Probe</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
