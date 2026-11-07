import React, { useState, useMemo } from 'react';
import {
  Table,
  Users,
  Download,
  UserPlus,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Edit2,
  Trash2,
  Lock
} from 'lucide-react';
import {
  AppState,
  UserRole,
  WorkerProfile,
  getDutyDisplaySymbol,
  parseDutyInput,
  calculateWorkerMonthlySummary,
  getInitials
} from '../utils/siteLogic';

declare global {
  interface Window {
    XLSX?: any;
  }
}

interface RegisterTabProps {
  appState: AppState;
  userRole: UserRole;
  monthKey: string;
  selectedDay: number;
  siteName: string;
  subgroupName: string;
  onUpdateCell: (workerId: string, day: number, field: 'duty' | 'ot' | 'adv', value: string | number | null) => void;
  onUpdateOpeningAdvance: (workerId: string, value: number) => void;
  onOpenWorkerModal: (worker?: WorkerProfile) => void;
  onDeleteWorker: (workerId: string) => void;
  onOpenWorkerProfile: (worker: WorkerProfile) => void;
  onRequireLogin: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const RegisterTab: React.FC<RegisterTabProps> = ({
  appState,
  userRole,
  monthKey,
  selectedDay,
  siteName,
  subgroupName,
  onUpdateCell,
  onUpdateOpeningAdvance,
  onOpenWorkerModal,
  onDeleteWorker,
  onOpenWorkerProfile,
  onRequireLogin,
  onToast
}) => {
  const [subView, setSubView] = useState<'matrix' | 'directory'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('ALL');

  const isViewer = userRole === 'viewer';
  const canEditWorkers = userRole === 'admin' || userRole === 'incharge';

  const { monthNum, yearNum, daysInMonth } = useMemo(() => {
    const parts = monthKey.split('-');
    const m = parseInt(parts[0], 10) || 1;
    const y = parseInt(parts[1], 10) || 2026;
    return {
      monthNum: m,
      yearNum: y,
      daysInMonth: new Date(y, m, 0).getDate()
    };
  }, [monthKey]);

  const monthAtt = appState.attendance[monthKey] || {};

  const uniqueTrades = useMemo(() => {
    const set = new Set<string>();
    appState.workers.forEach(w => {
      if (w.desig) set.add(w.desig);
    });
    return Array.from(set).sort();
  }, [appState.workers]);

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appState.workers.filter(w => {
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.desig.toLowerCase().includes(q) ||
        (w.phone || '').toLowerCase().includes(q);
      const matchesTrade = tradeFilter === 'ALL' || w.desig === tradeFilter;
      return matchesSearch && matchesTrade;
    });
  }, [appState.workers, searchQuery, tradeFilter]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const grandTotals = useMemo(() => {
    let duty = 0;
    let ot = 0;
    let gross = 0;
    let adv = 0;
    let net = 0;
    filteredWorkers.forEach(w => {
      const s = calculateWorkerMonthlySummary(w, monthAtt, appState.advances, daysInMonth);
      duty += s.totalDuty;
      ot += s.totalOT;
      gross += s.grossAmount;
      adv += s.totalAdvance;
      net += s.netBalance;
    });
    return { duty, ot, gross, adv, net };
  }, [filteredWorkers, monthAtt, appState.advances, daysInMonth]);

  const handleExportExcel = () => {
    if (!window.XLSX) {
      onToast('Excel export library is loading. Please try again in a moment.', 'error');
      return;
    }

    const rows: any[][] = [];
    const header = [
      'SL',
      'Worker Name',
      'Designation',
      'Phone',
      'Rate (₹)',
      'Row Type',
      ...daysArray.map(d => String(d)),
      'Total Duty',
      'Total OT (h)',
      'Gross Pay (₹)',
      'Total Advance (₹)',
      'Net Payable (₹)'
    ];
    rows.push(header);

    filteredWorkers.forEach((w, idx) => {
      const summary = calculateWorkerMonthlySummary(w, monthAtt, appState.advances, daysInMonth);
      const wAtt = monthAtt[w.id] || {};
      const dutyRow: any[] = [idx + 1, w.name, w.desig, w.phone || '-', w.rate, 'DUTY'];
      const otRow: any[] = ['', '', '', '', '', 'OT (h)'];

      daysArray.forEach(d => {
        const rec = wAtt[d];
        dutyRow.push(rec ? getDutyDisplaySymbol(rec.duty) : '');
        otRow.push(rec && rec.ot ? rec.ot : '');
      });

      dutyRow.push(
        summary.totalDuty,
        summary.totalOT,
        Math.round(summary.grossAmount),
        Math.round(summary.totalAdvance),
        Math.round(summary.netBalance)
      );
      otRow.push('', '', '', '', '');

      rows.push(dutyRow);
      rows.push(otRow);
    });

    rows.push([
      '',
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      ...daysArray.map(() => ''),
      grandTotals.duty,
      grandTotals.ot,
      Math.round(grandTotals.gross),
      Math.round(grandTotals.adv),
      Math.round(grandTotals.net)
    ]);

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(wb, ws, `Attendance_${monthKey}`);
    window.XLSX.writeFile(wb, `${siteName.replace(/\s+/g, '_')}_${subgroupName.replace(/\s+/g, '_')}_${monthKey}.xlsx`);
    onToast('Monthly Attendance Register exported to Excel', 'success');
  };

  const handleShareWorkerWhatsApp = (worker: WorkerProfile) => {
    const s = calculateWorkerMonthlySummary(worker, monthAtt, appState.advances, daysInMonth);
    const period = `${MONTH_NAMES[monthNum]} ${yearNum}`;
    const msg =
      `*GLOBAL INDUSTRIES - WAGE SUMMARY*\n` +
      `--------------------------------\n` +
      `👤 *Worker:* ${worker.name} (${worker.desig})\n` +
      `📍 *Site:* ${siteName} (${subgroupName})\n` +
      `📅 *Period:* ${period}\n\n` +
      `✅ *Total Duties:* ${s.totalDuty} Days\n` +
      `⏱️ *Total Overtime:* ${s.totalOT} Hrs\n` +
      `💰 *Daily Rate:* ₹${worker.rate}\n` +
      `📊 *Gross Earned:* ₹${Math.round(s.grossAmount).toLocaleString('en-IN')}\n` +
      `💸 *Total Advance:* ₹${Math.round(s.totalAdvance).toLocaleString('en-IN')}\n` +
      `--------------------------------\n` +
      `🏦 *NET PAYABLE:* ₹${Math.round(s.netBalance).toLocaleString('en-IN')}`;

    const cleanPhone = (worker.phone || '').replace(/\D/g, '');
    const waUrl =
      cleanPhone.length >= 10
        ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Sub-Navigation & Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setSubView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                subView === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Monthly Register
            </button>
            <button
              type="button"
              onClick={() => setSubView('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                subView === 'directory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Worker Directory ({appState.workers.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => (canEditWorkers ? onOpenWorkerModal() : onRequireLogin())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Add Worker
            </button>
          </div>
        </div>

        {/* Search & Trade Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search register by worker name, trade, or phone..."
              aria-label="Search register by worker name, trade, or phone"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={tradeFilter}
            onChange={e => setTradeFilter(e.target.value)}
            aria-label="Filter register by trade"
            className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Trades ({appState.workers.length})</option>
            {uniqueTrades.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUBVIEW 1: MONTHLY MATRIX */}
      {subView === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              <strong>{MONTH_NAMES[monthNum]} {yearNum}</strong> Attendance Sheet • Scroll horizontally to view all {daysInMonth} days
            </span>
            <span>
              Codes: <strong className="text-emerald-600">P</strong> = Present (1.0), <strong className="text-amber-600">H</strong> = Half (0.5), <strong className="text-rose-600">A</strong> = Absent (0)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs tabular-nums">
              <thead>
                <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-2 text-center border-r border-slate-700 w-9">SL</th>
                  <th className="py-2.5 px-3 text-left border-r border-slate-700 sticky left-0 z-20 bg-slate-900 min-w-[155px] shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                    Worker Name
                  </th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 w-16">Rate</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-700 w-12">Type</th>
                  {daysArray.map(d => (
                    <th
                      key={d}
                      className={`py-2.5 px-1 text-center border-r border-slate-700 min-w-[34px] ${
                        d === selectedDay ? 'bg-blue-600 text-white font-bold' : ''
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 bg-slate-800 min-w-[54px]">Duty</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 bg-slate-800 min-w-[50px]">OT</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 bg-slate-800 min-w-[74px]">Gross</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 bg-slate-800 min-w-[74px]">Open Adv</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-700 bg-slate-800 min-w-[74px]">Tot Adv</th>
                  <th className="py-2.5 px-3 text-right bg-slate-950 text-amber-400 min-w-[85px]">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredWorkers.map((worker, idx) => {
                  const wAtt = monthAtt[worker.id] || {};
                  const summary = calculateWorkerMonthlySummary(worker, monthAtt, appState.advances, daysInMonth);

                  return (
                    <React.Fragment key={worker.id}>
                      {/* ROW 1: DUTY */}
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td
                          rowSpan={2}
                          className="p-2 text-center font-semibold text-slate-400 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          {idx + 1}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2.5 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 bg-white dark:bg-slate-900 align-middle shadow-[2px_0_5px_rgba(0,0,0,0.04)]"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenWorkerProfile(worker)}
                            className="text-left font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 block truncate max-w-[145px]"
                          >
                            {worker.name}
                          </button>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
                            {worker.desig}
                          </span>
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          ₹{worker.rate}
                        </td>
                        <td className="px-1.5 py-1 text-center text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800">
                          DUTY
                        </td>
                        {daysArray.map(d => {
                          const rec = wAtt[d] || { duty: null, ot: 0, adv: 0, locked: false };
                          const sym = getDutyDisplaySymbol(rec.duty);
                          const isLocked = Boolean(rec.locked) && userRole !== 'admin';
                          const colorCls =
                            sym === 'P'
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : sym === 'H'
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : sym === 'A'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-slate-500';

                          return (
                            <td
                              key={d}
                              className={`p-0 border-r border-slate-200 dark:border-slate-800 text-center ${
                                d === selectedDay ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <input
                                type="text"
                                value={sym}
                                readOnly={isViewer || isLocked}
                                maxLength={2}
                                aria-label={`${worker.name} Day ${d} Duty`}
                                onChange={e => {
                                  if (isViewer) {
                                    onRequireLogin();
                                    return;
                                  }
                                  const parsed = parseDutyInput(e.target.value);
                                  onUpdateCell(worker.id, d, 'duty', parsed);
                                }}
                                placeholder="-"
                                className={`w-full h-7 text-center bg-transparent focus:bg-blue-50 dark:focus:bg-blue-950 focus:outline-none font-mono text-xs ${colorCls}`}
                              />
                            </td>
                          );
                        })}
                        <td
                          rowSpan={2}
                          className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          {summary.totalDuty}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2 text-right font-mono font-semibold text-blue-600 dark:text-blue-400 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          {summary.totalOT}h
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          ₹{Math.round(summary.grossAmount).toLocaleString('en-IN')}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-1.5 text-right font-mono text-rose-600 dark:text-rose-400 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          <input
                            type="number"
                            value={summary.openingAdv || ''}
                            readOnly={!canEditWorkers}
                            aria-label={`${worker.name} Opening Advance`}
                            onChange={e => {
                              if (!canEditWorkers) {
                                onRequireLogin();
                                return;
                              }
                              onUpdateOpeningAdvance(worker.id, parseFloat(e.target.value) || 0);
                            }}
                            placeholder="0"
                            className="w-16 px-1 py-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 align-middle"
                        >
                          ₹{Math.round(summary.totalAdvance).toLocaleString('en-IN')}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 align-middle"
                        >
                          ₹{Math.round(summary.netBalance).toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* ROW 2: OT */}
                      <tr className="bg-slate-50/40 dark:bg-slate-800/20 border-b-2 border-slate-200 dark:border-slate-800">
                        <td className="px-1.5 py-1 text-center text-[10px] font-semibold text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          OT
                        </td>
                        {daysArray.map(d => {
                          const rec = wAtt[d] || { duty: null, ot: 0, adv: 0, locked: false };
                          const isLocked = Boolean(rec.locked) && userRole !== 'admin';
                          return (
                            <td
                              key={d}
                              className={`p-0 border-r border-slate-200 dark:border-slate-800 text-center ${
                                d === selectedDay ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={rec.ot || ''}
                                readOnly={isViewer || isLocked}
                                aria-label={`${worker.name} Day ${d} OT`}
                                onChange={e => {
                                  if (isViewer) {
                                    onRequireLogin();
                                    return;
                                  }
                                  onUpdateCell(worker.id, d, 'ot', parseFloat(e.target.value) || 0);
                                }}
                                placeholder="-"
                                className="w-full h-6 text-center bg-transparent focus:bg-blue-50 dark:focus:bg-blue-950 focus:outline-none font-mono text-[11px] text-blue-600 dark:text-blue-400"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-mono font-bold text-xs">
                  <td colSpan={4 + daysInMonth} className="p-3 text-right uppercase tracking-wider text-slate-300">
                    GRAND TOTAL ({filteredWorkers.length} Workers)
                  </td>
                  <td className="p-2 text-right border-l border-slate-700">{grandTotals.duty}</td>
                  <td className="p-2 text-right border-l border-slate-700 text-blue-300">{grandTotals.ot}h</td>
                  <td className="p-2 text-right border-l border-slate-700">
                    ₹{Math.round(grandTotals.gross).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-right border-l border-slate-700">-</td>
                  <td className="p-2 text-right border-l border-slate-700 text-rose-300">
                    ₹{Math.round(grandTotals.adv).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right border-l border-slate-700 text-amber-400">
                    ₹{Math.round(grandTotals.net).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: WORKER DIRECTORY */}
      {subView === 'directory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWorkers.map(worker => {
            const summary = calculateWorkerMonthlySummary(worker, monthAtt, appState.advances, daysInMonth);
            return (
              <div
                key={worker.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(worker.name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {worker.name}
                      </h4>
                      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                        {worker.desig}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">Daily Rate</div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      ₹{worker.rate}
                    </div>
                  </div>
                </div>

                {/* Monthly Snapshot Strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center tabular-nums">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Duties</div>
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {summary.totalDuty}d {summary.totalOT > 0 ? `+${summary.totalOT}h` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Advance</div>
                    <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                      ₹{Math.round(summary.totalAdvance).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Net Pay</div>
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Math.round(summary.netBalance).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {worker.phone ? (
                      <a
                        href={`tel:${worker.phone}`}
                        aria-label={`Call ${worker.name}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        {worker.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No phone</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleShareWorkerWhatsApp(worker)}
                      aria-label={`WhatsApp summary for ${worker.name}`}
                      className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                      title="Share Wage Summary on WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenWorkerProfile(worker)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Ledger
                    </button>
                    {canEditWorkers ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenWorkerModal(worker)}
                          aria-label={`Edit ${worker.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => onDeleteWorker(worker.id)}
                            aria-label={`Delete ${worker.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onRequireLogin}
                        aria-label={`Unlock to edit ${worker.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                        title="Unlock Admin/Incharge PIN to edit worker"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
