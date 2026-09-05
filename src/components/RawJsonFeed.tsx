import { useState } from 'react';
import { Check, Copy, FileText } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function RawJsonFeed() {
  const { getSnapshot, theme, dataSourceMode } = useAppStore();
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const headerText = isDark ? 'text-[#8FA0BC]' : 'text-slate-500';

  const snapshot = getSnapshot();
  const latestJson = JSON.stringify(snapshot, null, 2);

  const handleCopyLatest = () => {
    navigator.clipboard.writeText(latestJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`w-full flex flex-col rounded-lg border ${panelBg}`}>
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <h3 className={`text-xs font-bold tracking-wider uppercase ${headerText}`}>
            INGESTED JSON TELEMETRY STREAM (1HZ)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono-telemetry uppercase text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            {dataSourceMode === 'SITL' ? 'SOURCE: SITL ENGINE' : 'SOURCE: CAN-BUS (SIMULATED ADAPTER)'}
          </span>
          <button
            id="raw-feed-copy-btn"
            onClick={handleCopyLatest}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1 text-[10px] font-mono-telemetry"
            title="Copy Current JSON Frame"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
          </button>
        </div>
      </div>

      <div className="p-2.5 bg-[#0D121D] font-mono-telemetry text-[10px] h-56 overflow-y-auto rounded-b-lg text-emerald-400 leading-relaxed select-text">
        <pre className="whitespace-pre">{latestJson}</pre>
      </div>
    </div>
  );
}
