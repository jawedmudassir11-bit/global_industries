export interface SubgroupNode {
  id: string;
  name: string;
}

export interface SiteNode {
  id: string;
  name: string;
  subgroups: SubgroupNode[];
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone?: string;
  desig: string;
  rate: number;
}

export interface KeyPersonProfile {
  id: string;
  name: string;
  phone?: string;
  desig: string;
}

export interface AttendanceRecord {
  duty: number | null;
  ot: number;
  adv: number;
  locked?: boolean;
  graceChances?: number;
}

export interface MaterialEntry {
  item: string;
  qty: string | number;
  unit: string;
  challan?: string;
  supplier?: string;
}

export interface DPRRecord {
  work: string;
  weather: string;
  rainStart: string;
  rainEnd: string;
  workStop: string;
  downtimeReason?: string;
  downtimeHours?: string | number;
  downtimeNotes?: string;
  matReceived: MaterialEntry[];
  matConsumed: MaterialEntry[];
  photos: string[];
}

export interface TimelineNote {
  id: string;
  text: string;
  priority: 'General' | 'Urgent' | 'Safety';
  completed: boolean;
  completedBy: string;
  completedAt: number | null;
  author: string;
  role: string;
  timestamp: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  operator: string;
  fuel: string;
  status: 'Operational' | 'Maintenance' | 'Idle';
}

export interface AppState {
  workers: WorkerProfile[];
  keyPersons: KeyPersonProfile[];
  attendance: Record<string, Record<string, Record<number, AttendanceRecord>>>;
  kpAttendance: Record<string, Record<string, Record<number, { duty: number | null; locked?: boolean }>>>;
  advances: Record<string, number>;
  dpr: Record<string, DPRRecord>;
  timeline: Record<string, TimelineNote[]>;
  stockThresholds: Record<string, number>;
  equipment: EquipmentItem[];
}

export type UserRole = 'viewer' | 'supervisor' | 'incharge' | 'admin';

/**
 * UNCHANGED FIREBASE DUAL-PROJECT CONFIGURATION
 * Project A: Primary Database (Text/Attendance Data)
 * Project B: Backup Database & Photo Storage
 */
export const FIREBASE_CONFIG_A = {
  databaseURL: "https://g12343-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "g12343"
} as const;

export const FIREBASE_CONFIG_B = {
  databaseURL: "https://global-industries-backup-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "global-industries-backup",
  storageBucket: "global-industries-backup.appspot.com"
} as const;

/**
 * UNCHANGED PIN / PASSWORD VERIFICATION
 * 9431 -> Admin
 * 1820 -> Site Incharge
 * 5566 -> Supervisor
 * 6767 -> Barrel Roll Easter Egg
 */
export function verifyPinPassword(pwd: string): {
  valid: boolean;
  role?: UserRole;
  message: string;
  easterEgg?: 'barrel-roll';
} {
  const clean = (pwd || '').trim();
  if (clean === '6767') {
    return { valid: false, easterEgg: 'barrel-roll', message: 'Barrel Roll Activated!' };
  }
  if (clean === '9431') {
    return { valid: true, role: 'admin', message: 'Admin Access Unlocked' };
  }
  if (clean === '1820') {
    return { valid: true, role: 'incharge', message: 'Site Incharge Mode Unlocked' };
  }
  if (clean === '5566') {
    return { valid: true, role: 'supervisor', message: 'Supervisor Mode Unlocked' };
  }
  return { valid: false, message: 'Invalid PIN provided.' };
}

export function parseDutyInput(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim().toUpperCase();
  if (s === 'P' || s === '1') return 1;
  if (s === 'H' || s === '0.5') return 0.5;
  if (s === 'A' || s === '0') return 0;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

export function getDutyDisplaySymbol(val: unknown): 'P' | 'H' | 'A' | '' {
  if (val === 1 || String(val).toUpperCase() === 'P') return 'P';
  if (val === 0.5 || String(val).toUpperCase() === 'H') return 'H';
  if (val === 0 || String(val).toUpperCase() === 'A') return 'A';
  return '';
}

export function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0][0].toUpperCase() : 'U';
}

export const DEFAULT_SITE_EQUIPMENT: EquipmentItem[] = [
  { id: 'eq_1', name: 'Tower Crane TC-01 (Potain)', operator: 'Rakesh Singh', fuel: '7.5h / Elec', status: 'Operational' },
  { id: 'eq_2', name: 'JCB 3DX Backhoe Loader', operator: 'Vikram Yadav', fuel: '6.0h / 42L Diesel', status: 'Operational' },
  { id: 'eq_3', name: 'Kirloskar 125kVA DG Set', operator: 'Manoj Kumar', fuel: '4.5h / 35L Diesel', status: 'Operational' },
  { id: 'eq_4', name: 'Ajax Fiori Transit Mixer', operator: 'Santosh Paswan', fuel: '5.0h / 28L Diesel', status: 'Maintenance' },
  { id: 'eq_5', name: 'Argon TIG/ARC Welding Bank (x6)', operator: 'Md. Irfan', fuel: '8.0h / Grid', status: 'Operational' },
  { id: 'eq_6', name: 'Safety PPE & Harness Locker (100 Sets)', operator: 'Safety Officer', fuel: '100% Inspected', status: 'Operational' }
];

export const DEFAULT_SEED_SITES: SiteNode[] = [
  {
    id: 'site_barsoi',
    name: 'Barsoi',
    subgroups: [
      { id: 'sub_madan', name: 'Madan' },
      { id: 'sub_tajuddin', name: 'TAJUDDIN' }
    ]
  }
];

export function createSeedAppState(monthKey: string, currentDay: number): AppState {
  const workers: WorkerProfile[] = [
    { id: 'w_101', name: 'Ramesh Kumar', phone: '9876543210', desig: 'Head Mason', rate: 800 },
    { id: 'w_102', name: 'Sanjay Paswan', phone: '9876543211', desig: 'Bar Bender', rate: 700 },
    { id: 'w_103', name: 'Md. Irfan Ansari', phone: '9876543212', desig: 'Welder (Argon)', rate: 850 },
    { id: 'w_104', name: 'Vikash Yadav', phone: '9876543213', desig: 'Carpenter', rate: 700 },
    { id: 'w_105', name: 'Dinesh Mandal', phone: '9876543214', desig: 'Helper', rate: 500 },
    { id: 'w_106', name: 'Arjun महतो (Mahto)', phone: '9876543215', desig: 'Fitter', rate: 750 }
  ];

  const keyPersons: KeyPersonProfile[] = [
    { id: 'kp_1', name: 'Er. Rajeshwar Prasad', phone: '9431001122', desig: 'Project Manager' },
    { id: 'kp_2', name: 'Amitabh Verma', phone: '9431001133', desig: 'Site Engineer' }
  ];

  const attendance: AppState['attendance'] = { [monthKey]: {} };
  workers.forEach((w, idx) => {
    attendance[monthKey][w.id] = {};
    const startD = Math.max(1, currentDay - 4);
    for (let d = startD; d <= currentDay; d++) {
      const isToday = d === currentDay;
      const duty = isToday ? (idx === 4 ? 0.5 : 1) : (idx % 5 === 0 && d === startD ? 0 : 1);
      const ot = isToday ? (idx % 2 === 0 ? 2 : 0) : (idx === 0 ? 1.5 : 0);
      const adv = d === currentDay - 1 && idx === 0 ? 500 : 0;
      attendance[monthKey][w.id][d] = { duty, ot, adv, locked: false, graceChances: 2 };
    }
  });

  const dateKey = `${currentDay}-${monthKey}`;
  const dpr: Record<string, DPRRecord> = {
    [dateKey]: {
      work: 'RCC column casting at Grid B1-B6 and structural steel truss alignment at Platform 2.',
      weather: '☀️ Sunny / Clear',
      rainStart: '',
      rainEnd: '',
      workStop: 'No',
      matReceived: [
        { item: 'OPC-53 Cement', qty: 120, unit: 'Bag' },
        { item: 'TMT Fe-500D Rebar', qty: 4.5, unit: 'MT (Metric Tonne)' }
      ],
      matConsumed: [
        { item: 'OPC-53 Cement', qty: 45, unit: 'Bag' },
        { item: 'TMT Fe-500D Rebar', qty: 1.2, unit: 'MT (Metric Tonne)' }
      ],
      photos: []
    }
  };

  const timeline: Record<string, TimelineNote[]> = {
    [dateKey]: [
      {
        id: 'note_seed_1',
        text: 'Verify column shuttering plumb & cover blocks before afternoon pour.',
        priority: 'Urgent',
        completed: false,
        completedBy: '',
        completedAt: null,
        author: 'Site Engineer',
        role: 'incharge',
        timestamp: Date.now() - 3600000
      },
      {
        id: 'note_seed_2',
        text: 'Safety harness & PPE check completed for elevation welding crew.',
        priority: 'Safety',
        completed: true,
        completedBy: 'Supervisor',
        completedAt: Date.now() - 1800000,
        author: 'Supervisor',
        role: 'supervisor',
        timestamp: Date.now() - 5400000
      }
    ]
  };

  return {
    workers,
    keyPersons,
    attendance,
    kpAttendance: {
      [monthKey]: {
        kp_1: { [currentDay]: { duty: 1, locked: false } },
        kp_2: { [currentDay]: { duty: 1, locked: false } }
      }
    },
    advances: { w_101: 1000, w_103: 500 },
    dpr,
    timeline,
    stockThresholds: { 'opc-53 cement': 30, 'tmt fe-500d rebar': 2 },
    equipment: DEFAULT_SITE_EQUIPMENT.map(e => ({ ...e }))
  };
}

export function sanitizeStructure(struct: unknown): SiteNode[] {
  if (!struct) return [];
  const rawArr = Array.isArray(struct) ? struct : Object.values(struct as Record<string, unknown>);
  return rawArr
    .filter(Boolean)
    .map((site: any) => {
      const rawSubs = site.subgroups
        ? Array.isArray(site.subgroups)
          ? site.subgroups
          : Object.values(site.subgroups)
        : [];
      return {
        id: String(site.id || `site_${Date.now()}`),
        name: String(site.name || 'Unnamed Site'),
        subgroups: rawSubs.filter(Boolean).map((sub: any) => ({
          id: String(sub.id || `sub_${Date.now()}`),
          name: String(sub.name || 'Unnamed Group')
        }))
      };
    });
}

export function sanitizeState(rawState: unknown): AppState {
  const s: any = rawState && typeof rawState === 'object' ? rawState : {};
  const wArr = Array.isArray(s.workers) ? s.workers : s.workers ? Object.values(s.workers) : [];
  const kpArr = Array.isArray(s.keyPersons) ? s.keyPersons : s.keyPersons ? Object.values(s.keyPersons) : [];

  const dprObj: Record<string, DPRRecord> =
    Array.isArray(s.dpr) ? Object.assign({}, s.dpr) : s.dpr ? { ...s.dpr } : {};

  Object.keys(dprObj).forEach(k => {
    const d: any = dprObj[k];
    if (d) {
      d.matReceived = Array.isArray(d.matReceived)
        ? d.matReceived.filter(Boolean)
        : d.matReceived
        ? Object.values(d.matReceived).filter(Boolean)
        : [];
      d.matConsumed = Array.isArray(d.matConsumed)
        ? d.matConsumed.filter(Boolean)
        : d.matConsumed
        ? Object.values(d.matConsumed).filter(Boolean)
        : [];
      d.photos = Array.isArray(d.photos)
        ? d.photos.filter(Boolean)
        : d.photos
        ? Object.values(d.photos).filter(Boolean)
        : [];
    }
  });

  const timelineObj: Record<string, TimelineNote[]> = {};
  if (s.timeline && typeof s.timeline === 'object') {
    Object.entries(s.timeline).forEach(([dk, notes]: [string, any]) => {
      const arr = Array.isArray(notes) ? notes : notes ? Object.values(notes) : [];
      timelineObj[dk] = arr.filter(Boolean);
    });
  }

  const eqArr = Array.isArray(s.equipment) && s.equipment.length > 0
    ? s.equipment.filter(Boolean)
    : DEFAULT_SITE_EQUIPMENT.map(e => ({ ...e }));

  return {
    workers: wArr.filter(Boolean).map((w: any) => ({
      id: String(w.id),
      name: String(w.name || ''),
      phone: w.phone ? String(w.phone) : '',
      desig: String(w.desig || 'Labor'),
      rate: parseFloat(w.rate) || 0
    })),
    keyPersons: kpArr.filter(Boolean).map((kp: any) => ({
      id: String(kp.id),
      name: String(kp.name || ''),
      phone: kp.phone ? String(kp.phone) : '',
      desig: String(kp.desig || 'Official')
    })),
    attendance: Array.isArray(s.attendance) ? Object.assign({}, s.attendance) : s.attendance || {},
    kpAttendance: Array.isArray(s.kpAttendance) ? Object.assign({}, s.kpAttendance) : s.kpAttendance || {},
    advances: Array.isArray(s.advances) ? Object.assign({}, s.advances) : s.advances || {},
    dpr: dprObj,
    timeline: timelineObj,
    stockThresholds:
      s.stockThresholds && typeof s.stockThresholds === 'object' && !Array.isArray(s.stockThresholds)
        ? s.stockThresholds
        : {},
    equipment: eqArr
  };
}

export function calculateWorkerMonthlySummary(
  worker: WorkerProfile,
  monthAtt: Record<string, Record<number, AttendanceRecord>> | undefined,
  openingAdvances: Record<string, number> | undefined,
  totalDaysInMonth: number
) {
  let totalDuty = 0;
  let totalOT = 0;
  let dailyAdv = 0;
  const workerDays = (monthAtt && monthAtt[worker.id]) || {};

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const rec = workerDays[d];
    if (rec) {
      const dutyNum = parseDutyInput(rec.duty);
      if (dutyNum !== null) totalDuty += dutyNum;
      totalOT += parseFloat(String(rec.ot)) || 0;
      dailyAdv += parseFloat(String(rec.adv)) || 0;
    }
  }

  const rate = parseFloat(String(worker.rate)) || 0;
  const grossAmount = totalDuty * rate + totalOT * (rate / 8);
  const openingAdv = (openingAdvances && parseFloat(String(openingAdvances[worker.id]))) || 0;
  const totalAdvance = openingAdv + dailyAdv;
  const netBalance = grossAmount - totalAdvance;

  return {
    totalDuty,
    totalOT,
    dailyAdv,
    openingAdv,
    totalAdvance,
    grossAmount,
    netBalance
  };
}

export function calculateSiteDashboardStats(
  appState: AppState,
  monthKey: string,
  selectedDay: number
) {
  const parts = monthKey.split('-');
  const m = parseInt(parts[0], 10) || 1;
  const y = parseInt(parts[1], 10) || 2026;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthAtt = appState.attendance[monthKey] || {};

  let presentToday = 0;
  let halfDayToday = 0;
  let absentToday = 0;
  let unmarkedToday = 0;
  let totalOT = 0;
  let totalGross = 0;
  let totalAdvance = 0;
  let totalNetBalance = 0;

  appState.workers.forEach(w => {
    const todayRec = monthAtt[w.id] && monthAtt[w.id][selectedDay];
    const dutyToday = todayRec ? parseDutyInput(todayRec.duty) : null;
    if (dutyToday === 1) {
      presentToday++;
    } else if (dutyToday === 0.5) {
      presentToday++;
      halfDayToday++;
    } else if (dutyToday === 0) {
      absentToday++;
    } else {
      unmarkedToday++;
    }

    const summary = calculateWorkerMonthlySummary(w, monthAtt, appState.advances, daysInMonth);
    totalOT += summary.totalOT;
    totalGross += summary.grossAmount;
    totalAdvance += summary.totalAdvance;
    totalNetBalance += summary.netBalance;
  });

  return {
    totalWorkers: appState.workers.length,
    presentToday,
    halfDayToday,
    absentToday,
    unmarkedToday,
    totalOT,
    totalGross,
    totalAdvance,
    totalNetBalance
  };
}

export function calculateActiveStockMap(dprMap: Record<string, DPRRecord>): Record<string, { qty: number; unit: string }> {
  const stockMap: Record<string, { qty: number; unit: string }> = {};
  Object.values(dprMap || {}).forEach(d => {
    if (!d) return;
    if (d.matReceived) {
      d.matReceived.forEach(m => {
        const name = (m.item || '').trim().toLowerCase();
        if (!name) return;
        if (!stockMap[name]) stockMap[name] = { qty: 0, unit: m.unit || 'Unit' };
        stockMap[name].qty += parseFloat(String(m.qty)) || 0;
        if (m.unit) stockMap[name].unit = m.unit;
      });
    }
    if (d.matConsumed) {
      d.matConsumed.forEach(m => {
        const name = (m.item || '').trim().toLowerCase();
        if (!name) return;
        if (!stockMap[name]) stockMap[name] = { qty: 0, unit: m.unit || 'Unit' };
        stockMap[name].qty -= parseFloat(String(m.qty)) || 0;
      });
    }
  });
  return stockMap;
}

/**
 * Attendance Auto-Lock for Supervisors & Site Incharge + Admin Full Access:
 * - Admin (9431) is NEVER locked; Admin can change anything at any time.
 * - Viewer is always locked (read-only).
 * - Both Supervisor (5566) and Site Incharge (1820) are auto-locked on days older than 24-48 hours
 *   (currentDay - day >= 2 or past months) or when a day has been manually locked by Admin.
 */
export function isDayAutoLockedForRole(
  userRole: UserRole,
  day: number,
  monthKey: string,
  currentDay: number,
  currentMonthKey: string,
  manualLocked?: boolean
): boolean {
  if (userRole === 'admin') {
    return false;
  }
  if (userRole === 'viewer') {
    return true;
  }
  // Both Supervisor (5566) and Site Incharge (1820):
  if (manualLocked) {
    return true;
  }
  if (monthKey !== currentMonthKey) {
    return true;
  }
  if (currentDay - day >= 2) {
    return true;
  }
  return false;
}

/**
 * 1-Tap End-of-Day 6:00 PM WhatsApp Executive Summary generator for Head Office.
 * Formats: Total Workforce Present, Trade Breakdown, Today's Overtime & Advances,
 * Weather & Downtime Delays, and Materials Received (Challan log).
 */
export function generateEndOfDayWhatsAppSummary(params: {
  siteName: string;
  subgroupName: string;
  dateKey: string;
  selectedDay: number;
  monthKey: string;
  userName?: string;
  userRole?: string;
  workers: WorkerProfile[];
  keyPersons?: KeyPersonProfile[];
  attendance: Record<string, Record<string, Record<number, AttendanceRecord>>>;
  kpAttendance?: Record<string, Record<string, Record<number, { duty: number | null }>>>;
  dpr: Record<string, DPRRecord>;
}): string {
  const {
    siteName,
    subgroupName,
    dateKey,
    selectedDay,
    monthKey,
    userName = 'Site Incharge',
    userRole = 'Supervisor',
    workers,
    keyPersons = [],
    attendance,
    kpAttendance = {},
    dpr
  } = params;

  const monthAtt = attendance[monthKey] || {};
  let totalPresent = 0;
  let fullDays = 0;
  let halfDays = 0;
  let absentCount = 0;
  let unmarkedCount = 0;
  let totalOT = 0;
  let workersWithOT = 0;
  let totalAdvance = 0;

  const tradeBreakdown: Record<string, { present: number; total: number }> = {};

  workers.forEach(w => {
    const trade = (w.desig || 'Unspecified').trim();
    if (!tradeBreakdown[trade]) {
      tradeBreakdown[trade] = { present: 0, total: 0 };
    }
    tradeBreakdown[trade].total++;

    const rec = monthAtt[w.id]?.[selectedDay];
    const dutyVal = parseDutyInput(rec?.duty);

    if (dutyVal === 1) {
      totalPresent++;
      fullDays++;
      tradeBreakdown[trade].present++;
    } else if (dutyVal === 0.5) {
      totalPresent++;
      halfDays++;
      tradeBreakdown[trade].present += 0.5;
    } else if (dutyVal === 0) {
      absentCount++;
    } else {
      unmarkedCount++;
    }

    if (rec?.ot && Number(rec.ot) > 0) {
      totalOT += Number(rec.ot);
      workersWithOT++;
    }
    if (rec?.adv && Number(rec.adv) > 0) {
      totalAdvance += Number(rec.adv);
    }
  });

  let kpPresent = 0;
  keyPersons.forEach(kp => {
    const kDuty = kpAttendance[monthKey]?.[kp.id]?.[selectedDay]?.duty;
    if (parseDutyInput(kDuty) !== null && (parseDutyInput(kDuty) || 0) > 0) {
      kpPresent++;
    }
  });

  const dprRec = dpr[dateKey];
  const weather = dprRec?.weather || '☀️ Sunny / Clear';
  const downtime = dprRec?.downtimeReason;
  const downtimeHrs = dprRec?.downtimeHours;
  const downtimeNotes = dprRec?.downtimeNotes;

  const percent = workers.length > 0 ? Math.round((totalPresent / workers.length) * 100) : 0;

  let text = `🏗️ *GLOBAL INDUSTRIES — 6:00 PM DAILY EXECUTIVE SITE SUMMARY*\n`;
  text += `🏢 *Site:* ${siteName} ➔ ${subgroupName}\n`;
  text += `📅 *Date:* ${dateKey}\n`;
  text += `👤 *Prepared By:* ${userName} (${userRole.toUpperCase()})\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  text += `👥 *LABOUR WORKFORCE (हाज़िरी)*\n`;
  text += `• Registered Strength: ${workers.length} Workers\n`;
  text += `• Total Present: *${totalPresent}* (${percent}%)\n`;
  text += `• Full Day (1.0): ${fullDays} | Half Day (0.5): ${halfDays}\n`;
  text += `• Absent (0.0): ${absentCount}${unmarkedCount > 0 ? ` | Unmarked: ${unmarkedCount}` : ''}\n`;
  if (keyPersons.length > 0) {
    text += `• Key Officials On Site: ${kpPresent} of ${keyPersons.length}\n`;
  }

  text += `\n🔨 *TRADE BREAKDOWN (उपस्थिति)*\n`;
  const tradeEntries = Object.entries(tradeBreakdown);
  if (tradeEntries.length === 0) {
    text += `• None registered\n`;
  } else {
    tradeEntries.forEach(([trade, stats]) => {
      text += `• ${trade}: ${stats.present} Present (of ${stats.total})\n`;
    });
  }

  text += `\n⏱️ *OVERTIME & CASH ADVANCES TODAY*\n`;
  text += `• Total Overtime Clocked: *${totalOT} Hrs* (${workersWithOT} workers)\n`;
  text += `• Site Cash Advances Paid: ₹${totalAdvance.toLocaleString('en-IN')}\n`;

  text += `\n⛈️ *WEATHER & DOWNTIME TRACKER*\n`;
  text += `• Weather Condition: ${weather}\n`;
  if (downtime && downtime !== 'None' && downtime !== 'No Downtime') {
    text += `• ⚠️ *Downtime Delay:* ${downtime}${downtimeHrs ? ` (${downtimeHrs} hrs lost)` : ''}\n`;
    if (downtimeNotes) text += `• *Downtime Reason / Impact:* ${downtimeNotes}\n`;
  } else {
    text += `• Downtime Delay: None (Continuous full-shift work)\n`;
  }

  text += `\n📦 *MATERIALS RECEIVED TODAY (CHALANI LOG)*\n`;
  if (!dprRec?.matReceived || dprRec.matReceived.length === 0) {
    text += `• None received today\n`;
  } else {
    dprRec.matReceived.forEach(m => {
      const meta = [m.challan ? `Challan: ${m.challan}` : '', m.supplier ? `Party: ${m.supplier}` : '']
        .filter(Boolean)
        .join(', ');
      text += `• ${m.item}: ${m.qty} ${m.unit}${meta ? ` (${meta})` : ''}\n`;
    });
  }

  text += `\n🧱 *MATERIALS CONSUMED TODAY*\n`;
  if (!dprRec?.matConsumed || dprRec.matConsumed.length === 0) {
    text += `• None recorded\n`;
  } else {
    dprRec.matConsumed.forEach(m => {
      text += `• ${m.item}: ${m.qty} ${m.unit}\n`;
    });
  }

  text += `\n📝 *DAILY WORK ALLOCATION & TASKS*\n`;
  text += `${dprRec?.work?.trim() || 'Standard site operations and construction activities.'}\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Dispatched via Global Industries Portal_`;

  return text;
}

