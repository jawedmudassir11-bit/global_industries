import { FIREBASE_CONFIG_A, FIREBASE_CONFIG_B } from './siteLogic';

declare global {
  interface Window {
    firebase?: any;
    XLSX?: any;
    html2pdf?: any;
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

let primaryDb: any = null;
let backupStorage: any = null;
let initialized = false;

export function getFirebaseServices() {
  if (typeof window === 'undefined' || !window.firebase) {
    return { db: null, storageBackup: null };
  }
  if (!initialized) {
    try {
      const fb = window.firebase;
      // Project A: Primary Database (Text/Attendance Data) - EXACT UNCHANGED SETUP
      const configA = {
        databaseURL: FIREBASE_CONFIG_A.databaseURL,
        projectId: FIREBASE_CONFIG_A.projectId
      };
      if (!fb.apps || fb.apps.length === 0) {
        fb.initializeApp(configA);
      }
      primaryDb = fb.database();

      // Project B: Backup Database & Photo Storage - EXACT UNCHANGED SETUP
      const configB = {
        databaseURL: FIREBASE_CONFIG_B.databaseURL,
        projectId: FIREBASE_CONFIG_B.projectId,
        storageBucket: FIREBASE_CONFIG_B.storageBucket
      };
      const existingSecondary = (fb.apps || []).find((a: any) => a.name === 'BackupProject');
      const secondaryApp = existingSecondary || fb.initializeApp(configB, 'BackupProject');
      backupStorage = secondaryApp.storage();
      initialized = true;
    } catch (err) {
      console.warn('Firebase initialization warning:', err);
    }
  }
  return { db: primaryDb, storageBackup: backupStorage };
}

export function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetStorage(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore storage quota errors
  }
}

export function safeRemoveStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
