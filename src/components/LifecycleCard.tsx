import { History, Wrench } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function LifecycleCard() {
  const { componentLifecycle, overhaulComponent, theme, userRole } = useAppStore();

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const headerText = isDark ? 'text-[#8FA0BC]' : 'text-slate-500';

  const isAuditor = userRole === 'AUDITOR';

  return (
    <div className={`w-full flex flex-col gap-3.5 p-4 rounded-lg border ${panelBg}`}>
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className={`text-xs font-bold tracking-wider uppercase ${headerText}`}>
            PREDICTIVE COMPONENT LIFECYCLE RUL (FLEET AUDIT LEDGER)
          </h3>
        </div>
        <span className="text-[10px] font-mono-telemetry uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          PERSISTENT LEDGER SYNCED
        </span>
      </div>

      <div className="text-[11px] text-slate-400">
        Tracks long-term structural health over cumulative fleet flight hours with uncertainty intervals. Persists across sessions.
      </div>

      <div className="flex flex-col gap-2.5">
        {componentLifecycle.map((item) => {
          const wearPct = item.cumulative_wear_pct;
          const remainingPct = Math.max(0, 100 - wearPct);
          const wearRate = item.cumulative_hours > 0 ? wearPct / item.cumulative_hours : 0.2;
          const hoursRemaining = wearRate > 0 ? Math.round(remainingPct / wearRate) : 500;
          const hoursUncertainty = Math.max(10, Math.round(hoursRemaining * 0.12));
          const flightsRemaining = Math.round(hoursRemaining / 4.0);

          let statusBadge = {
            label: 'NOMINAL WEAR',
            color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            barColor: 'bg-emerald-400',
          };

          if (remainingPct < 15 || wearPct > 85) {
            statusBadge = {
              label: 'SCHEDULE OVERHAUL',
              color: 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse',
              barColor: 'bg-red-500',
            };
          } else if (remainingPct <= 40 || wearPct >= 60) {
            statusBadge = {
              label: 'MONITOR WEAR',
              color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              barColor: 'bg-amber-400',
            };
          }

          return (
            <div
              key={item.id}
              className="p-2.5 rounded-lg border border-slate-700/40 bg-black/20 flex flex-col gap-2 font-mono-telemetry"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{item.subsystem}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{item.cumulative_hours} hrs logged</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-cyan-400 font-bold">
                    ~{hoursRemaining}h (± {hoursUncertainty}h) [{flightsRemaining} sorties]
                  </span>
                  {!isAuditor && (
                    <button
                      id={`overhaul-reset-${item.id}`}
                      onClick={() => overhaulComponent(item.id)}
                      className="ml-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-all"
                      title="Simulate depot maintenance / overhaul (resets component wear to 0%)"
                    >
                      <Wrench className="w-2.5 h-2.5" />
                      OVERHAUL
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${statusBadge.barColor}`}
                    style={{ width: `${Math.min(100, Math.max(2, wearPct))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-300 w-12 text-right">{wearPct}%</span>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Design MTBF: {item.mtbf_hours}h</span>
                <span>Audit Tag: {new Date(item.last_updated).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
