import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  UserPlus,
  Calendar,
  Building2,
  Sparkles,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Layers,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import {
  WorkerProfile,
  SiteNode,
  AppState,
  UserRole,
  verifyPinPassword,
  calculateWorkerMonthlySummary,
  getDutyDisplaySymbol
} from '../utils/siteLogic';

// 1. PIN LOGIN MODAL
interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole, msg: string) => void;
  onBarrelRoll: () => void;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onBarrelRoll
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyPinPassword(pin);
    if (res.easterEgg === 'barrel-roll') {
      onBarrelRoll();
      onClose();
      return;
    }
    if (res.valid && res.role) {
      onSuccess(res.role, res.message);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 id="pin-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Unlock Role Access
              </h3>
              <p className="text-[11px] text-slate-500">Enter your 4-digit site authorization PIN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN modal"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="pin-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Authorization PIN
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={pin}
              onChange={e => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="••••"
              className="w-full px-4 py-2.5 text-center text-lg font-mono tracking-[0.4em] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-xs text-rose-600 font-medium mt-1.5 text-center">{error}</p>}
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setPin(prev => (prev.length < 6 ? prev + String(num) : prev))}
                className="py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-semibold text-xs"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setPin(prev => (prev.length < 6 ? prev + '0' : prev))}
              className="py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-mono font-bold text-sm text-slate-800 dark:text-slate-200"
            >
              0
            </button>
            <button
              type="submit"
              className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. WORKER ADD/EDIT MODAL WITH 80+ CATEGORIZED TRADES
interface WorkerFormModalProps {
  isOpen: boolean;
  editingWorker?: WorkerProfile | null;
  initialAdvance?: number;
  onClose: () => void;
  onSave: (workerData: {
    id?: string;
    name: string;
    desig: string;
    phone: string;
    rate: number;
    openingAdv?: number;
  }) => void;
}

export const TRADE_CATEGORIES: { category: string; trades: string[] }[] = [
  {
    category: '🧱 Civil, Masonry & Concrete',
    trades: [
      'Helper',
      'Labor',
      'Mason',
      'Head Mason (Raj Mistri)',
      'Plaster Mason',
      'Tile / Marble Mason',
      'Stone Mason',
      'Brick Layer',
      'Concrete Mixer Operator',
      'Vibrator Operator',
      'Concrete Pump Operator',
      'Curing Labor',
      'Core Cutter',
      'Grouting Technician',
      'Waterproofing Applicator'
    ]
  },
  {
    category: '🔩 Steel, BBS & Shuttering',
    trades: [
      'Bar Bender',
      'Head Bar Bender',
      'Steel Fixer',
      'Rebar Cutter',
      'Shuttering Carpenter',
      'Head Carpenter',
      'Finishing Carpenter',
      'Formwork Fitter',
      'Scaffolder',
      'Advanced Scaffolder',
      'Rigging & Staging Fitter'
    ]
  },
  {
    category: '🔥 Welding, Fabrication & Structural',
    trades: [
      'Welder',
      'Welder (Argon / TIG)',
      'Welder (ARC / SMAW)',
      'Welder (MIG / CO2)',
      'Structural Welder (6G)',
      'Gas Cutter',
      'Grinder Man',
      'Structural Fitter',
      'Pipe Fitter',
      'Millwright Fitter',
      'Mechanical Fitter',
      'Fabricator',
      'Rigger',
      'Heavy Rigger / Khalasi',
      'Sandblaster'
    ]
  },
  {
    category: '⚡ Electrical, MEP & Plumbing',
    trades: [
      'Electrician',
      'Industrial Electrician',
      'High Voltage Lineman',
      'Cable Jointer',
      'Tray Fitter',
      'Instrument Technician',
      'HVAC Technician',
      'AC Mechanic',
      'Plumber',
      'Pipe Layer',
      'Fire Fighting Fitter',
      'Pump Mechanic',
      'DG Set Operator',
      'Solar Panel Installer'
    ]
  },
  {
    category: '🚜 Heavy Equipment, Crane & Transport',
    trades: [
      'JCB / Backhoe Operator',
      'Excavator / Poclain Operator',
      'Tower Crane Operator',
      'Hydra / Mobile Crane Operator',
      'Batching Plant Operator',
      'Transit Mixer (TM) Driver',
      'Dumper / Tipper Driver',
      'Tractor Driver',
      'Road Roller Operator',
      'Grader / Paver Operator',
      'Forklift Operator',
      'Winch / Hoist Operator',
      'Light Vehicle Driver',
      'Diesel Mechanic',
      'Auto Electrician'
    ]
  },
  {
    category: '🚆 Railway, Bridge, Piling & Earthwork',
    trades: [
      'Piling Rig Operator',
      'Trackman / Gangman',
      'P-Way Fitter',
      'OHE Lineman',
      'Girder Launcher Crew',
      'Pre-Stressing / Stressing Tech',
      'Earthwork Mucking Labor',
      'Rock Breaker Operator',
      'Blaster / Driller',
      'Dewatering Pump Operator',
      'Gabion / Pitching Worker'
    ]
  },
  {
    category: '🎨 Finishing, Painting & Glazing',
    trades: [
      'Painter',
      'Spray Painter',
      'Industrial Epoxy Painter',
      'Putty / POP Worker',
      'False Ceiling Fitter',
      'Aluminum Fabricator',
      'Glass / Glazing Fitter',
      'Polisher',
      'Flooring Technician'
    ]
  },
  {
    category: '👷 Site Management, QA/QC, Survey & Support',
    trades: [
      'Supervisor',
      'Site Incharge',
      'Foreman',
      'General Foreman',
      'Site Engineer',
      'Civil Engineer',
      'Mechanical Engineer',
      'Electrical Engineer',
      'Planning Engineer',
      'Billing / QS Engineer',
      'QA/QC Engineer',
      'Lab Technician',
      'Surveyor (Total Station)',
      'Assistant Surveyor',
      'Safety Officer (HSE)',
      'Safety Steward',
      'Timekeeper',
      'Storekeeper',
      'Store Helper',
      'Accountant / Clerk',
      'Project Manager',
      'Security Guard',
      'Head Guard',
      'Housekeeping / Sweeper',
      'Water Boy / Pantry',
      'Cook / Mess Staff',
      'OWNER'
    ]
  }
];

export const ALL_WORKER_TRADES: string[] = Array.from(
  new Set(TRADE_CATEGORIES.flatMap(c => c.trades))
);

const QUICK_POPULAR_TRADES = [
  'Helper',
  'Labor',
  'Mason',
  'Head Mason (Raj Mistri)',
  'Bar Bender',
  'Shuttering Carpenter',
  'Steel Fixer',
  'Welder',
  'Welder (Argon / TIG)',
  'Fitter',
  'Pipe Fitter',
  'Electrician',
  'Plumber',
  'Rigger',
  'Scaffolder',
  'Painter',
  'JCB / Backhoe Operator',
  'Hydra / Mobile Crane Operator',
  'Dumper / Tipper Driver',
  'Surveyor (Total Station)',
  'Supervisor',
  'Foreman',
  'Site Engineer',
  'Safety Officer (HSE)',
  'Storekeeper',
  'Security Guard'
];

export const WorkerFormModal: React.FC<WorkerFormModalProps> = ({
  isOpen,
  editingWorker,
  initialAdvance = 0,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [desig, setDesig] = useState('Helper');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('650');
  const [openingAdv, setOpeningAdv] = useState('0');
  const [tradeSearch, setTradeSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingWorker) {
        setName(editingWorker.name);
        setDesig(editingWorker.desig || 'Helper');
        setPhone(editingWorker.phone || '');
        setRate(String(editingWorker.rate || 650));
        setOpeningAdv(String(initialAdvance || 0));
      } else {
        setName('');
        setDesig('Helper');
        setPhone('');
        setRate('650');
        setOpeningAdv('0');
      }
      setTradeSearch('');
      setError('');
    }
  }, [isOpen, editingWorker, initialAdvance]);

  if (!isOpen) return null;

  const filteredCategories = tradeSearch.trim()
    ? TRADE_CATEGORIES.map(cat => ({
        category: cat.category,
        trades: cat.trades.filter(t => t.toLowerCase().includes(tradeSearch.toLowerCase().trim()))
      })).filter(cat => cat.trades.length > 0)
    : TRADE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const numRate = parseFloat(rate);
    const numAdv = parseFloat(openingAdv) || 0;
    if (!cleanName) {
      setError('Worker full name is required.');
      return;
    }
    if (isNaN(numRate) || numRate <= 0) {
      setError('Valid daily wage rate (> ₹0) is required.');
      return;
    }
    onSave({
      id: editingWorker?.id,
      name: cleanName,
      desig: desig.trim() || 'Helper',
      phone: phone.trim(),
      rate: numRate,
      openingAdv: numAdv
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <h3 id="worker-modal-title" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {editingWorker ? 'Edit Worker Profile' : 'Register New Worker'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close worker form"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="worker-name-input" className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                Worker Full Name *
              </label>
              <input
                id="worker-name-input"
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="worker-phone-input" className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                Mobile Number (Optional)
              </label>
              <input
                id="worker-phone-input"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Comprehensive Trade / Designation Section (110+ Options + Quick Chips + Custom Input) */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="worker-trade-input" className="font-extrabold text-slate-700 dark:text-slate-200">
                Designation / Trade ({ALL_WORKER_TRADES.length}+ Site Trades Available)
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                Selected: {desig || 'None'}
              </span>
            </div>

            {/* Category Dropdown Selector + Custom Text Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                  1. Choose from All Categorized Trades:
                </span>
                <select
                  aria-label="Select Worker Trade from Directory"
                  value={ALL_WORKER_TRADES.includes(desig) ? desig : ''}
                  onChange={e => {
                    if (e.target.value) setDesig(e.target.value);
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- Browse {ALL_WORKER_TRADES.length}+ Trades by Category --</option>
                  {filteredCategories.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.trades.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                  2. Or Type / Search Any Custom Trade:
                </span>
                <input
                  id="worker-trade-input"
                  list="common-trades-list"
                  value={desig}
                  onChange={e => setDesig(e.target.value)}
                  placeholder="Type or select trade..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <datalist id="common-trades-list">
                  {ALL_WORKER_TRADES.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Quick-Tap Popular Trade Chips */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                Quick-Tap Popular Site Trades:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {QUICK_POPULAR_TRADES.map(t => {
                  const isActive = desig.toLowerCase() === t.toLowerCase();
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDesig(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="worker-rate-input" className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                Daily Rate (₹) *
              </label>
              <input
                id="worker-rate-input"
                type="number"
                min="1"
                value={rate}
                onChange={e => {
                  setRate(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="worker-adv-input" className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                Opening Advance (₹)
              </label>
              <input
                id="worker-adv-input"
                type="number"
                min="0"
                value={openingAdv}
                onChange={e => setOpeningAdv(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
            >
              {editingWorker ? 'Save Profile' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. WORKER PROFILE, CALENDAR & SETTLEMENT MODAL
interface WorkerProfileModalProps {
  worker: WorkerProfile | null;
  appState: AppState;
  monthKey: string;
  siteName: string;
  userRole?: UserRole;
  onClose: () => void;
  onRecordSettlement?: (workerId: string, amountPaid: number, note: string) => void;
  onOpenTransferModal?: (worker: WorkerProfile) => void;
}

export const WorkerProfileModal: React.FC<WorkerProfileModalProps> = ({
  worker,
  appState,
  monthKey,
  siteName,
  userRole = 'viewer',
  onClose,
  onRecordSettlement,
  onOpenTransferModal
}) => {
  const [settlementAmt, setSettlementAmt] = useState('');
  const [settlementNote, setSettlementNote] = useState('Wage Settlement');

  useEffect(() => {
    if (worker) {
      setSettlementAmt('');
      setSettlementNote('Mid-Month / Full Wage Settlement');
    }
  }, [worker]);

  if (!worker) return null;

  const parts = monthKey.split('-');
  const m = parseInt(parts[0], 10) || 1;
  const y = parseInt(parts[1], 10) || 2026;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthAtt = appState.attendance[monthKey] || {};
  const workerDays = monthAtt[worker.id] || {};
  const summary = calculateWorkerMonthlySummary(worker, monthAtt, appState.advances, daysInMonth);

  const advanceEntries = Object.entries(workerDays)
    .filter(([, rec]) => (parseFloat(String(rec.adv)) || 0) > 0)
    .map(([d, rec]) => ({ day: Number(d), amount: parseFloat(String(rec.adv)) || 0 }));

  const cleanPhone = (worker.phone || '').replace(/\D/g, '').slice(-10);
  const waTarget = cleanPhone.length === 10 ? `91${cleanPhone}` : '';

  const shareWhatsApp = () => {
    const msg =
      `*GLOBAL INDUSTRIES - WORKER WAGE LEDGER*\n` +
      `👤 *${worker.name}* (${worker.desig})\n` +
      `📍 Site: ${siteName} | Period: ${monthKey}\n` +
      `✅ हाज़िरी / Duties: ${summary.totalDuty} Days\n` +
      `⏱️ ओवरटाइम / OT: ${summary.totalOT} Hrs\n` +
      `💰 कुल कमाई / Gross: ₹${Math.round(summary.grossAmount).toLocaleString('en-IN')}\n` +
      `💸 एडवांस / Advance: ₹${Math.round(summary.totalAdvance).toLocaleString('en-IN')}\n` +
      `🏦 *कुल भुगतान / Net Balance: ₹${Math.round(summary.netBalance).toLocaleString('en-IN')}*`;
    window.open(
      `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const canManage = userRole === 'admin' || userRole === 'incharge' || userRole === 'supervisor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-ledger-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto tabular-nums"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 id="worker-ledger-title" className="text-base font-bold text-slate-900 dark:text-white">
              {worker.name}
            </h3>
            <p className="text-xs text-slate-500">
              {worker.desig} • ₹{worker.rate}/day • {worker.phone ? `📞 ${worker.phone} • ` : ''}{monthKey}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenTransferModal && canManage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransferModal(worker);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer"
                title="Move or Copy Worker to Another Group/Site"
              >
                <span>⇄ Transfer</span>
              </button>
            )}
            <button
              type="button"
              onClick={shareWhatsApp}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {cleanPhone ? 'WhatsApp Worker' : 'Share'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close worker ledger"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Duties</div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">{summary.totalDuty}d</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total OT</div>
            <div className="text-sm font-mono font-bold text-blue-600">{summary.totalOT}h</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Advances</div>
            <div className="text-sm font-mono font-bold text-rose-600">
              ₹{Math.round(summary.totalAdvance).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold">Net Pay</div>
            <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
              ₹{Math.round(summary.netBalance).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Partial Payment / Wage Settlement Tracker */}
        {onRecordSettlement && canManage && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 dark:text-blue-200">
                💳 Partial Payment & Wage Settlement Tracker
              </span>
              {summary.netBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setSettlementAmt(String(Math.round(summary.netBalance)))}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  Fill Full Net (₹{Math.round(summary.netBalance)})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="number"
                min="1"
                value={settlementAmt}
                onChange={e => setSettlementAmt(e.target.value)}
                placeholder="Amount Paid (₹)"
                aria-label="Settlement amount paid"
                className="px-3 py-1.5 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={settlementNote}
                onChange={e => setSettlementNote(e.target.value)}
                placeholder="Note (e.g. Cash / UPI)"
                aria-label="Settlement note"
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  const amt = parseFloat(settlementAmt);
                  if (!amt || amt <= 0) return;
                  onRecordSettlement(worker.id, amt, settlementNote.trim() || 'Wage Settlement');
                  setSettlementAmt('');
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Record Payment
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Recording a payment logs it to this worker&apos;s advance/settlement balance so any remaining amount carries forward accurately.
            </p>
          </div>
        )}

        {/* Attendance Calendar Grid */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Monthly Attendance Grid ({daysInMonth} Days)
          </h4>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const rec = workerDays[d];
              const sym = rec ? getDutyDisplaySymbol(rec.duty) : '';
              const badgeCls =
                sym === 'P'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : sym === 'H'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : sym === 'A'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400';

              return (
                <div
                  key={d}
                  className={`p-1.5 rounded-lg border text-center ${badgeCls}`}
                >
                  <div className="text-[10px] opacity-70">{d}</div>
                  <div className="text-xs font-mono font-bold">{sym || '-'}</div>
                  {rec?.ot ? <div className="text-[9px] font-mono text-blue-600">+{rec.ot}h</div> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Advance Ledger */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Advance & Settlement History
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1.5 px-3 rounded bg-slate-50 dark:bg-slate-800">
              <span>Opening Advance / Settlement Carryover</span>
              <strong className="font-mono text-rose-600">₹{summary.openingAdv}</strong>
            </div>
            {advanceEntries.map(item => (
              <div key={item.day} className="flex justify-between py-1.5 px-3 rounded bg-slate-50 dark:bg-slate-800">
                <span>Day {item.day} Cash Advance</span>
                <strong className="font-mono text-rose-600">₹{item.amount}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3B. WORKER TRANSFER / COPY BETWEEN GROUPS MODAL
interface WorkerTransferModalProps {
  isOpen: boolean;
  workers: WorkerProfile[];
  initialWorker?: WorkerProfile | null;
  sites: SiteNode[];
  currentSiteId: string;
  currentSubgroupId: string;
  onClose: () => void;
  onTransferWorker: (
    workerId: string,
    targetSiteId: string,
    targetSubgroupId: string,
    mode: 'move' | 'copy'
  ) => void;
}

export const WorkerTransferModal: React.FC<WorkerTransferModalProps> = ({
  isOpen,
  workers,
  initialWorker,
  sites,
  currentSiteId,
  currentSubgroupId,
  onClose,
  onTransferWorker
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [targetDest, setTargetDest] = useState<string>('');
  const [mode, setMode] = useState<'move' | 'copy'>('move');

  const destinationOptions = React.useMemo(() => {
    const list: { key: string; siteId: string; subId: string; label: string }[] = [];
    sites.forEach(s => {
      (s.subgroups || []).forEach(sub => {
        if (!(s.id === currentSiteId && sub.id === currentSubgroupId)) {
          list.push({
            key: `${s.id}__${sub.id}`,
            siteId: s.id,
            subId: sub.id,
            label: `🏢 ${s.name} ➔ 📍 ${sub.name}`
          });
        }
      });
    });
    return list;
  }, [sites, currentSiteId, currentSubgroupId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedWorkerId(initialWorker?.id || workers[0]?.id || '');
      setTargetDest(destinationOptions[0]?.key || '');
      setMode('move');
    }
  }, [isOpen, initialWorker, workers, destinationOptions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !targetDest) return;
    const [tSiteId, tSubId] = targetDest.split('__');
    if (!tSiteId || !tSubId) return;
    onTransferWorker(selectedWorkerId, tSiteId, tSubId, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 id="transfer-modal-title" className="text-sm font-extrabold text-slate-900 dark:text-white">
              ⇄ Transfer / Copy Worker Between Groups
            </h3>
            <p className="text-[11px] text-slate-500">
              Move or copy a worker to another group or site without re-typing details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transfer modal"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {destinationOptions.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            Create another group (e.g. via the top <strong>SITE</strong> dropdown ➔ <strong>+ GROUP</strong>) to transfer workers between groups.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                1. Select Worker
              </label>
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                aria-label="Select worker to transfer"
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.desig} • ₹{w.rate}/d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                2. Destination Site & Group
              </label>
              <select
                value={targetDest}
                onChange={e => setTargetDest(e.target.value)}
                aria-label="Select destination group"
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                {destinationOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                3. Transfer Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('move')}
                  className={`py-2 px-3 rounded-xl font-bold border text-xs cursor-pointer ${
                    mode === 'move'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Move Worker (Remove Here)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('copy')}
                  className={`py-2 px-3 rounded-xl font-bold border text-xs cursor-pointer ${
                    mode === 'copy'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Copy Worker (Keep in Both)
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-extrabold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {mode === 'move' ? 'Move Worker Now' : 'Copy Worker Now'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// 3C. CUSTOM LOW-STOCK THRESHOLDS MODAL
interface StockThresholdModalProps {
  isOpen: boolean;
  thresholds: Record<string, number>;
  activeMaterialNames: string[];
  onClose: () => void;
  onSaveThresholds: (nextThresholds: Record<string, number>) => void;
}

export const StockThresholdModal: React.FC<StockThresholdModalProps> = ({
  isOpen,
  thresholds,
  activeMaterialNames,
  onClose,
  onSaveThresholds
}) => {
  const [localMap, setLocalMap] = useState<Record<string, number>>({});
  const [newMatName, setNewMatName] = useState('');
  const [newMatMin, setNewMatMin] = useState('50');

  useEffect(() => {
    if (isOpen) {
      const merged: Record<string, number> = { ...thresholds };
      activeMaterialNames.forEach(name => {
        const k = name.toLowerCase().trim();
        if (k && typeof merged[k] !== 'number') {
          merged[k] = 10;
        }
      });
      setLocalMap(merged);
      setNewMatName('');
      setNewMatMin('50');
    }
  }, [isOpen, thresholds, activeMaterialNames]);

  if (!isOpen) return null;

  const handleAddRule = () => {
    const clean = newMatName.trim().toLowerCase();
    if (!clean) return;
    setLocalMap(prev => ({
      ...prev,
      [clean]: parseFloat(newMatMin) || 10
    }));
    setNewMatName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-threshold-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 id="stock-threshold-title" className="text-sm font-extrabold text-slate-900 dark:text-white">
              📦 Custom Low-Stock Alert Thresholds
            </h3>
            <p className="text-[11px] text-slate-500">
              Set minimum stock levels to trigger red low-stock alerts on DPR & Stock
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close low stock alerts modal"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
          {Object.entries(localMap).map(([mat, minVal]) => (
            <div
              key={mat}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
            >
              <span className="font-bold uppercase text-slate-800 dark:text-slate-200 truncate flex-1">
                {mat}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Min:</span>
                <input
                  type="number"
                  min="0"
                  value={minVal}
                  onChange={e =>
                    setLocalMap(prev => ({
                      ...prev,
                      [mat]: parseFloat(e.target.value) || 0
                    }))
                  }
                  className="w-20 px-2 py-1 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLocalMap(prev => {
                      const next = { ...prev };
                      delete next[mat];
                      return next;
                    })
                  }
                  aria-label={`Remove ${mat} threshold`}
                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <span className="font-bold text-slate-600 dark:text-slate-400 block">
            Add Material Alert Rule:
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMatName}
              onChange={e => setNewMatName(e.target.value)}
              placeholder="e.g. Diesel / River Sand"
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
            <input
              type="number"
              min="0"
              value={newMatMin}
              onChange={e => setNewMatMin(e.target.value)}
              placeholder="Min"
              className="w-20 px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right"
            />
            <button
              type="button"
              onClick={handleAddRule}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveThresholds(localMap);
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            Save Alert Rules
          </button>
        </div>
      </div>
    </div>
  );
};


// 4. SITE & SUBGROUP MANAGER MODAL
interface SiteManagerModalProps {
  isOpen: boolean;
  sites: SiteNode[];
  currentSiteId: string;
  currentSubgroupId: string;
  userRole: UserRole;
  onClose: () => void;
  onSelectSiteSubgroup: (siteId: string, subgroupId: string) => void;
  onAddSite: (siteName: string, firstSubgroupName: string) => void;
  onAddSubgroup: (siteId: string, subgroupName: string) => void;
}

export const SiteManagerModal: React.FC<SiteManagerModalProps> = ({
  isOpen,
  sites,
  currentSiteId,
  currentSubgroupId,
  userRole,
  onClose,
  onSelectSiteSubgroup,
  onAddSite,
  onAddSubgroup
}) => {
  const [newSiteName, setNewSiteName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  if (!isOpen) return null;

  const canManage = userRole === 'admin' || userRole === 'incharge';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 id="site-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
              Switch or Manage Sites & Blocks
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close site manager"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {sites.map(site => (
            <div
              key={site.id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>📍 {site.name}</span>
                <span className="text-[10px] text-slate-400">{site.subgroups.length} Subgroups</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {site.subgroups.map(sub => {
                  const active = site.id === currentSiteId && sub.id === currentSubgroupId;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        onSelectSiteSubgroup(site.id, sub.id);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-300">Add Subgroup to Current Site</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                placeholder="e.g. Block C - Mechanical"
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSubName.trim()) {
                    onAddSubgroup(currentSiteId, newSubName.trim());
                    setNewSubName('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-semibold"
              >
                + Subgroup
              </button>
            </div>

            <div className="font-bold text-slate-700 dark:text-slate-300 pt-1">Create New Project Site</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSiteName}
                onChange={e => setNewSiteName(e.target.value)}
                placeholder="New Site Name (e.g. Patna Metro)"
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSiteName.trim()) {
                    onAddSite(newSiteName.trim(), 'Main Civil Wing');
                    setNewSiteName('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
              >
                + New Site
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. UI & MOBILE IMPROVEMENT GUIDE MODAL
interface UiImprovementGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UiImprovementGuideModal: React.FC<UiImprovementGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-guide-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="ui-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                UI Declutter & Mobile Ergonomics Guide
              </h3>
              <p className="text-xs text-slate-500">
                What we improved while keeping your Firebase & PIN setup 100% intact
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close UI improvement guide"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-600" />
              1. Compact Mobile Top Bar & Bottom Nav
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Replaced the 2-tier letterhead + 8-button wrapping control bar + 11 horizontal tabs with a compact single-row header and a thumb-friendly <strong>4-tab Bottom Navigation Bar</strong> on mobile.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. High-Density Attendance Rows
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Shrank 240px-tall worker cards into scannable 72px rows with <strong>44×44px P / H / A touch targets</strong> and inline OT & Advance inputs—showing 5–6 workers at once on a phone screen.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              3. Consolidated 11 Tabs into 4 Focused Views
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Grouped scattered tools into <strong>Attendance</strong>, <strong>DPR & Site</strong> (Work, Weather, Stock, Checklist, Fleet), <strong>Register & Staff</strong>, and <strong>Slips & Reports</strong>. Replaced 70 novelty themes with outdoor-readable Light/Dark mode.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
            <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              4. Zero Changes to Firebase or Security
            </div>
            <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
              Preserved <code>g12343</code> (Primary RTDB), <code>global-industries-backup</code> (Backup RTDB & Storage), all database paths, and secure role-based authorization.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
