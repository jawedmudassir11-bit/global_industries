import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Calculator,
  MessageSquare,
  Sliders,
  HardHat,
  Receipt
} from 'lucide-react';
import {
  AppState,
  calculateWorkerMonthlySummary,
  parseDutyInput
} from '../utils/siteLogic';

declare global {
  interface Window {
    html2pdf?: any;
    XLSX?: any;
  }
}

interface ReportsSlipsTabProps {
  appState: AppState;
  monthKey: string;
  selectedDay: number;
  siteName: string;
  subgroupName: string;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ReportsSlipsTab: React.FC<ReportsSlipsTabProps> = ({
  appState,
  monthKey,
  selectedDay,
  siteName,
  subgroupName,
  onToast
}) => {
  const [subTab, setSubTab] = useState<'slips' | 'reports' | 'calculators'>('slips');

  // Wage Slips state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('ALL');
  const [slipStyle, setSlipStyle] = useState<'navy' | 'slate' | 'amber'>('navy');
  const [bilingualHindi, setBilingualHindi] = useState<boolean>(true);
  const slipsContainerRef = useRef<HTMLDivElement>(null);

  const sendWorkerWhatsAppSlip = (
    worker: AppState['workers'][number],
    s: ReturnType<typeof calculateWorkerMonthlySummary>
  ) => {
    const cleanPhone = (worker.phone || '').replace(/\D/g, '').slice(-10);
    const waTarget = cleanPhone.length === 10 ? `91${cleanPhone}` : '';
    const periodStr = `${MONTH_NAMES[monthNum]} ${yearNum}`;
    const msg = bilingualHindi
      ? `*GLOBAL INDUSTRIES - वेतन पर्ची / WAGE SLIP*\n` +
        `📍 *साइट / Site:* ${siteName} (${subgroupName})\n` +
        `📅 *माह / Month:* ${periodStr}\n` +
        `--------------------------------\n` +
        `👷 *नाम / Worker:* ${worker.name} (${worker.desig})\n` +
        `💵 *दर / Rate:* ₹${worker.rate}/दिन\n` +
        `✅ *हाज़िरी / Days Worked:* ${s.totalDuty} Days\n` +
        `⏱️ *ओवरटाइम / OT:* ${s.totalOT} Hrs\n` +
        `💰 *कुल कमाई / Gross Earned:* ₹${Math.round(s.grossAmount).toLocaleString('en-IN')}\n` +
        `💸 *कुल एडवांस / Total Advance:* ₹${Math.round(s.totalAdvance).toLocaleString('en-IN')}\n` +
        `🏦 *कुल भुगतान / Net Payable:* ₹${Math.round(s.netBalance).toLocaleString('en-IN')}`
      : `*GLOBAL INDUSTRIES - WAGE SLIP (${periodStr})*\n` +
        `📍 *Site:* ${siteName} (${subgroupName})\n` +
        `👷 *Worker:* ${worker.name} (${worker.desig})\n` +
        `💵 *Rate:* ₹${worker.rate}/day\n` +
        `✅ *Days Worked:* ${s.totalDuty} Days | *OT:* ${s.totalOT} Hrs\n` +
        `💰 *Gross Earned:* ₹${Math.round(s.grossAmount).toLocaleString('en-IN')}\n` +
        `💸 *Total Advance:* ₹${Math.round(s.totalAdvance).toLocaleString('en-IN')}\n` +
        `🏦 *Net Payable Balance:* ₹${Math.round(s.netBalance).toLocaleString('en-IN')}`;

    window.open(
      `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Date Report state
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

  const defaultIsoDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const firstOfMonthIso = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;

  const [reportMode, setReportMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState<string>(defaultIsoDate);
  const [rangeStart, setRangeStart] = useState<string>(firstOfMonthIso);
  const [rangeEnd, setRangeEnd] = useState<string>(defaultIsoDate);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Calculators state
  const [simHikePct, setSimHikePct] = useState<number>(0);
  const [simOtMult, setSimOtMult] = useState<number>(1);
  const [simRetentionPct, setSimRetentionPct] = useState<number>(5);

  // Concrete & Steel Calculator
  const [concVolume, setConcVolume] = useState<number>(10);
  const [concGrade, setConcGrade] = useState<'M15' | 'M20' | 'M25'>('M20');
  const [steelDia, setSteelDia] = useState<number>(12);
  const [steelLength, setSteelLength] = useState<number>(120);

  // RA Bill Calculator
  const [raGrossWork, setRaGrossWork] = useState<number>(850000);
  const [raGstPct, setRaGstPct] = useState<number>(18);
  const [raRetentionPct, setRaRetentionPct] = useState<number>(5);
  const [raTdsPct, setRaTdsPct] = useState<number>(2);
  const [raMobAdvRecovery, setRaMobAdvRecovery] = useState<number>(25000);

  const monthAtt = appState.attendance[monthKey] || {};

  const workersToRenderSlips = useMemo(() => {
    if (selectedWorkerId === 'ALL') return appState.workers;
    return appState.workers.filter(w => w.id === selectedWorkerId);
  }, [appState.workers, selectedWorkerId]);

  const handlePrintSlips = () => {
    window.print();
  };

  const handleDownloadSlipsPdf = () => {
    if (!window.html2pdf || !slipsContainerRef.current) {
      onToast('PDF generator not ready. Use Print button as fallback.', 'error');
      return;
    }
    onToast('Generating Wage Slips PDF...', 'info');
    const opt = {
      margin: 8,
      filename: `Wage_Slips_${siteName.replace(/\s+/g, '_')}_${monthKey}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(slipsContainerRef.current).save();
  };

  // Compute Custom Date / Range Report Data
  const reportResult = useMemo(() => {
    const startStr = reportMode === 'single' ? singleDate : rangeStart;
    const endStr = reportMode === 'single' ? singleDate : rangeEnd;

    const startObj = new Date(startStr + 'T00:00:00');
    const endObj = new Date(endStr + 'T00:00:00');

    const validRange = !isNaN(startObj.getTime()) && !isNaN(endObj.getTime()) && startObj <= endObj;
    if (!validRange) {
      return null;
    }

    const datesList: { d: number; m: number; y: number; mKey: string; dprKey: string; label: string }[] = [];
    const cur = new Date(startObj);
    let safety = 0;
    while (cur <= endObj && safety < 95) {
      const d = cur.getDate();
      const m = cur.getMonth() + 1;
      const y = cur.getFullYear();
      const mKey = `${m}-${y}`;
      const dprKey = `${d}-${m}-${y}`;
      datesList.push({
        d,
        m,
        y,
        mKey,
        dprKey,
        label: `${String(d).padStart(2, '0')} ${MONTH_NAMES[m]} ${y}`
      });
      cur.setDate(cur.getDate() + 1);
      safety++;
    }

    let totalDuty = 0;
    let totalOT = 0;
    let totalGross = 0;
    let totalAdv = 0;

    const workerRows = appState.workers.map(w => {
      let wDuty = 0;
      let wOT = 0;
      let wAdv = 0;

      datesList.forEach(dt => {
        const rec = appState.attendance[dt.mKey]?.[w.id]?.[dt.d];
        if (rec) {
          const dutyVal = parseDutyInput(rec.duty);
          if (dutyVal !== null) wDuty += dutyVal;
          wOT += parseFloat(String(rec.ot)) || 0;
          wAdv += parseFloat(String(rec.adv)) || 0;
        }
      });

      const wGross = wDuty * w.rate + wOT * (w.rate / 8);
      const wNet = wGross - wAdv;

      totalDuty += wDuty;
      totalOT += wOT;
      totalGross += wGross;
      totalAdv += wAdv;

      return {
        worker: w,
        duty: wDuty,
        ot: wOT,
        gross: wGross,
        adv: wAdv,
        net: wNet
      };
    });

    const dprEntries = datesList
      .map(dt => ({
        dateLabel: dt.label,
        dpr: appState.dpr[dt.dprKey]
      }))
      .filter(item => item.dpr && (item.dpr.work || item.dpr.matReceived?.length || item.dpr.matConsumed?.length));

    return {
      datesList,
      periodLabel:
        datesList.length === 1
          ? datesList[0].label
          : `${datesList[0]?.label} to ${datesList[datesList.length - 1]?.label} (${datesList.length} Days)`,
      totalDuty,
      totalOT,
      totalGross,
      totalAdv,
      totalNet: totalGross - totalAdv,
      workerRows,
      dprEntries
    };
  }, [reportMode, singleDate, rangeStart, rangeEnd, appState]);

  const handleExportReportExcel = () => {
    if (!window.XLSX || !reportResult) {
      onToast('Excel generator not ready', 'error');
      return;
    }
    const rows: any[][] = [
      ['GLOBAL INDUSTRIES - SITE REPORT'],
      ['Site', siteName, 'Subgroup', subgroupName],
      ['Period', reportResult.periodLabel],
      [],
      ['SL', 'Worker Name', 'Designation', 'Rate (₹)', 'Duties', 'OT (Hrs)', 'Gross Earned (₹)', 'Advance (₹)', 'Net Balance (₹)']
    ];

    reportResult.workerRows.forEach((r, idx) => {
      rows.push([
        idx + 1,
        r.worker.name,
        r.worker.desig,
        r.worker.rate,
        r.duty,
        r.ot,
        Math.round(r.gross),
        Math.round(r.adv),
        Math.round(r.net)
      ]);
    });

    rows.push([
      '',
      'TOTAL',
      '',
      '',
      reportResult.totalDuty,
      reportResult.totalOT,
      Math.round(reportResult.totalGross),
      Math.round(reportResult.totalAdv),
      Math.round(reportResult.totalNet)
    ]);

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(wb, ws, 'Site_Report');
    window.XLSX.writeFile(wb, `Site_Report_${siteName.replace(/\s+/g, '_')}.xlsx`);
    onToast('Site Report exported to Excel', 'success');
  };

  const handleShareReportWhatsApp = () => {
    if (!reportResult) return;
    let msg =
      `*GLOBAL INDUSTRIES - SITE REPORT*\n` +
      `📍 *Site:* ${siteName} (${subgroupName})\n` +
      `📅 *Period:* ${reportResult.periodLabel}\n` +
      `--------------------------------\n` +
      `👷 *Total Man-Days:* ${reportResult.totalDuty}\n` +
      `⏱️ *Total OT:* ${reportResult.totalOT} Hrs\n` +
      `💰 *Gross Wage:* ₹${Math.round(reportResult.totalGross).toLocaleString('en-IN')}\n` +
      `💸 *Advances:* ₹${Math.round(reportResult.totalAdv).toLocaleString('en-IN')}\n` +
      `🏦 *Net Liability:* ₹${Math.round(reportResult.totalNet).toLocaleString('en-IN')}\n`;

    if (reportResult.dprEntries.length > 0) {
      msg += `\n*DPR Highlights:*\n`;
      reportResult.dprEntries.slice(0, 3).forEach(e => {
        msg += `• ${e.dateLabel}: ${e.dpr.work || 'Material logged'}\n`;
      });
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  // Payroll Simulator Calculations
  const simPayroll = useMemo(() => {
    let baseGross = 0;
    let simGross = 0;
    let totalAdv = 0;

    appState.workers.forEach(w => {
      const s = calculateWorkerMonthlySummary(w, monthAtt, appState.advances, daysInMonth);
      baseGross += s.grossAmount;
      totalAdv += s.totalAdvance;

      const newRate = w.rate * (1 + simHikePct / 100);
      const newWorkerGross = s.totalDuty * newRate + s.totalOT * (newRate / 8) * simOtMult;
      simGross += newWorkerGross;
    });

    const retentionAmt = simGross * (simRetentionPct / 100);
    const netDisbursal = simGross - totalAdv - retentionAmt;
    return {
      baseGross,
      simGross,
      diff: simGross - baseGross,
      totalAdv,
      retentionAmt,
      netDisbursal
    };
  }, [appState.workers, monthAtt, appState.advances, daysInMonth, simHikePct, simOtMult, simRetentionPct]);

  // Concrete & Steel Calculations
  const concreteCalc = useMemo(() => {
    const dryVol = concVolume * 1.54;
    const ratios: Record<'M15' | 'M20' | 'M25', [number, number, number]> = {
      M15: [1, 2, 4],
      M20: [1, 1.5, 3],
      M25: [1, 1, 2]
    };
    const [c, s, a] = ratios[concGrade];
    const sum = c + s + a;
    const cementVol = (dryVol * c) / sum;
    const cementBags = Math.ceil(cementVol / 0.0347);
    const sandCft = Math.round(((dryVol * s) / sum) * 35.3147);
    const aggCft = Math.round(((dryVol * a) / sum) * 35.3147);
    const steelWeightKg = ((steelDia * steelDia) / 162.2) * steelLength;

    return {
      dryVol: dryVol.toFixed(2),
      cementBags,
      sandCft,
      aggCft,
      steelWeightKg: steelWeightKg.toFixed(1)
    };
  }, [concVolume, concGrade, steelDia, steelLength]);

  // RA Bill Calculations
  const raBillCalc = useMemo(() => {
    const gstAmt = raGrossWork * (raGstPct / 100);
    const totalInvoice = raGrossWork + gstAmt;
    const retentionDed = raGrossWork * (raRetentionPct / 100);
    const tdsDed = raGrossWork * (raTdsPct / 100);
    const netRelease = totalInvoice - retentionDed - tdsDed - raMobAdvRecovery;
    return {
      gstAmt,
      totalInvoice,
      retentionDed,
      tdsDed,
      netRelease
    };
  }, [raGrossWork, raGstPct, raRetentionPct, raTdsPct, raMobAdvRecovery]);

  const slipHeaderColor =
    slipStyle === 'navy'
      ? 'bg-slate-900 text-white'
      : slipStyle === 'slate'
      ? 'bg-blue-950 text-white'
      : 'bg-amber-900 text-white';

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab('slips')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'slips'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Wage Slips
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Date & Range Reports
          </button>
          <button
            type="button"
            onClick={() => setSubTab('calculators')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'calculators'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Engineering & Payroll Tools
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: WAGE SLIPS */}
      {subTab === 'slips' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                aria-label="Select worker for wage slip"
                className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Workers ({appState.workers.length} Slips)</option>
                {appState.workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.desig})
                  </option>
                ))}
              </select>

              <select
                value={slipStyle}
                onChange={e => setSlipStyle(e.target.value as 'navy' | 'slate' | 'amber')}
                aria-label="Wage slip header theme"
                className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="navy">Theme: Classic Navy</option>
                <option value="slate">Theme: Royal Slate</option>
                <option value="amber">Theme: Industrial Amber</option>
              </select>

              <button
                type="button"
                onClick={() => setBilingualHindi(b => !b)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  bilingualHindi
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {bilingualHindi ? '🇮🇳 English + हिंदी (Bilingual)' : '🇬🇧 English Only'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSlips}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Slips
              </button>
              <button
                type="button"
                onClick={handleDownloadSlipsPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          <div
            ref={slipsContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {workersToRenderSlips.map(worker => {
              const s = calculateWorkerMonthlySummary(worker, monthAtt, appState.advances, daysInMonth);
              return (
                <div
                  key={worker.id}
                  className="wage-slip-print-card bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs tabular-nums"
                >
                  {/* Formal Header */}
                  <div className={`${slipHeaderColor} px-4 py-3 flex items-center justify-between gap-2`}>
                    <div>
                      <div className="text-xs font-extrabold tracking-wider uppercase">
                        GLOBAL INDUSTRIES
                      </div>
                      <div className="text-[11px] opacity-80">
                        Site: {siteName} • {subgroupName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sendWorkerWhatsAppSlip(worker, s)}
                        title={
                          worker.phone
                            ? `Send Wage Slip on WhatsApp to ${worker.name} (${worker.phone})`
                            : `Share Wage Slip on WhatsApp for ${worker.name}`
                        }
                        className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{worker.phone ? 'WhatsApp' : 'Share'}</span>
                      </button>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/15 font-semibold">
                        {bilingualHindi ? 'वेतन पर्ची • ' : 'WAGE SLIP • '}
                        {MONTH_NAMES[monthNum]} {yearNum}
                      </span>
                    </div>
                  </div>

                  {/* Worker Metadata */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">
                          {bilingualHindi ? 'मज़दूर का नाम / Worker Name' : 'Worker Name'}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{worker.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {worker.desig} {worker.phone ? `• 📞 ${worker.phone}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">
                          {bilingualHindi ? 'दैनिक दर / Daily Wage Rate' : 'Daily Wage Rate'}
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          ₹{worker.rate.toLocaleString('en-IN')}/day
                        </div>
                        <div className="text-[11px] text-slate-500">ID: {worker.id.slice(-6)}</div>
                      </div>
                    </div>

                    {/* Earnings & Deductions Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{bilingualHindi ? 'हाज़िरी / Days:' : 'Days Worked:'}</span>
                          <strong className="font-mono text-slate-900 dark:text-white">{s.totalDuty} Days</strong>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{bilingualHindi ? 'ओवरटाइम / OT:' : 'Overtime (OT):'}</span>
                          <strong className="font-mono text-blue-600 dark:text-blue-400">{s.totalOT} Hrs</strong>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                          <span>{bilingualHindi ? 'कुल कमाई / Gross:' : 'Gross Earned:'}</span>
                          <span className="font-mono">₹{Math.round(s.grossAmount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{bilingualHindi ? 'पिछला एडवांस / Open:' : 'Opening Adv:'}</span>
                          <strong className="font-mono text-rose-600">₹{Math.round(s.openingAdv).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{bilingualHindi ? 'दैनिक एडवांस / Adv:' : 'Daily Adv:'}</span>
                          <strong className="font-mono text-rose-600">₹{Math.round(s.dailyAdv).toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-rose-600">
                          <span>{bilingualHindi ? 'कुल कटौती / Ded.:' : 'Total Ded.:'}</span>
                          <span className="font-mono">₹{Math.round(s.totalAdvance).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Payable Banner */}
                    <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        {bilingualHindi ? 'कुल देय राशि / Net Payable' : 'Net Payable Balance'}
                      </span>
                      <span className="text-base font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                        ₹{Math.round(s.netBalance).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Signatures */}
                    <div className="pt-4 flex items-center justify-between text-[10px] text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-800">
                      <span>{bilingualHindi ? 'मज़दूर के हस्ताक्षर / Worker Sign' : 'Worker Signature / Thumb'}</span>
                      <span>{bilingualHindi ? 'अधिकृत हस्ताक्षर / Authorized Sign' : 'Authorized Signatory (Global Industries)'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DATE & RANGE REPORTS */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setReportMode('single')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    reportMode === 'single'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Single Day Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('range')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    reportMode === 'range'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Custom Date Range
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {reportMode === 'single' ? (
                  <input
                    type="date"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    aria-label="Report single date"
                    className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      aria-label="Report start date"
                      className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      aria-label="Report end date"
                      className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportReportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={handleShareReportWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>

          {reportResult ? (
            <div
              ref={reportContainerRef}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4 tabular-nums"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Site Audit Report: {siteName} ({subgroupName})
                  </h3>
                  <p className="text-xs text-slate-500">Period: {reportResult.periodLabel}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Man-Days</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white">{reportResult.totalDuty}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Total OT</span>
                    <strong className="font-mono text-sm text-blue-600">{reportResult.totalOT}h</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Net Liability</span>
                    <strong className="font-mono text-sm text-emerald-600">
                      ₹{Math.round(reportResult.totalNet).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px]">
                      <th className="py-2 px-3 text-left">Worker</th>
                      <th className="py-2 px-3 text-left">Trade</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Duties</th>
                      <th className="py-2 px-3 text-right">OT (h)</th>
                      <th className="py-2 px-3 text-right">Gross (₹)</th>
                      <th className="py-2 px-3 text-right">Advance (₹)</th>
                      <th className="py-2 px-3 text-right">Net Pay (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {reportResult.workerRows.map(r => (
                      <tr key={r.worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">{r.worker.name}</td>
                        <td className="py-2 px-3 text-slate-500">{r.worker.desig}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{r.worker.rate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{r.duty}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600">{r.ot}h</td>
                        <td className="py-2 px-3 text-right font-mono">₹{Math.round(r.gross).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">₹{Math.round(r.adv).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          ₹{Math.round(r.net).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-rose-600">
              Please select a valid start and end date range.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ENGINEERING & PAYROLL CALCULATORS */}
      {subTab === 'calculators' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 tabular-nums">
          {/* Card 1: Payroll Simulator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                What-If Payroll Simulator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Wage Rate Adjustment</span>
                  <span className="font-mono text-blue-600">{simHikePct >= 0 ? `+${simHikePct}%` : `${simHikePct}%`}</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="50"
                  step="5"
                  value={simHikePct}
                  onChange={e => setSimHikePct(parseInt(e.target.value, 10))}
                  aria-label="Wage Rate Adjustment Percentage"
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Overtime Pay Multiplier
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 1.5, 2].map(mult => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setSimOtMult(mult)}
                      className={`py-1.5 rounded-lg font-mono font-bold text-xs border ${
                        simOtMult === mult
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {mult}x OT
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Contractor Retention Hold</span>
                  <span className="font-mono text-amber-600">{simRetentionPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={simRetentionPct}
                  onChange={e => setSimRetentionPct(parseInt(e.target.value, 10))}
                  aria-label="Contractor Retention Percentage"
                  className="w-full accent-amber-600"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1.5 border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Gross:</span>
                  <span className="font-mono font-semibold">₹{Math.round(simPayroll.baseGross).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Projected Gross:</span>
                  <span className="font-mono font-bold text-blue-600">₹{Math.round(simPayroll.simGross).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Retention ({simRetentionPct}%):</span>
                  <span className="font-mono text-amber-600">-₹{Math.round(simPayroll.retentionAmt).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-sm">
                  <span>Net Disbursal:</span>
                  <span className="font-mono text-emerald-600">₹{Math.round(simPayroll.netDisbursal).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: IS-456 Concrete & BBS Steel Calculator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <HardHat className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                IS-456 Concrete & BBS Steel
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Wet Volume (m³)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={concVolume}
                    onChange={e => setConcVolume(parseFloat(e.target.value) || 0)}
                    aria-label="Concrete Wet Volume in cubic meters"
                    className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Mix Grade</label>
                  <select
                    value={concGrade}
                    onChange={e => setConcGrade(e.target.value as 'M15' | 'M20' | 'M25')}
                    aria-label="Concrete Mix Grade"
                    className="w-full px-2.5 py-1.5 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="M15">M15 (1:2:4)</option>
                    <option value="M20">M20 (1:1.5:3)</option>
                    <option value="M25">M25 (1:1:2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                <div>
                  <span className="text-[10px] text-slate-500 block">Cement</span>
                  <strong className="font-mono text-sm text-amber-700 dark:text-amber-400">{concreteCalc.cementBags} Bags</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">River Sand</span>
                  <strong className="font-mono text-sm text-slate-800 dark:text-slate-200">{concreteCalc.sandCft} CFT</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Aggregate</span>
                  <strong className="font-mono text-sm text-slate-800 dark:text-slate-200">{concreteCalc.aggCft} CFT</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Rebar Dia (mm)</label>
                  <select
                    value={steelDia}
                    onChange={e => setSteelDia(parseInt(e.target.value, 10))}
                    aria-label="Rebar Diameter in mm"
                    className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map(d => (
                      <option key={d} value={d}>
                        {d} mm
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Total Length (m)</label>
                  <input
                    type="number"
                    min="1"
                    value={steelLength}
                    onChange={e => setSteelLength(parseFloat(e.target.value) || 0)}
                    aria-label="Total Steel Rebar Length in meters"
                    className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">BBS Steel Weight (D²/162):</span>
                <strong className="font-mono text-sm text-slate-900 dark:text-white">{concreteCalc.steelWeightKg} kg</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Client RA Bill Estimator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Client RA Bill Estimator
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Measured Work Value (₹)</label>
                <input
                  type="number"
                  step="5000"
                  value={raGrossWork}
                  onChange={e => setRaGrossWork(parseFloat(e.target.value) || 0)}
                  aria-label="RA Bill Measured Work Value"
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">GST %</label>
                  <input
                    type="number"
                    value={raGstPct}
                    onChange={e => setRaGstPct(parseFloat(e.target.value) || 0)}
                    aria-label="GST Percentage"
                    className="w-full px-2 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Ret. %</label>
                  <input
                    type="number"
                    value={raRetentionPct}
                    onChange={e => setRaRetentionPct(parseFloat(e.target.value) || 0)}
                    aria-label="Retention Percentage"
                    className="w-full px-2 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">TDS %</label>
                  <input
                    type="number"
                    value={raTdsPct}
                    onChange={e => setRaTdsPct(parseFloat(e.target.value) || 0)}
                    aria-label="TDS Deduction Percentage"
                    className="w-full px-2 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">Mobilization Adv. Recovery (₹)</label>
                <input
                  type="number"
                  step="1000"
                  value={raMobAdvRecovery}
                  onChange={e => setRaMobAdvRecovery(parseFloat(e.target.value) || 0)}
                  aria-label="Mobilization Advance Recovery"
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Invoice (+GST):</span>
                  <span className="font-mono font-semibold">₹{Math.round(raBillCalc.totalInvoice).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Retention + TDS Ded.:</span>
                  <span className="font-mono">-₹{Math.round(raBillCalc.retentionDed + raBillCalc.tdsDed).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-sm">
                  <span>Net Cheque Release:</span>
                  <span className="font-mono text-emerald-600">₹{Math.round(raBillCalc.netRelease).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
