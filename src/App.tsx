/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ReconOverview } from './components/ReconOverview';
import { CheckGateViewer } from './components/CheckGateViewer';
import { ArchitectureView } from './components/ArchitectureView';
import { SystemMatrix } from './components/SystemMatrix';
import { ActiveTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const handleRunTestGate = () => {
    setIsTesting(true);
    setActiveTab('check-gate');
    setTimeout(() => {
      setIsTesting(false);
    }, 700);
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] text-[#334155] font-sans overflow-hidden">
      {/* Sidebar with Professional Polish theme */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Action Bar */}
        <Header 
          activeTab={activeTab} 
          onRunTestGate={handleRunTestGate}
          isTesting={isTesting}
        />

        {/* Dynamic Content View Container */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <ReconOverview onSwitchToCheckGate={() => setActiveTab('check-gate')} />
          )}

          {activeTab === 'check-gate' && (
            <CheckGateViewer />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureView />
          )}

          {activeTab === 'system' && (
            <SystemMatrix />
          )}
        </div>
      </main>
    </div>
  );
}
