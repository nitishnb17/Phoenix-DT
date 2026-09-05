import { useEffect } from 'react';
import { useAppStore } from './lib/store';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { UavTwin3D } from './components/UavTwin3D';
import { TelemetryCharts } from './components/TelemetryCharts';
import { DiagnosticsCard } from './components/DiagnosticsCard';
import { LifecycleCard } from './components/LifecycleCard';
import { MissionReplay } from './components/MissionReplay';
import { EdgeSecurityAudit } from './components/EdgeSecurityAudit';
import { RawJsonFeed } from './components/RawJsonFeed';
import { CopilotChat } from './components/CopilotChat';
import { UserManualModal } from './components/UserManualModal';

export default function App() {
  const { tick, isRunning, theme, loadLifecycleFromStorage, closeUserManual } = useAppStore();

  useEffect(() => {
    loadLifecycleFromStorage();
    // If user explicitly checked 'Don't show on startup', respect their setting
    if (localStorage.getItem('phoenix_skip_manual_startup') === 'true') {
      closeUserManual();
    }
  }, [loadLifecycleFromStorage, closeUserManual]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const isDark = theme === 'dark';
  const pageBg = isDark ? 'bg-[#0B0F19] text-[#F1F5F9]' : 'bg-[#F8FAFC] text-[#0F172A]';

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-150 ${pageBg}`}>
      <TopBar />

      <main className="flex-1 w-full max-w-[1800px] mx-auto p-3 sm:p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Flight Controls & Scenarios & Edge Security */}
          <div className="lg:col-span-3 w-full flex flex-col gap-4">
            <Sidebar />
            <EdgeSecurityAudit />
          </div>

          {/* Center Column: 3D Twin, Telemetry Charts, Mission Replay & Fleet Lifecycle */}
          <div className="lg:col-span-5 flex flex-col gap-4 w-full">
            <UavTwin3D />
            <TelemetryCharts />
            <MissionReplay />
            <LifecycleCard />
          </div>

          {/* Right Column: AI Diagnostics, Copilot Chat & Telemetry Feed */}
          <div className="lg:col-span-4 flex flex-col gap-4 w-full">
            <DiagnosticsCard />
            <CopilotChat />
            <RawJsonFeed />
          </div>
        </div>
      </main>

      {/* Startup & Permanent User Manual Modal */}
      <UserManualModal />
    </div>
  );
}
