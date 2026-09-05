import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  Shield,
  Activity,
  Sliders,
  Box,
  BrainCircuit,
  LineChart,
  Bot,
  RotateCcw,
  Layers,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export function UserManualModal() {
  const { isUserManualOpen, closeUserManual, theme } = useAppStore();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'DOCUMENT' | 'INTERACTIVE'>('DOCUMENT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSectionId, setActiveSectionId] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);
  const [dontShowOnStartup, setDontShowOnStartup] = useState<boolean>(() => {
    return localStorage.getItem('phoenix_skip_manual_startup') === 'true';
  });

  const contentRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut: Escape to close, 'm' / 'M' to toggle, Left/Right arrow to navigate pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'Escape' && isUserManualOpen) {
        closeUserManual();
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isUserManualOpen) {
          closeUserManual();
        } else {
          useAppStore.getState().openUserManual();
        }
      } else if (isUserManualOpen && viewMode === 'DOCUMENT') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          setCurrentPage((p) => Math.min(7, p + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          setCurrentPage((p) => Math.max(1, p - 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUserManualOpen, closeUserManual, viewMode]);

  const handleDontShowToggle = (checked: boolean) => {
    setDontShowOnStartup(checked);
    if (checked) {
      localStorage.setItem('phoenix_skip_manual_startup', 'true');
    } else {
      localStorage.removeItem('phoenix_skip_manual_startup');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyFullText = () => {
    const fullText = `PHOENIX-DT User Manual
UAV Propulsion Digital Twin & Ground Control Station — Integrated Vehicle Health Management (IVHM) System
Live Application: https://phoenix-dt-757677416848.asia-southeast1.run.app
DRDO / SIH 2026 | PS ID: 26054 | Team Syntax Syndicate | Version 2.0

Contents:
1. Introduction
2. System Requirements & Access
3. Interface Overview
4. Flight & Engine Controller
5. 3D Digital Twin Viewport
6. Hybrid AI/ML Health & Diagnostics
7. Telemetry Charts
8. Maintenance Copilot
9. Mission Black-Box & Synchronized Replay
10. Predictive Component Lifecycle
11. Edge Deployment, Security & Audit Log
12. Common Tasks (Step by Step)
13. Troubleshooting
14. Glossary

[Visit application to view complete formatted documentation]`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isUserManualOpen) return null;

  const isDark = theme === 'dark';

  const sections = [
    { id: 1, title: '1. Introduction', page: 2, icon: FileText },
    { id: 2, title: '2. System Requirements & Access', page: 2, icon: Activity },
    { id: 3, title: '3. Interface Overview', page: 2, icon: Box },
    { id: 4, title: '4. Flight & Engine Controller', page: 3, icon: Sliders },
    { id: 5, title: '5. 3D Digital Twin Viewport', page: 3, icon: Box },
    { id: 6, title: '6. Hybrid AI/ML Health & Diagnostics', page: 4, icon: BrainCircuit },
    { id: 7, title: '7. Telemetry Charts', page: 4, icon: LineChart },
    { id: 8, title: '8. Maintenance Copilot', page: 4, icon: Bot },
    { id: 9, title: '9. Mission Black-Box & Synchronized Replay', page: 5, icon: RotateCcw },
    { id: 10, title: '10. Predictive Component Lifecycle', page: 5, icon: Layers },
    { id: 11, title: '11. Edge Deployment, Security & Audit Log', page: 5, icon: Terminal },
    { id: 12, title: '12. Common Tasks (Step by Step)', page: 6, icon: CheckCircle2 },
    { id: 13, title: '13. Troubleshooting', page: 6, icon: AlertTriangle },
    { id: 14, title: '14. Glossary', page: 7, icon: BookOpen },
  ];

  const filteredSections = searchQuery.trim()
    ? sections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sections;

  return (
    <div
      id="user-manual-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:fixed-none"
    >
      <div
        id="user-manual-modal-container"
        className={`relative w-full max-w-6xl max-h-[95vh] h-[92vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border ${
          isDark
            ? 'bg-[#0E1526] border-slate-700/80 text-slate-100 shadow-cyan-950/40'
            : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        } print:max-w-none print:h-auto print:border-none print:shadow-none print:rounded-none`}
      >
        {/* Modal Top Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
            isDark ? 'bg-[#090D18] border-slate-800' : 'bg-slate-50 border-slate-200'
          } print:hidden`}
        >
          {/* Title & Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide uppercase font-mono-telemetry text-cyan-400">
                  PHOENIX-DT USER MANUAL
                </h2>
                <span className="text-[10px] font-mono-telemetry uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                  VERSION 2.0
                </span>
                <span className="text-[10px] font-mono-telemetry uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline">
                  DRDO / SIH 2026 · PS ID: 26054
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide">
                UAV Propulsion Digital Twin &amp; Ground Control Station (IVHM) Operator Guide
              </p>
            </div>
          </div>

          {/* Controls & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/25 p-0.5 rounded-lg border border-slate-700/70 text-xs font-mono-telemetry">
              <button
                onClick={() => setViewMode('DOCUMENT')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'DOCUMENT'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View formatted 7-page PDF document"
              >
                Document (7 Pages)
              </button>
              <button
                onClick={() => setViewMode('INTERACTIVE')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'INTERACTIVE'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Searchable Section Index & Quick Actions"
              >
                Interactive Explorer
              </button>
            </div>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono-telemetry bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Print / PDF</span>
            </button>

            {/* Copy Text */}
            <button
              onClick={handleCopyFullText}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono-telemetry bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Copy Manual Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={closeUserManual}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-700 transition-all ml-1"
              title="Close Manual (Esc or [M])"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Header Toolbar (For Page Navigation & Search) */}
        <div
          className={`px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b text-xs ${
            isDark ? 'bg-[#0B1120] border-slate-800/80' : 'bg-slate-100 border-slate-200'
          } print:hidden`}
        >
          {viewMode === 'DOCUMENT' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-mono-telemetry text-[11px] uppercase mr-1">Page Navigation:</span>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white border border-slate-700 transition-all"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-6 rounded text-[11px] font-mono-telemetry font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage >= 7}
                onClick={() => setCurrentPage((p) => Math.min(7, p + 1))}
                className="p-1 rounded bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white border border-slate-700 transition-all"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-slate-400 font-mono-telemetry text-[11px] ml-2">
                Page <span className="text-cyan-400 font-bold">{currentPage}</span> of 7
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter sections (e.g. Copilot, Faults, SITL, RUL, Diagnostics)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1 rounded text-xs outline-none font-mono-telemetry ${
                    isDark
                      ? 'bg-black/30 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Zoom / View controls & Quick jump */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded border border-slate-700/60 text-[11px] font-mono-telemetry text-slate-400">
              <button
                onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
                className="hover:text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-slate-300">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="hover:text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="hover:text-slate-200 ml-1"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            <div className="text-[11px] font-mono-telemetry text-slate-400 hidden sm:inline">
              Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">[M]</kbd> manual · <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">[Esc]</kbd> exit
            </div>
          </div>
        </div>

        {/* Modal Main Scrollable Content */}
        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 ${
            isDark ? 'bg-[#060911]' : 'bg-slate-200/80'
          } print:p-0 print:bg-white`}
        >
          {viewMode === 'DOCUMENT' ? (
            /* Document Mode: Styled White / Aerospace Technical Pages matching the exact PDF */
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-8 print:gap-0">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-full transition-transform duration-150"
              >
                {/* Render the Active Page (or all pages if printing) */}
                <div className="print:hidden">
                  <DocumentPageRenderer
                    pageNum={currentPage}
                    onNavigateSection={(p) => setCurrentPage(p)}
                    onCloseModal={closeUserManual}
                  />
                </div>

                {/* Print Layout: renders all 7 pages sequentially */}
                <div className="hidden print:block space-y-12">
                  {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                    <div key={p} className="page-break-after">
                      <DocumentPageRenderer pageNum={p} onNavigateSection={() => {}} onCloseModal={() => {}} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Explorer Mode: 14 sections with quick jump & rich cards */
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Sidebar table of contents */}
              <div className="md:col-span-4 flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono-telemetry text-cyan-400 mb-1">
                  14 System Manual Modules
                </h3>
                <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredSections.map((sec) => {
                    const Icon = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => {
                          setActiveSectionId(sec.id);
                          setCurrentPage(sec.page);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-mono-telemetry transition-all ${
                          activeSectionId === sec.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                            : isDark
                            ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{sec.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">P.{sec.page}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className={`p-3 rounded-lg border text-xs ${
                    isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="font-semibold text-slate-300 mb-1">Need step-by-step guidance?</p>
                  <p className="text-[11px] mb-2">Switch to Document View to read all 7 pages with exact DRDO standard diagrams and instructions.</p>
                  <button
                    onClick={() => {
                      setViewMode('DOCUMENT');
                      setCurrentPage(6);
                    }}
                    className="text-cyan-400 hover:underline text-[11px] font-mono-telemetry font-bold flex items-center gap-1"
                  >
                    View Step-by-Step Tasks (Page 6) →
                  </button>
                </div>
              </div>

              {/* Detail section card */}
              <div className="md:col-span-8">
                <InteractiveSectionDetail
                  sectionId={activeSectionId}
                  onJumpToPage={(p) => {
                    setCurrentPage(p);
                    setViewMode('DOCUMENT');
                  }}
                  onCloseModal={closeUserManual}
                  isDark={isDark}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div
          className={`px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-t text-xs ${
            isDark ? 'bg-[#090D18] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          } print:hidden`}
        >
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11.5px]">
              <input
                type="checkbox"
                checked={dontShowOnStartup}
                onChange={(e) => handleDontShowToggle(e.target.checked)}
                className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/20 bg-slate-800"
              />
              <span className="text-slate-400 hover:text-slate-300">
                Don't show this manual automatically on next startup
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono-telemetry text-slate-400 hidden sm:inline">
              DRDO / SIH 2026 · PS ID: 26054 · Team Syntax Syndicate
            </span>
            <button
              onClick={closeUserManual}
              className="px-4 py-1.5 rounded-lg text-xs font-bold font-mono-telemetry bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
            >
              ENTER GROUND STATION →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Document Page Renderer: Faithfully reconstructs all 7 pages with exact typography & layout
// ------------------------------------------------------------------------------------------------

function DocumentPageRenderer({
  pageNum,
  onNavigateSection,
  onCloseModal,
}: {
  pageNum: number;
  onNavigateSection: (p: number) => void;
  onCloseModal: () => void;
}) {
  return (
    <div className="w-full bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 p-8 sm:p-12 md:p-14 min-h-[900px] flex flex-col justify-between font-sans leading-relaxed text-sm antialiased print:shadow-none print:border-none print:p-8">
      {/* Page Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-8 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">PHOENIX-DT</span>
          <span>·</span>
          <span>UAV Propulsion Digital Twin (IVHM)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>DRDO / SIH 2026 | PS ID: 26054</span>
          <span>·</span>
          <span className="font-bold text-slate-800">Page {pageNum} of 7</span>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">
        {pageNum === 1 && <Page1Content onNavigateSection={onNavigateSection} />}
        {pageNum === 2 && <Page2Content />}
        {pageNum === 3 && <Page3Content />}
        {pageNum === 4 && <Page4Content />}
        {pageNum === 5 && <Page5Content />}
        {pageNum === 6 && <Page6Content onCloseModal={onCloseModal} />}
        {pageNum === 7 && <Page7Content />}
      </div>

      {/* Page Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Team Syntax Syndicate · DRDO 26054</span>
        <span>Version 2.0 (August 2026)</span>
        <span>Page {pageNum}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Individual Page Replicas (Pages 1 to 7)
// ------------------------------------------------------------------------------------------------

function Page1Content({ onNavigateSection }: { onNavigateSection: (p: number) => void }) {
  const contentsList = [
    { num: 1, title: 'Introduction', page: 2 },
    { num: 2, title: 'System Requirements & Access', page: 2 },
    { num: 3, title: 'Interface Overview', page: 2 },
    { num: 4, title: 'Flight & Engine Controller', page: 3 },
    { num: 5, title: '3D Digital Twin Viewport', page: 3 },
    { num: 6, title: 'Hybrid AI/ML Health & Diagnostics', page: 4 },
    { num: 7, title: 'Telemetry Charts', page: 4 },
    { num: 8, title: 'Maintenance Copilot', page: 4 },
    { num: 9, title: 'Mission Black-Box & Synchronized Replay', page: 5 },
    { num: 10, title: 'Predictive Component Lifecycle', page: 5 },
    { num: 11, title: 'Edge Deployment, Security & Audit Log', page: 5 },
    { num: 12, title: 'Common Tasks (Step by Step)', page: 6 },
    { num: 13, title: 'Troubleshooting', page: 6 },
    { num: 14, title: 'Glossary', page: 7 },
  ];

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="text-center py-6 border-b border-slate-200">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 font-mono">
          PHOENIX-DT
        </h1>
        <h2 className="text-xl sm:text-2xl font-semibold text-cyan-700 mb-3">
          User Manual
        </h2>
        <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
          UAV Propulsion Digital Twin &amp; Ground Control Station — Integrated Vehicle Health Management (IVHM) System
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-1.5 text-xs text-slate-500 font-mono">
          <div>
            <span className="text-slate-400">Live Application: </span>
            <span className="text-cyan-700 font-medium">https://phoenix-dt-757677416848.asia-southeast1.run.app</span>
          </div>
          <div>
            DRDO / SIH 2026 | PS ID: 26054 | Team Syntax Syndicate | Version 2.0
          </div>
        </div>
      </div>

      {/* Contents Section */}
      <div>
        <h3 className="text-lg font-bold text-cyan-800 mb-4 tracking-wide font-mono">
          Contents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {contentsList.map((item) => (
            <button
              key={item.num}
              onClick={() => onNavigateSection(item.page)}
              className="flex items-center justify-between text-left p-1.5 rounded hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-700 font-bold text-xs w-5">{item.num}.</span>
                <span className="text-slate-800 group-hover:text-cyan-800 font-medium text-sm">
                  {item.title}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono group-hover:text-cyan-700">
                Page {item.page} →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access Card */}
      <div className="p-4 bg-cyan-50/60 rounded-lg border border-cyan-200/80 text-xs text-cyan-900 flex items-start gap-3 mt-6">
        <Shield className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-cyan-950 mb-0.5">Quick Evaluation Notice for DRDO / SIH Judges:</p>
          <p className="text-slate-600 leading-normal">
            This manual outlines all primary workflows, including live 10-channel fault injection, hybrid Mahalanobis AI anomaly discrimination, RUL prognostic calculations, mission replay scrub, and edge deployment benchmarking. Jump to Page 6 for immediate 1-click step-by-step evaluation tasks.
          </p>
        </div>
      </div>
    </div>
  );
}

function Page2Content() {
  return (
    <div className="space-y-8">
      {/* 1. Introduction */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          1. Introduction
        </div>
        <p className="text-slate-700 text-sm leading-relaxed mb-3">
          <strong>PHOENIX-DT</strong> is a real-time digital twin and Ground Control Station (GCS) for monitoring the propulsion health of a MALE (Medium Altitude Long Endurance) UAV's aero-piston engine. It continuously simulates or ingests engine telemetry, diagnoses anomalies using a hybrid statistical and machine-learning model, estimates Remaining Useful Life (RUL) at two timescales, and presents all of this through an interactive 3D twin, live charts, and a natural-language Maintenance Copilot.
        </p>
        <p className="text-slate-700 text-sm leading-relaxed">
          This manual explains every screen and control in the application and how to use them. It is written for operators, evaluators, and judges who are using the application for the first time.
        </p>
      </section>

      {/* 2. System Requirements & Access */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          2. System Requirements &amp; Access
        </div>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Browser:</strong> A modern desktop web browser (Chrome, Edge, or Firefox recommended). Mobile browsers can view the app but the layout is optimized for desktop screens.
          </li>
          <li>
            <strong>Access:</strong> No installation, login, or account is required to view the application.
          </li>
          <li>
            <strong>URL:</strong> <span className="font-mono text-cyan-700 font-medium">https://phoenix-dt-757677416848.asia-southeast1.run.app</span>
          </li>
          <li>
            <strong>Connectivity:</strong> A stable internet connection is required for the Maintenance Copilot feature specifically (it calls a server-side AI service); all other features run entirely in the browser.
          </li>
        </ul>
      </section>

      {/* 3. Interface Overview */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          3. Interface Overview
        </div>
        <p className="text-slate-700 text-sm mb-3">
          The screen is divided into three main columns, with a status bar across the top:
        </p>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Top Bar:</strong> Live status, Zulu timestamp, uptime, link health, current Health %, the Master Warning banner, the Role selector (Operator / Maintenance / Auditor), and Pause/Reset/Theme controls.
          </li>
          <li>
            <strong>Left Column:</strong> The Flight &amp; Engine Controller — four tabs (Flight, Faults, Scenarios, Data Link) used to set flight conditions, inject faults, and configure the telemetry source.
          </li>
          <li>
            <strong>Center Column:</strong> The interactive 3D digital twin of the UAV, camera controls, and the live gauge row beneath it.
          </li>
          <li>
            <strong>Right Column:</strong> The Hybrid AI/ML Health &amp; Diagnostics panel, the Maintenance Copilot, and the raw telemetry feed.
          </li>
        </ul>
        <p className="text-slate-600 text-xs mt-3 italic">
          Scrolling down reveals additional panels: telemetry charts, the Edge Deployment &amp; Security panel, Mission Black-Box &amp; Replay, and the Predictive Component Lifecycle cards.
        </p>
      </section>
    </div>
  );
}

function Page3Content() {
  return (
    <div className="space-y-8">
      {/* 4. Flight & Engine Controller */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          4. Flight &amp; Engine Controller
        </div>
        <p className="text-slate-700 text-sm mb-3">This panel has four tabs:</p>
        <ul className="space-y-2.5 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Flight tab:</strong> Set Mission Phase (Takeoff/Climb/Cruise/Descent) and adjust Altitude, Engine Throttle Lever, and Lambda Mixture Ratio sliders. These represent normal flying conditions, not faults.
          </li>
          <li>
            <strong>Faults tab:</strong> The Injection Matrix. Contains preset buttons (Nominal, Fuel Leak, Oil Loss, Misfire, Elec Sag, Icing) and individual sliders for all ten fault types. Drag any slider from 0% to 100% to simulate that fault's severity in real time.
          </li>
          <li>
            <strong>Scenarios tab:</strong> One-click stress-test presets — Hot-Weather Ops, Rapid Throttle Transition, and Endurance Degradation — that apply a scripted combination of conditions to test specific operating scenarios.
          </li>
          <li>
            <strong>Data Link tab:</strong> Toggle the telemetry source between the SITL (Software-in-the-Loop) physics engine and a simulated CAN Adapter. Also shows SocketCAN link statistics, a raw CAN frame log, and a 'Simulate Link Loss' test button.
          </li>
        </ul>
      </section>

      {/* 5. 3D Digital Twin Viewport */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          5. 3D Digital Twin Viewport
        </div>
        <ul className="space-y-2.5 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Orbit / Zoom:</strong> Click and drag anywhere on the model to orbit around it. Scroll to zoom in or out.
          </li>
          <li>
            <strong>Camera Presets:</strong> ORBIT, CHASE, ENGINE, FUEL, GIMBAL, and TOP_DOWN buttons jump the camera to a preset vantage point.
          </li>
          <li>
            <strong>Pin Display Modes:</strong> A toggle labeled FAULT FOCUS / SHOW ALL / OFF controls which sensor markers are displayed on the model — Fault Focus shows only sensors currently driving an anomaly.
          </li>
          <li>
            <strong>Color Reactions:</strong> Parts of the airframe change color based on active faults — for example, the aft engine section tints red/amber when oil pressure is low or CHT is high.
          </li>
          <li>
            <strong>Attitude Readout:</strong> Live pitch and roll angle readout, shown above the 3D canvas.
          </li>
        </ul>
        <p className="text-slate-600 text-xs mt-3 italic">
          Below the viewport, six live gauges show CHT, EGT, Oil System (pressure and temperature), Bus Power, Vibration RMS, and Injection Timing.
        </p>
      </section>
    </div>
  );
}

function Page4Content() {
  return (
    <div className="space-y-8">
      {/* 6. Hybrid AI/ML Health & Diagnostics */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          6. Hybrid AI/ML Health &amp; Diagnostics
        </div>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside mb-3">
          <li>
            <strong>Propulsion Health:</strong> A 0-100% score summarizing overall engine anomaly level, with a status badge (Nominal / Monitor / Critical).
          </li>
          <li>
            <strong>Classified Condition:</strong> Names the specific diagnosed fault (e.g. Oil Pressure Loss, Sensor Drift).
          </li>
          <li>
            <strong>Remaining Useful Life (RUL ± Σ):</strong> A countdown timer to the earliest of fuel exhaustion, oil-pressure failure, or thermal overheat, shown with an uncertainty range.
          </li>
        </ul>
        <p className="text-slate-700 text-sm font-semibold mb-2">This panel has three tabs:</p>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Hybrid Architecture:</strong> Shows the Statistical Pipeline (explainable Mahalanobis-distance model) and the Learned Classifier (a trained probability model) side by side, plus a Softmax Probability Distribution of top fault candidates.
          </li>
          <li>
            <strong>Z-Score Anomaly Drivers:</strong> Ranks every monitored sensor by how much it deviates from normal, with the primary driver of the current diagnosis flagged at the top.
          </li>
          <li>
            <strong>DRDO Benchmark Metrics:</strong> Live precision, recall, false-alarm rate, and detection-latency figures, computed against the simulator's own injected ground truth.
          </li>
        </ul>
      </section>

      {/* 7. Telemetry Charts */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          7. Telemetry Charts
        </div>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Thermodynamics (CHT &amp; EGT):</strong> CHT, EGT Reported, and EGT Actual over time — a gap between Reported and Actual indicates a sensor-drift fault.
          </li>
          <li>
            <strong>Lubrication Dynamics:</strong> Oil pressure and oil temperature trends, used to diagnose lubrication-related faults.
          </li>
          <li>
            <strong>Vibration Spectrum Analysis:</strong> An FFT-style bar chart of vibration energy across frequency bands — rises under Misfire or Injector Clog faults.
          </li>
          <li>
            <strong>Electrical Bus &amp; Generator Stability:</strong> Bus voltage and charging current — sags under an Electrical Fault.
          </li>
        </ul>
      </section>

      {/* 8. Maintenance Copilot */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          8. Maintenance Copilot
        </div>
        <p className="text-slate-700 text-sm mb-3">Located in the right column. To use it:</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              1
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">Ask a question</p>
              <p className="text-slate-600 text-xs">
                Type a question into the input box (e.g. "what should I do next?") or click one of the three quick-action buttons: Explain current fault, What to do next?, Summarize for log.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              2
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">Read the response</p>
              <p className="text-slate-600 text-xs">
                The Copilot reads the current Health Index, Classified Condition, and RUL, and answers grounded in that live data — it will not invent a fault that isn't currently active.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              3
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">If you see a connection error</p>
              <p className="text-slate-600 text-xs">
                The Copilot depends on a server-side AI service. If it shows a connection error, the rest of the dashboard (physics, AI diagnostics, 3D twin) is unaffected and continues to work independently.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Page5Content() {
  return (
    <div className="space-y-8">
      {/* 9. Mission Black-Box & Synchronized Replay */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          9. Mission Black-Box &amp; Synchronized Replay
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              1
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">Select a flight record</p>
              <p className="text-slate-600 text-xs">
                Use the 'Select Flight Record' dropdown to choose a previously completed, stored mission.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              2
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">Launch the replay</p>
              <p className="text-slate-600 text-xs">
                Click 'LAUNCH SYNCHRONIZED REPLAY'. Telemetry, the 3D twin's state, and the AI's verdict all replay together on the original mission's timeline.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              3
            </span>
            <div>
              <p className="font-bold text-slate-900 text-sm">Compare two missions</p>
              <p className="text-slate-600 text-xs">
                Use the '2-MISSION COMPARE' toggle to overlay two historical missions' health curves for comparison.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Predictive Component Lifecycle */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          10. Predictive Component Lifecycle
        </div>
        <p className="text-slate-700 text-sm leading-relaxed mb-3">
          Scroll to the bottom of the page to find eight cards, each tracking one subsystem's long-term wear independently of any single flight: two Piston/Cylinder Heads, the Common Rail Fuel Injector Set, the Dual Scavenge Oil Pump &amp; Bearings, the Exhaust Turbocharger &amp; Wastegate, and the Dual 28V Brushless Alternator.
        </p>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside mb-3">
          <li>
            <strong>Hrs Logged:</strong> Total flight-hours accumulated on this component across every stored mission.
          </li>
          <li>
            <strong>Wear Bar:</strong> A green/amber/red bar showing wear as a percentage of the component's design life, alongside the estimated hours and sorties remaining with an uncertainty range.
          </li>
          <li>
            <strong>OVERHAUL Button:</strong> Resets this specific component's wear to 0% to simulate a real maintenance event, while keeping its historical hours logged for audit purposes. This does NOT affect any other component or the current flight's RUL.
          </li>
        </ul>
        <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-xs leading-relaxed">
          <strong>Note:</strong> pressing RESET in the top bar clears only the current flight (uptime, fuel, active fault sliders) — it does not reset Component Lifecycle wear, which is designed to persist across sessions.
        </div>
      </section>

      {/* 11. Edge Deployment, Security & Audit Log */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          11. Edge Deployment, Security &amp; Audit Log
        </div>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li>
            <strong>Role Selector:</strong> Switches which panels are visible/editable between Operator, Maintenance, and Auditor views. Located in the top bar.
          </li>
          <li>
            <strong>Edge Deployment &amp; Security Panel:</strong> A representative simulated benchmark showing CPU load, RAM footprint, and update-loop latency for an embedded hardware deployment.
          </li>
          <li>
            <strong>Tamper-Evident Session Audit Log:</strong> An append-only, timestamped record of every fault injection, Reset, Overhaul, and role switch during the session, shown at the bottom of the left column.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Page6Content({ onCloseModal }: { onCloseModal: () => void }) {
  return (
    <div className="space-y-8">
      {/* 12. Common Tasks (Step by Step) */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-4">
          12. Common Tasks (Step by Step)
        </div>

        {/* Task 1 */}
        <div className="mb-6">
          <p className="font-bold text-slate-900 text-sm mb-3">
            Task: Simulate an engine fault and observe the AI's response
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <div>
                <strong>Open the Faults tab:</strong> In the Flight &amp; Engine Controller panel, click the Faults tab.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <div>
                <strong>Choose a fault:</strong> Drag any slider (e.g. Oil Scavenge Leak) up to 50-70%.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
              <div>
                <strong>Watch the reaction:</strong> Observe the Master Warning banner, the affected gauges, the 3D twin's color change, and the Classified Condition updating in the Hybrid AI/ML panel.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
              <div>
                <strong>Return to normal:</strong> Drag the slider back to 0% to watch the system recover, or click RESET in the top bar to clear the whole session.
              </div>
            </div>
          </div>
        </div>

        {/* Task 2 */}
        <div className="mb-6">
          <p className="font-bold text-slate-900 text-sm mb-3">Task: Review a past flight</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <div>
                <strong>Scroll to Mission Black-Box:</strong> Find the 'Mission Black-Box &amp; Synchronized Replay' panel.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <div>
                <strong>Pick a record and replay:</strong> Select a flight from the dropdown and click LAUNCH SYNCHRONIZED REPLAY.
              </div>
            </div>
          </div>
        </div>

        {/* Task 3 */}
        <div>
          <p className="font-bold text-slate-900 text-sm mb-3">Task: Check long-term maintenance status</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <div>
                <strong>Scroll to Component Lifecycle:</strong> Find the eight component cards at the bottom of the page.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <div>
                <strong>Read wear status:</strong> Each card's status badge (Nominal Wear / Monitor / Schedule Overhaul) and remaining-hours estimate tells you if that part needs attention.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Troubleshooting (First Part) */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-3">
          13. Troubleshooting
        </div>
        <ul className="space-y-2 text-xs text-slate-700 list-disc list-inside">
          <li>
            <strong>Health % shows CRITICAL with no faults visibly injected:</strong> This is expected if any fault slider is above 0% — check the Faults tab and reset sliders to 0%, or click RESET.
          </li>
          <li>
            <strong>RUL countdown seems to jump around:</strong> This is normal at low fault severities (below ~20-30%) since the estimate is trend-based; it stabilizes once a fault is clearly established.
          </li>
          <li>
            <strong>Copilot shows a connection error:</strong> The Copilot depends on a separate server-side AI service; if it fails, the rest of the application (physics, AI diagnostics, 3D twin, charts) is unaffected and continues to function normally.
          </li>
          <li>
            <strong>Component Lifecycle cards don't change after clicking RESET:</strong> This is intentional — RESET only clears the current flight session; Component Lifecycle wear is a persistent, long-term record and only resets via that component's own OVERHAUL button.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Page7Content() {
  return (
    <div className="space-y-8">
      {/* 13. Troubleshooting (Continuation) */}
      <section>
        <ul className="space-y-2 text-xs text-slate-700 list-disc list-inside mb-6">
          <li>
            <strong>The page is unresponsive or slow:</strong> Refresh the browser tab. If the issue persists, check your internet connection, since the Copilot and any persisted data require connectivity.
          </li>
        </ul>
      </section>

      {/* 14. Glossary */}
      <section>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t font-bold text-base font-mono mb-4">
          14. Glossary
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-700">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">RUL — Remaining Useful Life:</strong>
            <p className="text-slate-600 mt-0.5">An estimate of how much longer a system or component can operate safely.</p>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">CHT / EGT — Cylinder Head Temperature / Exhaust Gas Temperature:</strong>
            <p className="text-slate-600 mt-0.5">Core engine thermal parameters.</p>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">Mahalanobis Distance:</strong>
            <p className="text-slate-600 mt-0.5">A statistical measure of how far a data point is from a normal/expected distribution, used here for anomaly scoring.</p>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">SITL — Software-in-the-Loop:</strong>
            <p className="text-slate-600 mt-0.5">The physics-based simulation engine that generates telemetry when no real hardware is connected.</p>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">MTBF — Mean Time Between Failures:</strong>
            <p className="text-slate-600 mt-0.5">A component's designed average operating life before failure.</p>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 font-mono text-xs">Z-Score:</strong>
            <p className="text-slate-600 mt-0.5">A normalized measure of how many standard deviations a sensor reading is from its expected value.</p>
          </div>
        </div>
      </section>

      {/* Team Signoff */}
      <div className="text-center pt-8 border-t border-slate-200">
        <p className="text-slate-600 font-mono font-bold tracking-widest text-sm uppercase">
          — Team Syntax Syndicate —
        </p>
        <p className="text-slate-400 text-xs mt-1">
          DRDO Smart India Hackathon 2026 · PS ID: 26054
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Interactive Section Detail Explorer
// ------------------------------------------------------------------------------------------------

function InteractiveSectionDetail({
  sectionId,
  onJumpToPage,
  onCloseModal,
  isDark,
}: {
  sectionId: number;
  onJumpToPage: (p: number) => void;
  onCloseModal: () => void;
  isDark: boolean;
}) {
  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className={`p-6 rounded-xl border ${cardBg} shadow-lg min-h-[500px] flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3 mb-4">
          <span className="text-xs font-mono-telemetry uppercase text-cyan-400 font-bold">
            Module {sectionId} Detailed Technical Specification
          </span>
          <button
            onClick={() => onJumpToPage(sectionId <= 3 ? 2 : sectionId <= 5 ? 3 : sectionId <= 8 ? 4 : sectionId <= 11 ? 5 : sectionId <= 13 ? 6 : 7)}
            className="text-xs font-mono-telemetry text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
          >
            Open in Document View ↗
          </button>
        </div>

        {sectionId === 1 && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h4 className="text-lg font-bold text-slate-100">1. Introduction to PHOENIX-DT</h4>
            <p className="text-slate-300">
              PHOENIX-DT is an Integrated Vehicle Health Management (IVHM) digital twin platform tailored for aero-piston engines in Medium Altitude Long Endurance (MALE) UAVs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-xs">
                <span className="font-bold text-cyan-300 block mb-1">Statistical Grounding</span>
                Covariance-aware Mahalanobis distance D_M calculates multivariate dispersion across 10 engine dimensions in real-time.
              </div>
              <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-xs">
                <span className="font-bold text-cyan-300 block mb-1">Prognostic Horizon</span>
                Dual-timescale Remaining Useful Life (RUL) with confidence intervals (± Σ) based on physical wear rates.
              </div>
            </div>
          </div>
        )}

        {sectionId === 4 && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h4 className="text-lg font-bold text-slate-100">4. Flight &amp; Engine Controller</h4>
            <p className="text-slate-300">
              Directly manipulate simulation parameters, test scripted stress scenarios, or inject 10 fault modes with 0-100% severity sliders:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-slate-800 border border-slate-700">
                <strong className="text-cyan-300">Fault Vectors:</strong> Oil Scavenge Leak, Fuel Line Leak, Injector Clogging, Cylinder Misfire, Electrical Bus Sag, Airframe Icing, Sensor Drift, Coking, Overheat.
              </div>
              <div className="p-2 rounded bg-slate-800 border border-slate-700">
                <strong className="text-cyan-300">Scenarios:</strong> Hot-Weather Operations, Rapid Throttle Transition, and Long-Endurance Wear.
              </div>
            </div>
          </div>
        )}

        {sectionId === 8 && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h4 className="text-lg font-bold text-slate-100">8. Maintenance Copilot</h4>
            <p className="text-slate-300">
              The Maintenance Copilot is grounded with the live flight snapshot payload. It translates complex telemetry anomalies into clear pilot and hangar action checklists without inventing hallucinations.
            </p>
            <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/20 text-xs">
              <span className="font-bold text-cyan-300">Pre-built Prompt Buttons:</span>
              <ul className="list-disc list-inside mt-1 text-slate-300 space-y-1">
                <li>"Explain current fault in plain language"</li>
                <li>"What is our immediate action plan?"</li>
                <li>"Summarize diagnostic snapshot for maintenance log"</li>
              </ul>
            </div>
          </div>
        )}

        {sectionId === 12 && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h4 className="text-lg font-bold text-slate-100">12. Common Tasks (Step by Step)</h4>
            <p className="text-slate-300">
              Perform complete end-to-end operational workflows:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
              <li><strong>Fault Injection:</strong> Go to the Faults tab in the Left Panel and slide Oil Leak to 60%. Observe master warning annunciator, 3D aft engine red heat glow, and copilot assessment.</li>
              <li><strong>Black-Box Replay:</strong> Scroll to Mission Black-Box, pick a historical sortie, and hit Launch Replay.</li>
              <li><strong>Lifecycle Overhaul:</strong> Inspect the 8 subsystem wear bars at the bottom and click OVERHAUL to simulate a scheduled hangar replacement.</li>
            </ol>
          </div>
        )}

        {![1, 4, 8, 12].includes(sectionId) && (
          <div className="space-y-3 text-sm leading-relaxed">
            <h4 className="text-lg font-bold text-slate-100">Module {sectionId} Overview</h4>
            <p className="text-slate-300">
              For complete technical diagrams and step-by-step procedures for this section, switch to Document View.
            </p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onJumpToPage(sectionId <= 3 ? 2 : sectionId <= 5 ? 3 : sectionId <= 8 ? 4 : sectionId <= 11 ? 5 : sectionId <= 13 ? 6 : 7)}
          className="px-3 py-1.5 rounded-lg text-xs font-mono-telemetry bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all"
        >
          View Full Page in Document Mode →
        </button>
        <button
          onClick={onCloseModal}
          className="px-4 py-1.5 rounded-lg text-xs font-mono-telemetry font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all"
        >
          Enter Ground Station
        </button>
      </div>
    </div>
  );
}
