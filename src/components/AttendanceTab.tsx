import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  CheckCheck,
  Lock,
  ArrowLeftRight,
  Calendar,
  Award,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  AppState,
  UserRole,
  WorkerProfile,
  getInitials,
  parseDutyInput
} from '../utils/siteLogic';

interface AttendanceTabProps {
  appState: AppState;
  selectedDay: number;
  monthKey: string;
  userRole: UserRole;
  isMasterRollup: boolean;
  isDayAutoLocked: boolean;
  isDayManuallyLocked: boolean;
  isWorkerDayLocked: (wId: string, day: number) => boolean;
  onSetDailyDuty: (wId: string, day: number, duty: number, type: 'worker' | 'kp') => void;
  onSetDailyOT: (wId: string, day: number, ot: string) => void;
  onSetDailyAdv: (wId: string, day: number, adv: string) => void;
  onMarkAllPresent: () => void;
  onToggleDayLockForSupervisors: () => void;
  onOpenTransferModal: (worker?: WorkerProfile) => void;
  onOpenAddModal: (type: 'worker' | 'key_person') => void;
  onOpenEditModal: (id: string, type: 'worker' | 'kp') => void;
  onDeleteWorker: (id: string, type: 'worker' | 'kp') => void;
  onOpenWorkerProfile: (wId: string) => void;
  onRequireAuth: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  appState,
  selectedDay,
  monthKey,
  userRole,
  isMasterRollup,
  isDayAutoLocked,
  isDayManuallyLocked,
  isWorkerDayLocked,
  onSetDailyDuty,
  onSetDailyOT,
  onSetDailyAdv,
  onMarkAllPresent,
  onToggleDayLockForSupervisors,
  onOpenTransferModal,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteWorker,
  onOpenWorkerProfile,
  onRequireAuth
}) => {
  const [subView, setSubView] = useState<'workers' | 'officials'>('workers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'P' | 'H' | 'A' | 'U'>('ALL');
  const [tradeFilter, setTradeFilter] = useState<string>('ALL');

  const canManage = userRole === 'admin' || userRole === 'incharge' || userRole === 'supervisor';
  const monthAtt = appState.attendance[monthKey] || {};

  const getWorkerRec = (wId: string, d: number) => {
    return (monthAtt[wId] && monthAtt[wId][d]) || { duty: null, ot: 0, adv: 0 };
  };

  const getKpRec = (kpId: string, d: number) => {
    if (appState.kpAttendance?.[monthKey]?.[kpId]?.[d]) {
      return appState.kpAttendance[monthKey][kpId][d];
    }
    const fallback: any = appState.kpAttendance?.[kpId];
    if (fallback && fallback[d] && typeof fallback[d].duty !== 'undefined') {
      return fallback[d];
    }
    return { duty: null, locked: false };
  };

  // Compute counts for filter tabs
  let cntP = 0,
    cntH = 0,
    cntA = 0,
    cntU = 0;
  const tradeCounts: Record<string, number> = {};

  appState.workers.forEach(w => {
    const rec = getWorkerRec(w.id, selectedDay);
    const dVal = parseDutyInput(rec.duty);
    if (dVal === 1) cntP++;
    else if (dVal === 0.5) cntH++;
    else if (dVal === 0) cntA++;
    else cntU++;
    const tr = (w.desig || 'Unspecified').trim();
    tradeCounts[tr] = (tradeCounts[tr] || 0) + 1;
  });

  const filteredWorkers = appState.workers.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      w.name.toLowerCase().includes(q) ||
      (w.desig && w.desig.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (tradeFilter !== 'ALL' && (w.desig || 'Unspecified').trim() !== tradeFilter) return false;
    if (statusFilter !== 'ALL') {
      const dVal = parseDutyInput(getWorkerRec(w.id, selectedDay).duty);
      if (statusFilter === 'P' && dVal !== 1) return false;
      if (statusFilter === 'H' && dVal !== 0.5) return false;
      if (statusFilter === 'A' && dVal !== 0) return false;
      if (statusFilter === 'U' && dVal !== null) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Sub-View Switch & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubView('workers')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
              subView === 'workers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Labour Workforce ({appState.workers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('officials')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
              subView === 'officials'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Officials & Key Staff ({appState.keyPersons.length})
          </button>
        </div>

        {/* Context Action Buttons (Clean: Mark All Present, Transfer Worker, Day Lock Override, Add Worker) */}
        <div className="flex items-center gap-2 flex-wrap">
          {subView === 'workers' && !isMasterRollup && (
            <>
              <button
                type="button"
                onClick={canManage && !isDayAutoLocked ? onMarkAllPresent : onRequireAuth}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={canManage ? () => onOpenTransferModal() : onRequireAuth}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
                title="Move or Copy Worker Between Groups/Sites"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Transfer Worker</span>
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onOpenAddModal('worker')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Worker</span>
                </button>
              )}
            </>
          )}
          {subView === 'officials' && canManage && (
            <button
              type="button"
              onClick={() => onOpenAddModal('key_person')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Official</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Auto-Lock Banner for Supervisors & Site Incharge (Admin never sees this and can edit anything at any time) */}
      {isDayAutoLocked && userRole !== 'admin' && subView === 'workers' && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Attendance Auto-Locked (&gt;48h Old):</strong> Past records are locked for <strong>Supervisors (5566)</strong> and <strong>Site Incharge (1820)</strong>. Only <strong>Admin (9431)</strong> can modify past attendance at any time.
            </span>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Admin Unlock
          </button>
        </div>
      )}

      {isMasterRollup && subView === 'workers' && (
        <div className="px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
          <span>
            <strong>Master Roll-Up Active:</strong> Viewing combined attendance across all groups in this site. Select a specific subgroup from the top site switcher to edit worker attendance.
          </span>
        </div>
      )}

      {subView === 'workers' ? (
        <>
          {/* Search & Compact Filter Bar */}
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search worker name or trade..."
                aria-label="Search worker name or trade"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Segmented Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {[
                { k: 'ALL', l: `All (${appState.workers.length})` },
                { k: 'P', l: `Present (${cntP})` },
                { k: 'H', l: `Half (${cntH})` },
                { k: 'A', l: `Absent (${cntA})` },
                { k: 'U', l: `Unmarked (${cntU})` }
              ].map(item => (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => setStatusFilter(item.k as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer ${
                    statusFilter === item.k
                      ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.l}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Filter Row (only if multiple trades exist) */}
          {Object.keys(tradeCounts).length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setTradeFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tradeFilter === 'ALL'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Trades
              </button>
              {Object.entries(tradeCounts).map(([tr, cnt]) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTradeFilter(tr)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tradeFilter === tr
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tr} · {cnt}
                </button>
              ))}
            </div>
          )}

          {/* Worker List Grid - Compact & Mobile Ergonomic */}
          {filteredWorkers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {appState.workers.length === 0
                  ? 'No workers registered in this group yet.'
                  : 'No workers match the active search or filter.'}
              </p>
              {canManage && !isMasterRollup && appState.workers.length === 0 && (
                <button
                  type="button"
                  onClick={() => onOpenAddModal('worker')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register First Worker</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredWorkers.map(w => {
                const rec = getWorkerRec(w.id, selectedDay);
                const dutyVal = parseDutyInput(rec.duty);
                const locked = isWorkerDayLocked(w.id, selectedDay);

                return (
                  <div
                    key={w.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Row 1: Worker Identity + P / H / A Touch Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenWorkerProfile(w.id)}
                        className="flex items-center gap-2.5 text-left min-w-0 flex-1 group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(w.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {w.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                            <span className="truncate">{w.desig}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                              ₹{w.rate}/d
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Ergonomic 44x44px P / H / A Touch Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-label={`Mark ${w.name} Present`}
                          onClick={() =>
                            locked ? onRequireAuth() : onSetDailyDuty(w.id, selectedDay, 1, 'worker')
                          }
                          className={`min-w-[44px] min-h-[44px] px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            dutyVal === 1
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          } ${locked ? 'opacity-60' : ''}`}
                        >
                          <span>P</span>
                          <span className="text-[10px] font-mono opacity-80">1.0</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Mark ${w.name} Half Day`}
                          onClick={() =>
                            locked
                              ? onRequireAuth()
                              : onSetDailyDuty(w.id, selectedDay, 0.5, 'worker')
                          }
                          className={`min-w-[44px] min-h-[44px] px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            dutyVal === 0.5
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                          } ${locked ? 'opacity-60' : ''}`}
                        >
                          <span>H</span>
                          <span className="text-[10px] font-mono opacity-80">0.5</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Mark ${w.name} Absent`}
                          onClick={() =>
                            locked ? onRequireAuth() : onSetDailyDuty(w.id, selectedDay, 0, 'worker')
                          }
                          className={`min-w-[44px] min-h-[44px] px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            dutyVal === 0
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                          } ${locked ? 'opacity-60' : ''}`}
                        >
                          <span>A</span>
                          <span className="text-[10px] font-mono opacity-80">0.0</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Compact Inline OT (Hrs) & Advance (₹) + Calendar Link */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <label className="flex items-center justify-between gap-2 flex-1 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          OT (Hrs)
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          aria-label={`Overtime hours for ${w.name}`}
                          defaultValue={rec.ot || ''}
                          key={`ot_${w.id}_${selectedDay}_${rec.ot}`}
                          readOnly={locked}
                          onClick={() => {
                            if (locked) onRequireAuth();
                          }}
                          onBlur={e => {
                            if (!locked) onSetDailyOT(w.id, selectedDay, e.target.value);
                          }}
                          placeholder="0"
                          className="w-14 text-right text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none tabular-nums"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-2 flex-1 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          Adv (₹)
                        </span>
                        <input
                          type="number"
                          step="50"
                          min="0"
                          aria-label={`Advance amount for ${w.name}`}
                          defaultValue={rec.adv || ''}
                          key={`adv_${w.id}_${selectedDay}_${rec.adv}`}
                          readOnly={locked}
                          onClick={() => {
                            if (locked) onRequireAuth();
                          }}
                          onBlur={e => {
                            if (!locked) onSetDailyAdv(w.id, selectedDay, e.target.value);
                          }}
                          placeholder="0"
                          className="w-16 text-right text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none tabular-nums"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onOpenWorkerProfile(w.id)}
                        title="View Worker Calendar & Ledger"
                        aria-label={`View ${w.name} Calendar and Ledger`}
                        className="min-w-[36px] min-h-[34px] px-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {locked ? <Lock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* OFFICIALS & KEY PERSONNEL SUB-VIEW */
        <div className="space-y-3">
          {appState.keyPersons.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No key personnel or officials registered yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {appState.keyPersons.map(kp => {
                const rec = getKpRec(kp.id, selectedDay);
                const dutyVal = parseDutyInput(rec.duty);
                const locked = userRole === 'viewer';

                return (
                  <div
                    key={kp.id}
                    className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(kp.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{kp.name}</span>
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </div>
                          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium truncate">
                            {kp.desig} {kp.phone ? `· ${kp.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(kp.id, 'kp')}
                            aria-label={`Edit ${kp.name}`}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteWorker(kp.id, 'kp')}
                            aria-label={`Delete ${kp.name}`}
                            className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          locked ? onRequireAuth() : onSetDailyDuty(kp.id, selectedDay, 1, 'kp')
                        }
                        className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          dutyVal === 1
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          locked ? onRequireAuth() : onSetDailyDuty(kp.id, selectedDay, 0.5, 'kp')
                        }
                        className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          dutyVal === 0.5
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Half Day
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          locked ? onRequireAuth() : onSetDailyDuty(kp.id, selectedDay, 0, 'kp')
                        }
                        className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          dutyVal === 0
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
