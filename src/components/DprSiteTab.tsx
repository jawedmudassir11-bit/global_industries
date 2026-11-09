import React, { useState } from 'react';
import {
  CloudSun,
  Mic,
  Camera,
  Share2,
  Plus,
  Trash2,
  Package,
  Sliders,
  CheckSquare,
  Wrench,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Clock,
  Copy,
  ExternalLink,
  Check,
  X,
  Zap
} from 'lucide-react';
import {
  AppState,
  DPRRecord,
  MaterialEntry,
  UserRole,
  calculateActiveStockMap,
  parseDutyInput,
  generateEndOfDayWhatsAppSummary
} from '../utils/siteLogic';

interface DprSiteTabProps {
  appState: AppState;
  dateKey: string;
  selectedDay: number;
  monthKey: string;
  userRole: UserRole;
  userName: string;
  siteName?: string;
  subgroupName?: string;
  isMasterRollup: boolean;
  onUpdateDPR: (dateKey: string, updated: DPRRecord) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPhotoLightbox: (url: string, dateKey: string, idx: number) => void;
  onOpenStockThresholdModal: () => void;
  onAddTimelineNote: (text: string, priority: 'General' | 'Urgent' | 'Safety') => void;
  onToggleTimelineNote: (dateKey: string, idx: number) => void;
  onDeleteTimelineNote: (dateKey: string, idx: number) => void;
  onAddEquipment: (name: string, operator: string, fuel: string, status: 'Operational' | 'Maintenance' | 'Idle') => void;
  onCycleEquipmentStatus: (idx: number) => void;
  onDeleteEquipment: (idx: number) => void;
  onRequireAuth: () => void;
  showToast: (msg: string) => void;
}

const MATERIAL_UNITS = [
  'Bag',
  'Kg',
  'MT (Metric Tonne)',
  'cum (m³)',
  'cft',
  'Nos',
  'Pcs',
  'Liter (L)',
  'sqm (m²)',
  'sqft',
  'm',
  'ft',
  'Bundle'
];

export const DprSiteTab: React.FC<DprSiteTabProps> = ({
  appState,
  dateKey,
  selectedDay,
  monthKey,
  userRole,
  userName,
  siteName,
  subgroupName,
  isMasterRollup,
  onUpdateDPR,
  onPhotoUpload,
  onOpenPhotoLightbox,
  onOpenStockThresholdModal,
  onAddTimelineNote,
  onToggleTimelineNote,
  onDeleteTimelineNote,
  onAddEquipment,
  onCycleEquipmentStatus,
  onDeleteEquipment,
  onRequireAuth,
  showToast
}) => {
  const [subTab, setSubTab] = useState<'dpr' | 'timeline' | 'equipment'>('dpr');
  const [isRecording, setIsRecording] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Timeline local state
  const [noteText, setNoteText] = useState('');
  const [notePriority, setNotePriority] = useState<'General' | 'Urgent' | 'Safety'>('General');
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');

  // Equipment local state
  const [eqName, setEqName] = useState('');
  const [eqOp, setEqOp] = useState('');
  const [eqFuel, setEqFuel] = useState('');
  const [eqStatus, setEqStatus] = useState<'Operational' | 'Maintenance' | 'Idle'>('Operational');
  const [showMusterRoll, setShowMusterRoll] = useState(false);

  const canEdit = (userRole === 'admin' || userRole === 'incharge' || userRole === 'supervisor') && !isMasterRollup;

  const currentDpr: DPRRecord = appState.dpr[dateKey] || {
    work: '',
    weather: '☀️ Sunny / Clear',
    rainStart: '',
    rainEnd: '',
    workStop: 'No',
    matReceived: [],
    matConsumed: [],
    photos: []
  };

  const handleFieldChange = (patch: Partial<DPRRecord>) => {
    if (!canEdit) {
      onRequireAuth();
      return;
    }
    onUpdateDPR(dateKey, {
      ...currentDpr,
      ...patch
    });
  };

  const handleMaterialChange = (
    type: 'matReceived' | 'matConsumed',
    idx: number,
    field: keyof MaterialEntry,
    value: string
  ) => {
    if (!canEdit) {
      onRequireAuth();
      return;
    }
    const list = [...(currentDpr[type] || [])];
    list[idx] = { ...list[idx], [field]: value };
    handleFieldChange({ [type]: list });
  };

  const addMaterialRow = (type: 'matReceived' | 'matConsumed') => {
    if (!canEdit) {
      onRequireAuth();
      return;
    }
    const list = [...(currentDpr[type] || []), { item: '', qty: '', unit: 'Bag' }];
    handleFieldChange({ [type]: list });
  };

  const removeMaterialRow = (type: 'matReceived' | 'matConsumed', idx: number) => {
    if (!canEdit) {
      onRequireAuth();
      return;
    }
    const list = (currentDpr[type] || []).filter((_, i) => i !== idx);
    handleFieldChange({ [type]: list });
  };

  const startVoiceDictation = () => {
    if (!canEdit) {
      onRequireAuth();
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Voice dictation is not supported in this browser.');
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    setIsRecording(true);
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const nextWork = (currentDpr.work ? currentDpr.work + ' ' : '') + transcript + '.';
      handleFieldChange({ work: nextWork });
    };
    rec.onend = () => {
      setIsRecording(false);
      showToast('Voice dictation added.');
    };
    rec.onerror = () => {
      setIsRecording(false);
      showToast('Microphone access unavailable.');
    };
    rec.start();
  };

  const shareDPRWhatsApp = () => {
    const monthAtt = appState.attendance[monthKey] || {};
    let tPresent = 0,
      tAbsent = 0;
    const tradeCounts: Record<string, number> = {};
    appState.workers.forEach(w => {
      const r = monthAtt[w.id] && monthAtt[w.id][selectedDay];
      if ((parseDutyInput(r?.duty) || 0) > 0) {
        tPresent++;
        tradeCounts[w.desig] = (tradeCounts[w.desig] || 0) + 1;
      } else {
        tAbsent++;
      }
    });

    let text = `*GLOBAL INDUSTRIES - DAILY SITE REPORT*\n*Date:* ${dateKey}\n*Weather:* ${currentDpr.weather}\n\n*WORKFORCE SUMMARY*\nRegistered: ${appState.workers.length} | Present: ${tPresent} | Absent: ${tAbsent}\n`;
    if (Object.keys(tradeCounts).length > 0) {
      text += `\n*Trades Present:*\n`;
      Object.entries(tradeCounts).forEach(([tr, c]) => {
        text += `- ${tr}: ${c}\n`;
      });
    }
    text += `\n*WORK ALLOCATION*\n${currentDpr.work || 'Standard site operations.'}\n`;
    if (currentDpr.weather.includes('Rain') || currentDpr.rainStart) {
      text += `\n*Rain Window:* ${currentDpr.rainStart || 'N/A'} to ${currentDpr.rainEnd || 'N/A'} (Stopped: ${currentDpr.workStop})\n`;
    }
    text += `\n*MATERIALS RECEIVED (CHALANI LOG):*\n`;
    if (!currentDpr.matReceived || currentDpr.matReceived.length === 0) text += `- None\n`;
    else
      currentDpr.matReceived.forEach(m => {
        const meta = [m.challan ? `Challan: ${m.challan}` : '', m.supplier ? `Party: ${m.supplier}` : '']
          .filter(Boolean)
          .join(', ');
        text += `- ${m.item}: ${m.qty} ${m.unit}${meta ? ` (${meta})` : ''}\n`;
      });
    text += `\n*MATERIALS CONSUMED:*\n`;
    if (!currentDpr.matConsumed || currentDpr.matConsumed.length === 0) text += `- None\n`;
    else currentDpr.matConsumed.forEach(m => (text += `- ${m.item}: ${m.qty} ${m.unit}\n`));

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const stockMap = calculateActiveStockMap(appState.dpr);
  const stockEntries = Object.entries(stockMap);
  const lowStockCount = stockEntries.filter(([name, info]) => {
    const minAlert =
      typeof appState.stockThresholds?.[name] === 'number' ? appState.stockThresholds[name] : 5;
    return info.qty <= minAlert;
  }).length;
  const notes = appState.timeline[dateKey] || [];
  const completedNotesCount = notes.filter(n => n.completed).length;

  const filteredNotes = notes
    .map((n, idx) => ({ note: n, idx }))
    .filter(({ note }) => {
      if (timelineFilter === 'PENDING') return !note.completed;
      if (timelineFilter === 'COMPLETED') return note.completed;
      if (timelineFilter === 'Urgent' || timelineFilter === 'Safety' || timelineFilter === 'General') {
        return note.priority === timelineFilter;
      }
      return true;
    });

  const eqList = appState.equipment || [];
  const monthAtt = appState.attendance[monthKey] || {};
  const presentWorkersList = appState.workers.filter(w => {
    const r = monthAtt[w.id] && monthAtt[w.id][selectedDay];
    return (parseDutyInput(r?.duty) || 0) > 0;
  });

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSubTab('dpr')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer ${
              subTab === 'dpr'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span>DPR & Materials</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('timeline')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer ${
              subTab === 'timeline'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Site Checklist ({completedNotesCount}/{notes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('equipment')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer ${
              subTab === 'equipment'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Fleet & Safety ({eqList.length})</span>
          </button>
        </div>

        {subTab === 'dpr' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExecutiveModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
              title="1-Click 6:00 PM Summary for Head Office"
            >
              <MessageSquare className="w-4 h-4 text-emerald-100" />
              <span>6:00 PM WhatsApp Summary</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-800/70 text-emerald-100 font-extrabold">
                1-Tap
              </span>
            </button>
            <button
              type="button"
              onClick={shareDPRWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
              title="Quick raw DPR text"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Raw DPR</span>
            </button>
          </div>
        )}
      </div>

      {subTab === 'dpr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Weather & Work Log */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <span>Weather &amp; Downtime Tracker</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Track site climate &amp; 1-tap downtime delays during slab pours or shuttering
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{dateKey}</span>
              </div>

              {/* Weather Condition Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site Weather Condition
                </label>
                <select
                  value={currentDpr.weather}
                  onChange={e => handleFieldChange({ weather: e.target.value })}
                  aria-label="Site Weather Condition"
                  className="w-full px-3.5 py-2 text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="☀️ Sunny / Clear">☀️ Sunny / Clear</option>
                  <option value="☁️ Cloudy">☁️ Cloudy</option>
                  <option value="🌧 Light Rain">🌧 Light Rain</option>
                  <option value="⛈️ Heavy Rain">⛈️ Heavy Rain</option>
                  <option value="🌪️ High Wind / Storm">🌪️ High Wind / Storm</option>
                  <option value="🌫️ Extreme Fog / Low Visibility">🌫️ Extreme Fog / Low Visibility</option>
                </select>
              </div>

              {/* 1-Tap Weather Downtime & Delay Reason Tracker */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>1-Tap Delay / Idle Hours Tracker</span>
                  </span>
                  {currentDpr.downtimeReason && currentDpr.downtimeReason !== 'None' && (
                    <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      Active Delay
                    </span>
                  )}
                </div>

                {/* 1-Tap Preset Delay Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🌧️ Rain Stopped Work', reason: 'Rain Stopped Work', autoWorkStop: 'Yes', weather: '⛈️ Heavy Rain' },
                    { label: '⚡ Power Failure', reason: 'Power Failure', autoWorkStop: 'Yes', weather: '☁️ Cloudy' },
                    { label: '🚚 Material Stockout', reason: 'Material Stockout / Cement Delay', autoWorkStop: 'Yes' },
                    { label: '🚜 Machine Breakdown', reason: 'Machinery / Mixer Breakdown', autoWorkStop: 'Yes' },
                    { label: '🌊 Slush / Waterlogged', reason: 'Waterlogging & Slush', autoWorkStop: 'Yes', weather: '🌧 Light Rain' },
                    { label: '☀️ No Downtime', reason: 'None', autoWorkStop: 'No', weather: '☀️ Sunny / Clear' }
                  ].map(t => {
                    const isSelected =
                      (t.reason === 'None' && (!currentDpr.downtimeReason || currentDpr.downtimeReason === 'None')) ||
                      currentDpr.downtimeReason === t.reason;

                    return (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            onRequireAuth();
                            return;
                          }
                          const clearing = t.reason === 'None' || currentDpr.downtimeReason === t.reason;
                          handleFieldChange({
                            downtimeReason: clearing ? 'None' : t.reason,
                            workStop: clearing ? 'No' : (t.autoWorkStop || currentDpr.workStop),
                            weather: (!clearing && t.weather) ? t.weather : currentDpr.weather,
                            downtimeHours: clearing ? '' : (currentDpr.downtimeHours || '2.0')
                          });
                        }}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 dark:bg-amber-600 text-white border-amber-600 dark:border-amber-500 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Additional Details when Downtime Reason is logged */}
                {currentDpr.downtimeReason && currentDpr.downtimeReason !== 'None' && (
                  <div className="space-y-2.5 pt-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                        Hours Lost / Work Paused:
                      </span>
                      {/* Quick Hour Chips */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {[
                          { l: '1h', v: '1.0' },
                          { l: '2h', v: '2.0' },
                          { l: 'Half Day (3.5h)', v: '3.5' },
                          { l: '4h', v: '4.0' },
                          { l: 'Full Day (8h)', v: '8.0' }
                        ].map(h => (
                          <button
                            key={h.l}
                            type="button"
                            onClick={() => handleFieldChange({ downtimeHours: h.v })}
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                              String(currentDpr.downtimeHours) === h.v
                                ? 'bg-amber-600 text-white border-amber-700'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-amber-200 dark:border-slate-700 hover:bg-amber-100'
                            }`}
                          >
                            {h.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Custom Idle Hours</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={currentDpr.downtimeHours || ''}
                          onChange={e => handleFieldChange({ downtimeHours: e.target.value })}
                          placeholder="e.g. 2.5"
                          className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Impact / Reason Details</span>
                        <input
                          type="text"
                          value={currentDpr.downtimeNotes || ''}
                          onChange={e => handleFieldChange({ downtimeNotes: e.target.value })}
                          placeholder="e.g. Concrete mixer motor burnt at 2 PM"
                          className="mt-0.5 w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 italic">
                        Logs reason for half-days or idle shifts during concrete pours.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleFieldChange({
                            downtimeReason: 'None',
                            downtimeHours: '',
                            downtimeNotes: '',
                            workStop: 'No'
                          })
                        }
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Reset Delay
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Rain Window (Visible if rain or if rain window recorded) */}
              {(currentDpr.weather.includes('Rain') || currentDpr.rainStart || currentDpr.workStop === 'Yes') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-500">Rain Start</span>
                    <input
                      type="time"
                      value={currentDpr.rainStart}
                      onChange={e => handleFieldChange({ rainStart: e.target.value })}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-500">Rain End</span>
                    <input
                      type="time"
                      value={currentDpr.rainEnd}
                      onChange={e => handleFieldChange({ rainEnd: e.target.value })}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-500">Work Stopped?</span>
                    <select
                      value={currentDpr.workStop}
                      onChange={e => handleFieldChange({ workStop: e.target.value })}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Work Allocation & Photos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Daily Work Allocation
                </h3>
                <button
                  type="button"
                  onClick={startVoiceDictation}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={currentDpr.work}
                onChange={e => handleFieldChange({ work: e.target.value })}
                placeholder="Describe today's site progress (e.g., RCC column casting at Grid B1-B6, rebar fabrication)..."
                aria-label="Daily Work Allocation Details"
                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors min-h-[40px]">
                  <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Attach Progress Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPhotoUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-500">
                  {currentDpr.photos?.length || 0} photo(s) attached
                </span>
              </div>

              {currentDpr.photos && currentDpr.photos.length > 0 && (
                <div className="flex items-center gap-2.5 flex-wrap pt-2">
                  {currentDpr.photos.map((url, idx) => (
                    <button
                      key={`${url}_${idx}`}
                      type="button"
                      onClick={() => onOpenPhotoLightbox(url, dateKey, idx)}
                      className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Site progress ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Materials Received / Consumed & Live Stock */}
          <div className="lg:col-span-6 space-y-4">
            {/* Materials Received */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Materials Received (Inward)
                </h3>
                <button
                  type="button"
                  onClick={() => addMaterialRow('matReceived')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>

              {(currentDpr.matReceived || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No inward materials logged for {dateKey}.</p>
              ) : (
                <div className="space-y-2">
                  {currentDpr.matReceived.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m.item}
                        onChange={e => handleMaterialChange('matReceived', idx, 'item', e.target.value)}
                        placeholder="Material name"
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        value={m.qty}
                        onChange={e => handleMaterialChange('matReceived', idx, 'qty', e.target.value)}
                        placeholder="Qty"
                        className="w-20 px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right tabular-nums"
                      />
                      <select
                        value={m.unit}
                        onChange={e => handleMaterialChange('matReceived', idx, 'unit', e.target.value)}
                        className="w-28 px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        {MATERIAL_UNITS.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMaterialRow('matReceived', idx)}
                        aria-label="Remove material row"
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Materials Consumed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Materials Consumed (Outward)
                </h3>
                <button
                  type="button"
                  onClick={() => addMaterialRow('matConsumed')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>

              {(currentDpr.matConsumed || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No consumed materials logged for {dateKey}.</p>
              ) : (
                <div className="space-y-2">
                  {currentDpr.matConsumed.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m.item}
                        onChange={e => handleMaterialChange('matConsumed', idx, 'item', e.target.value)}
                        placeholder="Material name"
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        value={m.qty}
                        onChange={e => handleMaterialChange('matConsumed', idx, 'qty', e.target.value)}
                        placeholder="Qty"
                        className="w-20 px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right tabular-nums"
                      />
                      <select
                        value={m.unit}
                        onChange={e => handleMaterialChange('matConsumed', idx, 'unit', e.target.value)}
                        className="w-28 px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        {MATERIAL_UNITS.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMaterialRow('matConsumed', idx)}
                        aria-label="Remove material row"
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Stock Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Site Stock Balance
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onOpenStockThresholdModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Min Alerts</span>
                </button>
              </div>

              {stockEntries.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Add inward and outward materials above to calculate real-time site balance.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stockEntries.map(([name, info]) => {
                    const minAlert =
                      typeof appState.stockThresholds?.[name] === 'number'
                        ? appState.stockThresholds[name]
                        : 5;
                    const isLow = info.qty <= minAlert;
                    return (
                      <div
                        key={name}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                          isLow
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{name}</span>
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Min threshold: {minAlert} {info.unit}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-mono font-bold tabular-nums shrink-0 ${
                            isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {info.qty} <span className="text-xs font-normal">{info.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={notePriority}
              onChange={e => setNotePriority(e.target.value as any)}
              aria-label="Note Priority"
              className="sm:w-36 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="General">General</option>
              <option value="Urgent">Urgent</option>
              <option value="Safety">Safety</option>
            </select>
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && noteText.trim()) {
                  onAddTimelineNote(noteText.trim(), notePriority);
                  setNoteText('');
                }
              }}
              placeholder="Add site instruction, safety check, or bottleneck..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => {
                if (!noteText.trim()) return;
                onAddTimelineNote(noteText.trim(), notePriority);
                setNoteText('');
              }}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 min-h-[42px] cursor-pointer"
            >
              Post Note
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['ALL', 'Urgent', 'Safety', 'General', 'PENDING', 'COMPLETED'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setTimelineFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timelineFilter === f
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredNotes.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No checklist items recorded for {dateKey}.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotes.map(({ note, idx }) => (
                <div key={note.id || idx} className="py-3 flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!note.completed}
                      onChange={() => onToggleTimelineNote(dateKey, idx)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="space-y-1 flex-1">
                      <div
                        className={`text-sm font-medium ${
                          note.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {note.text}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-semibold ${
                            note.priority === 'Urgent'
                              ? 'text-rose-600 dark:text-rose-400'
                              : note.priority === 'Safety'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {note.priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {note.author || 'Staff'} ({note.role || 'viewer'})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {new Date(note.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {note.completed && note.completedBy && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Done by {note.completedBy}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onDeleteTimelineNote(dateKey, idx)}
                      aria-label="Delete checklist note"
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'equipment' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Machinery Fleet & Safety Muster Command
                </h3>
                <p className="text-xs text-slate-500">
                  Track heavy equipment, operator logs, and run live emergency headcount checks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMusterRoll(!showMusterRoll)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors min-h-[40px] self-start cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{showMusterRoll ? 'Hide Muster Roll' : 'Run Emergency Muster Roll'}</span>
              </button>
            </div>

            {showMusterRoll && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Live Emergency Muster Roll ({dateKey}) — {presentWorkersList.length} / {appState.workers.length} On-Site Workers Accounted For
                </div>
                {presentWorkersList.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    No workers marked present on Day {selectedDay} yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {presentWorkersList.map((w, i) => (
                      <div
                        key={w.id}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {i + 1}. {w.name}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
                          {w.desig} · PPE OK
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add Equipment Form */}
            {canEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={eqName}
                  onChange={e => setEqName(e.target.value)}
                  placeholder="Asset / Machine Name"
                  className="sm:col-span-2 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <input
                  type="text"
                  value={eqOp}
                  onChange={e => setEqOp(e.target.value)}
                  placeholder="Operator Name"
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <input
                  type="text"
                  value={eqFuel}
                  onChange={e => setEqFuel(e.target.value)}
                  placeholder="Hours / Fuel Log"
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!eqName.trim()) {
                      showToast('Enter an equipment name.');
                      return;
                    }
                    onAddEquipment(eqName.trim(), eqOp.trim() || 'Operator', eqFuel.trim() || 'Active', eqStatus);
                    setEqName('');
                    setEqOp('');
                    setEqFuel('');
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  + Add Asset
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {eqList.map((eq, idx) => (
              <div
                key={eq.id || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{eq.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Operator: <strong className="text-slate-700 dark:text-slate-300">{eq.operator}</strong> · Log: <span className="font-mono">{eq.fuel}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold shrink-0 ${
                      eq.status === 'Operational'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : eq.status === 'Maintenance'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {eq.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onCycleEquipmentStatus(idx)}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Cycle Status
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onDeleteEquipment(idx)}
                      aria-label={`Delete ${eq.name}`}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 1-TAP 6:00 PM WHATSAPP EXECUTIVE SUMMARY MODAL */}
      {isExecutiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exec-summary-title"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#152E4D] via-[#1E3A5F] to-[#0A192F] text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="exec-summary-title" className="text-sm font-bold flex items-center gap-2">
                    <span>6:00 PM WhatsApp Executive Summary</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-600/80 text-emerald-100 font-extrabold">
                      Head Office Ready
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Compiled directly from live attendance, OT, materials, &amp; delay records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExecutiveModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-100">
              {/* Optional Custom Phone Number Input */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label htmlFor="ho-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Send to Specific Manager / MD WhatsApp (Optional):
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Leave blank to open your WhatsApp chat selector
                  </span>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <span className="text-xs font-mono font-bold text-slate-500">+91</span>
                  <input
                    id="ho-phone"
                    type="tel"
                    maxLength={10}
                    value={customPhone}
                    onChange={e => setCustomPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9431XXXXXX"
                    className="w-full sm:w-36 px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Formatted Text Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Formatted Executive Message Preview:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Markdown formatted for WhatsApp (*bold*, lists, emojis)
                  </span>
                </div>
                <pre className="w-full max-h-72 p-3 text-xs font-mono leading-relaxed bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto overflow-y-auto whitespace-pre-wrap select-all border border-slate-800 shadow-inner">
                  {generateEndOfDayWhatsAppSummary({
                    siteName: siteName || 'Barsoi',
                    subgroupName: subgroupName || 'Madan',
                    dateKey,
                    selectedDay,
                    monthKey,
                    userName: userName || 'Site Incharge',
                    userRole,
                    workers: appState.workers,
                    keyPersons: appState.keyPersons,
                    attendance: appState.attendance,
                    kpAttendance: appState.kpAttendance,
                    dpr: appState.dpr
                  })}
                </pre>
              </div>
            </div>

            {/* Modal Footer / 1-Tap Action Bar */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Directly opens WhatsApp Web or Mobile app with full report pre-filled.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const text = generateEndOfDayWhatsAppSummary({
                      siteName: siteName || 'Barsoi',
                      subgroupName: subgroupName || 'Madan',
                      dateKey,
                      selectedDay,
                      monthKey,
                      userName: userName || 'Site Incharge',
                      userRole,
                      workers: appState.workers,
                      keyPersons: appState.keyPersons,
                      attendance: appState.attendance,
                      kpAttendance: appState.kpAttendance,
                      dpr: appState.dpr
                    });
                    try {
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(text).catch(() => {
                          const ta = document.createElement('textarea');
                          ta.value = text;
                          ta.style.position = 'fixed';
                          ta.style.opacity = '0';
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                        });
                      } else {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                      }
                    } catch {
                      // Silently continue
                    }
                    setCopiedSummary(true);
                    showToast('Summary copied to clipboard!');
                    setTimeout(() => setCopiedSummary(false), 2000);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const summaryText = generateEndOfDayWhatsAppSummary({
                      siteName: siteName || 'Barsoi',
                      subgroupName: subgroupName || 'Madan',
                      dateKey,
                      selectedDay,
                      monthKey,
                      userName: userName || 'Site Incharge',
                      userRole,
                      workers: appState.workers,
                      keyPersons: appState.keyPersons,
                      attendance: appState.attendance,
                      kpAttendance: appState.kpAttendance,
                      dpr: appState.dpr
                    });
                    const cleanPhone = customPhone.replace(/\D/g, '');
                    const waUrl = cleanPhone
                      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(summaryText)}`
                      : `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
                    window.open(waUrl, '_blank', 'noopener');
                    showToast('Opening WhatsApp with Executive Summary...');
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-100" />
                  <span>1-Tap Send on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-75" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
