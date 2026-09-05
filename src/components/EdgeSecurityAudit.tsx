import { useState } from 'react';
import {
  Activity,
  Cpu,
  FileCheck2,
  HardDrive,
  Lock,
  Radio,
  Shield,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export function EdgeSecurityAudit() {
  const { auditLogs, userRole, uptimeSeconds, theme, engine } = useAppStore();

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const headerText = isDark ? 'text-[#8FA0BC]' : 'text-slate-500';

  const cpuPct = (12.4 + (Math.sin(uptimeSeconds * 0.5) * 1.8) + (engine.rpm > 5600 ? 2.5 : 0)).toFixed(1);
  const ramMb = (42.6 + (Math.cos(uptimeSeconds * 0.3) * 0.8)).toFixed(1);
  const loopLatencyMs = (1.18 + (Math.sin(uptimeSeconds * 0.8) * 0.12)).toFixed(2);

  return (
    <div className={`w-full flex flex-col gap-3 p-3.5 rounded-lg border ${panelBg}`}>
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className={`text-xs font-bold tracking-wider uppercase ${headerText}`}>
            EDGE DEPLOYMENT &amp; SECURITY
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono-telemetry uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <Lock className="w-3 h-3" /> SECURE TELEMETRY LINK
          </span>
          <span className="text-[10px] font-mono-telemetry uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            ROLE: {userRole}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-black/20 border border-slate-700/40 flex flex-col">
          <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" /> EDGE CPU LOAD
          </span>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className="text-base font-bold text-cyan-300">{cpuPct}%</span>
            <span className="text-[9px] text-slate-400">ARM CORTEX</span>
          </div>
        </div>

        <div className="p-2 rounded bg-black/20 border border-slate-700/40 flex flex-col">
          <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-purple-400" /> RAM FOOTPRINT
          </span>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className="text-base font-bold text-purple-300">{ramMb} MB</span>
            <span className="text-[9px] text-slate-400">EMBEDDED</span>
          </div>
        </div>

        <div className="p-2 rounded bg-black/20 border border-slate-700/40 flex flex-col">
          <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" /> LOOP LATENCY
          </span>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className="text-base font-bold text-emerald-300">{loopLatencyMs} ms</span>
            <span className="text-[9px] text-slate-400">100Hz READY</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-[9px] text-slate-400 italic font-mono-telemetry">
        * Representative edge-deployment benchmark on embedded hardware architecture (Linux / ARM).
      </div>

      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-700/40">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${headerText}`}>
            <FileCheck2 className="w-3 h-3 text-cyan-400" />
            TAMPER-EVIDENT SESSION AUDIT LOG (APPEND-ONLY)
          </span>
          <span className="text-[9px] text-slate-400 font-mono-telemetry">
            {auditLogs.length} EVENTS RECORDED
          </span>
        </div>

        <div className="p-2 rounded bg-black/30 border border-slate-800 font-mono-telemetry text-[10px] text-slate-300 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
          {auditLogs.map((log, idx) => (
            <div key={`${log.id}-${idx}`} className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold">{log.action}</span>
                <span className="text-slate-400">{log.timestamp}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="truncate pr-2">{log.details}</span>
                <span className="text-[9px] text-emerald-400 shrink-0 font-bold">{log.signatureHex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
