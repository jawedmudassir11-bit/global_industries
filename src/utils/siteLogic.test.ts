import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIREBASE_CONFIG_A,
  FIREBASE_CONFIG_B,
  verifyPinPassword,
  parseDutyInput,
  getDutyDisplaySymbol,
  calculateWorkerMonthlySummary,
  calculateSiteDashboardStats,
  calculateActiveStockMap,
  sanitizeState,
  isDayAutoLockedForRole
} from './siteLogic';

test('Firebase configuration constants remain strictly unchanged', () => {
  assert.equal(
    FIREBASE_CONFIG_A.databaseURL,
    'https://g12343-default-rtdb.asia-southeast1.firebasedatabase.app/'
  );
  assert.equal(FIREBASE_CONFIG_A.projectId, 'g12343');
  assert.equal(
    FIREBASE_CONFIG_B.databaseURL,
    'https://global-industries-backup-default-rtdb.asia-southeast1.firebasedatabase.app/'
  );
  assert.equal(FIREBASE_CONFIG_B.projectId, 'global-industries-backup');
  assert.equal(FIREBASE_CONFIG_B.storageBucket, 'global-industries-backup.appspot.com');
});

test('PIN password verification preserves exact role PINs and barrel-roll easter egg', () => {
  assert.deepEqual(verifyPinPassword('9431'), {
    valid: true,
    role: 'admin',
    message: 'Admin Access Unlocked'
  });
  assert.deepEqual(verifyPinPassword('1820'), {
    valid: true,
    role: 'incharge',
    message: 'Site Incharge Mode Unlocked'
  });
  assert.deepEqual(verifyPinPassword('5566'), {
    valid: true,
    role: 'supervisor',
    message: 'Supervisor Mode Unlocked'
  });
  assert.equal(verifyPinPassword('6767').easterEgg, 'barrel-roll');
  assert.equal(verifyPinPassword('0000').valid, false);
});

test('Duty parsing and display symbol formatting work accurately', () => {
  assert.equal(parseDutyInput('P'), 1);
  assert.equal(parseDutyInput(1), 1);
  assert.equal(parseDutyInput('H'), 0.5);
  assert.equal(parseDutyInput(0.5), 0.5);
  assert.equal(parseDutyInput('A'), 0);
  assert.equal(parseDutyInput(0), 0);
  assert.equal(parseDutyInput(''), null);

  assert.equal(getDutyDisplaySymbol(1), 'P');
  assert.equal(getDutyDisplaySymbol(0.5), 'H');
  assert.equal(getDutyDisplaySymbol(0), 'A');
  assert.equal(getDutyDisplaySymbol(null), '');
});

test('Worker monthly summary and dashboard stats calculate gross, advance, and net pay', () => {
  const worker = { id: 'w1', name: 'Ramesh Kumar', desig: 'Mason', rate: 800 };
  const monthAtt = {
    w1: {
      1: { duty: 1, ot: 2, adv: 200 },
      2: { duty: 0.5, ot: 0, adv: 0 },
      3: { duty: 0, ot: 0, adv: 100 }
    }
  };
  const summary = calculateWorkerMonthlySummary(worker, monthAtt, { w1: 500 }, 30);
  // Duty = 1.5 days * 800 = 1200; OT = 2 hrs * (800/8 = 100) = 200 => Gross = 1400
  // Advance = 500 opening + 300 daily = 800 => Net = 600
  assert.equal(summary.totalDuty, 1.5);
  assert.equal(summary.totalOT, 2);
  assert.equal(summary.grossAmount, 1400);
  assert.equal(summary.totalAdvance, 800);
  assert.equal(summary.netBalance, 600);

  const state = sanitizeState({
    workers: [worker],
    attendance: { '11-2026': monthAtt },
    advances: { w1: 500 }
  });
  const dash = calculateSiteDashboardStats(state, '11-2026', 1);
  assert.equal(dash.presentToday, 1);
  assert.equal(dash.totalNetBalance, 600);
});

test('Live material stock map reconciles received minus consumed quantities', () => {
  const stock = calculateActiveStockMap({
    '1-11-2026': {
      work: 'Pour',
      weather: 'Sunny',
      rainStart: '',
      rainEnd: '',
      workStop: 'No',
      matReceived: [{ item: 'Cement', qty: 100, unit: 'Bag', challan: 'CH-102', supplier: 'UltraTech' }],
      matConsumed: [{ item: 'Cement', qty: 35, unit: 'Bag' }],
      photos: []
    }
  });
  assert.equal(stock['cement'].qty, 65);
  assert.equal(stock['cement'].unit, 'Bag');
});

test('Attendance auto-lock locks past >48h days for Supervisor and Site Incharge while Admin can change anything at any time', () => {
  // Current date: Day 7 of 11-2026
  // Supervisor and Site Incharge can edit today (Day 7) and yesterday (Day 6)
  assert.equal(isDayAutoLockedForRole('supervisor', 7, '11-2026', 7, '11-2026', false), false);
  assert.equal(isDayAutoLockedForRole('incharge', 6, '11-2026', 7, '11-2026', false), false);
  // Both Supervisor and Site Incharge are auto-locked on Day 5 (48h+ old) and previous months
  assert.equal(isDayAutoLockedForRole('supervisor', 5, '11-2026', 7, '11-2026', false), true);
  assert.equal(isDayAutoLockedForRole('incharge', 5, '11-2026', 7, '11-2026', false), true);
  assert.equal(isDayAutoLockedForRole('incharge', 7, '10-2026', 7, '11-2026', false), true);
  // Admin (9431) is NEVER locked and can change anything at any time
  assert.equal(isDayAutoLockedForRole('admin', 1, '11-2026', 7, '11-2026', true), false);
  assert.equal(isDayAutoLockedForRole('admin', 1, '10-2026', 7, '11-2026', true), false);
});

