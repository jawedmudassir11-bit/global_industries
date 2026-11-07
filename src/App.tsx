import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Sun,
  Moon,
  Sparkles,
  CheckSquare,
  ClipboardList,
  Table,
  FileText
} from 'lucide-react';
import {
  SiteNode,
  AppState,
  UserRole,
  WorkerProfile,
  DPRRecord,
  TimelineNote,
  EquipmentItem,
  DEFAULT_SEED_SITES,
  createSeedAppState,
  sanitizeStructure,
  sanitizeState,
  calculateSiteDashboardStats,
  calculateActiveStockMap,
  isDayAutoLockedForRole
} from './utils/siteLogic';
import {
  getFirebaseServices,
  safeGetStorage,
  safeSetStorage
} from './utils/firebaseBridge';
import { AttendanceTab } from './components/AttendanceTab';
import { DprSiteTab } from './components/DprSiteTab';
import { RegisterTab } from './components/RegisterTab';
import { ReportsSlipsTab } from './components/ReportsSlipsTab';
import {
  PinLoginModal,
  WorkerFormModal,
  WorkerProfileModal,
  WorkerTransferModal,
  StockThresholdModal,
  UiImprovementGuideModal
} from './components/ModalsAndDrawers';
import {
  GlobalIndustriesLetterhead,
  IntroCenterToHeaderGlide,
  SiteHierarchyDropdown,
  NamePromptModal,
  ProfileAnalyticsDrawer,
  PresenceUser,
  ActivityLogItem
} from './components/ProfileAnalyticsDrawer';
import { OfflineQueueBanner } from './components/PwaAndOfflineBar';

type ActiveTab = 'attendance' | 'dpr' | 'register' | 'reports';

export default function App() {
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getMonth() + 1}-${now.getFullYear()}`;
  const currentDayOfMonth = now.getDate();
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const monthKey = `${selectedMonth}-${selectedYear}`;
  const dateKey = `${selectedDay}-${monthKey}`;

  // Sites & Subgroups state
  const [sites, setSites] = useState<SiteNode[]>(DEFAULT_SEED_SITES);
  const [currentSiteId, setCurrentSiteId] = useState<string>(
    () => safeGetStorage('gi_last_site') || DEFAULT_SEED_SITES[0].id
  );
  const [currentSubgroupId, setCurrentSubgroupId] = useState<string>(
    () => safeGetStorage('gi_last_sub') || DEFAULT_SEED_SITES[0].subgroups[0].id
  );
  const isMasterRollup = currentSubgroupId === 'ALL_GROUPS';

  // Hydrate immediately from cached Firebase snapshot if available so worker counts never jump
  const [appState, setAppState] = useState<AppState>(() => {
    const initSite = safeGetStorage('gi_last_site') || DEFAULT_SEED_SITES[0].id;
    const initSub = safeGetStorage('gi_last_sub') || DEFAULT_SEED_SITES[0].subgroups[0].id;
    const cachedRaw = safeGetStorage(`gi_cache_${initSite}_${initSub}`);
    if (cachedRaw) {
      try {
        return sanitizeState(JSON.parse(cachedRaw));
      } catch {
        // Fallback to seed state
      }
    }
    return createSeedAppState(`${now.getMonth() + 1}-${now.getFullYear()}`, now.getDate());
  });

  // 60fps Center-to-Header Intro Glide State & Firebase Sync Readiness
  const headerLogoRef = useRef<HTMLDivElement | null>(null);
  const [introStage, setIntroStage] = useState<'center' | 'gliding' | 'done'>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('skipintro=1')) {
      return 'done';
    }
    return 'center';
  });
  const [isIntroCloudReady, setIsIntroCloudReady] = useState<boolean>(false);

  // Fixed Device Profile Name ('gi_user_profile')
  const [userName, setUserName] = useState<string>(() => {
    const saved = safeGetStorage('gi_user_profile');
    if (saved && saved.trim()) return saved.trim();
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      return 'Mudassir';
    }
    return '';
  });

  // Role & Auth state (supports both 'gi_role' and 'gi_role_v2')
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = safeGetStorage('gi_role_v2') || safeGetStorage('gi_role');
    if (saved === 'admin' || saved === 'incharge' || saved === 'supervisor') return saved;
    return 'viewer';
  });

  // Theme state (clean Light / Dark mode)
  const [darkMode, setDarkMode] = useState<boolean>(() => safeGetStorage('gi_dark_mode') === '1');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      safeSetStorage('gi_dark_mode', '1');
    } else {
      document.documentElement.classList.remove('dark');
      safeSetStorage('gi_dark_mode', '0');
    }
  }, [darkMode]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('attendance');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerProfile | null>(null);
  const [profileWorker, setProfileWorker] = useState<WorkerProfile | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetWorker, setTransferTargetWorker] = useState<WorkerProfile | null>(null);
  const [isStockThresholdModalOpen, setIsStockThresholdModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [barrelRoll, setBarrelRoll] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('synced');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueuedCount, setOfflineQueuedCount] = useState<number>(() =>
    parseInt(safeGetStorage('gi_offline_queue_count') || '0', 10) || 0
  );
  const [totalSyncs, setTotalSyncs] = useState<number>(1);
  const [presenceList, setPresenceList] = useState<PresenceUser[]>([]);
  const [peakUsers, setPeakUsers] = useState<number>(1);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(prev => (prev?.msg === msg ? null : prev));
    }, 3200);
  }, []);

  // Log activity to Firebase global/activity and local state
  const logActivity = useCallback(
    (action: string, overrideName?: string) => {
      const activeUser = overrideName || userName;
      if (!activeUser) return;
      const entry: ActivityLogItem = {
        user: activeUser,
        action,
        time: Date.now()
      };
      setActivityLogs(prev => [entry, ...prev]);
      const { db } = getFirebaseServices();
      if (db) {
        try {
          db.ref('global/activity').push(entry);
        } catch {
          // Ignore offline push errors
        }
      }
    },
    [userName]
  );

  // Save or update user's fixed device name
  const handleSaveUserName = useCallback(
    (newName: string) => {
      const cleaned = newName.trim();
      if (!cleaned) return;
      const isFirstTime = !userName;
      setUserName(cleaned);
      safeSetStorage('gi_user_profile', cleaned);
      logActivity(isFirstTime ? 'Joined the portal' : `Updated profile name to ${cleaned}`, cleaned);
      showToast(`Profile saved as ${cleaned}`, 'success');
    },
    [userName, logActivity, showToast]
  );

  // Sync Firebase Presence & Audit Logs
  useEffect(() => {
    if (!userName) return;
    const { db } = getFirebaseServices();
    const isMobile =
      typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const deviceLabel = isMobile ? '📱 Mobile' : '💻 Desktop';

    if (!db) {
      setPresenceList([
        {
          name: userName,
          role: userRole,
          device: deviceLabel,
          time: Date.now()
        }
      ]);
      return;
    }

    const userKey = userName.replace(/[^a-zA-Z0-9]/g, '') || 'user';
    const userPresenceRef = db.ref(`global/presence/${userKey}`);
    const connectedRef = db.ref('.info/connected');
    const allPresenceRef = db.ref('global/presence');

    const onConnected = (snap: any) => {
      if (snap.val()) {
        userPresenceRef.set({
          name: userName,
          role: userRole,
          device: deviceLabel,
          time: Date.now()
        });
        if (typeof userPresenceRef.onDisconnect === 'function') {
          userPresenceRef.onDisconnect().remove();
        }
      }
    };

    const onPresenceValue = (snap: any) => {
      const val = snap.val();
      if (val && typeof val === 'object') {
        const list = Object.values(val).filter(Boolean) as PresenceUser[];
        setPresenceList(list);
        setPeakUsers(prev => Math.max(prev, list.length));
      } else {
        setPresenceList([
          {
            name: userName,
            role: userRole,
            device: deviceLabel,
            time: Date.now()
          }
        ]);
      }
    };

    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const activityQuery = db.ref('global/activity').orderByChild('time').startAt(startOfDay);
    const onActivityValue = (snap: any) => {
      const val = snap.val();
      if (val && typeof val === 'object') {
        const logs = (Object.values(val).filter(Boolean) as ActivityLogItem[]).reverse();
        setActivityLogs(logs);
      }
    };

    connectedRef.on('value', onConnected);
    allPresenceRef.on('value', onPresenceValue);
    activityQuery.on('value', onActivityValue);

    return () => {
      connectedRef.off('value', onConnected);
      allPresenceRef.off('value', onPresenceValue);
      activityQuery.off('value', onActivityValue);
    };
  }, [userName, userRole]);

  // Connect to unchanged Dual Firebase Setup for Site Structure
  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db) return;

    const structRef = db.ref('global/structure');
    const onStructValue = (snap: any) => {
      const val = snap.val();
      if (val) {
        const sanitized = sanitizeStructure(val);
        if (sanitized.length > 0) {
          setSites(sanitized);
          setCurrentSiteId(prevSiteId => {
            const matchedSite = sanitized.find(s => s.id === prevSiteId) || sanitized[0];
            setCurrentSubgroupId(prevSubId => {
              if (prevSubId === 'ALL_GROUPS') return 'ALL_GROUPS';
              const matchedSub =
                matchedSite.subgroups.find(sub => sub.id === prevSubId) || matchedSite.subgroups[0];
              return matchedSub ? matchedSub.id : 'ALL_GROUPS';
            });
            return matchedSite.id;
          });
        }
      }
    };
    structRef.on('value', onStructValue);
    return () => {
      structRef.off('value', onStructValue);
    };
  }, []);

  // Listen to currentSite / currentSubgroup data in Firebase (including Master Roll-Up)
  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db || !currentSiteId || !currentSubgroupId) return;

    setSyncStatus('syncing');

    if (currentSubgroupId === 'ALL_GROUPS') {
      const siteRef = db.ref(`data/${currentSiteId}`);
      const onSiteValue = (snap: any) => {
        const allGroups = snap.val();
        if (allGroups && typeof allGroups === 'object') {
          const aggregated: any = {
            workers: [],
            keyPersons: [],
            attendance: {},
            kpAttendance: {},
            advances: {},
            dpr: {},
            timeline: {},
            equipment: []
          };
          Object.values(allGroups).forEach((group: any) => {
            if (!group) return;
            if (group.workers) aggregated.workers.push(...Object.values(group.workers));
            if (group.keyPersons) aggregated.keyPersons.push(...Object.values(group.keyPersons));
            if (group.equipment) aggregated.equipment.push(...Object.values(group.equipment));
            if (group.attendance) {
              Object.entries(group.attendance).forEach(([m, wData]) => {
                if (!aggregated.attendance[m]) aggregated.attendance[m] = {};
                Object.assign(aggregated.attendance[m], wData);
              });
            }
            if (group.kpAttendance) {
              Object.entries(group.kpAttendance).forEach(([m, kpData]) => {
                if (kpData && typeof kpData === 'object') {
                  if (!aggregated.kpAttendance[m]) aggregated.kpAttendance[m] = {};
                  Object.assign(aggregated.kpAttendance[m], kpData);
                }
              });
            }
            if (group.advances) Object.assign(aggregated.advances, group.advances);
          });
          setAppState(sanitizeState(aggregated));
        }
        setSyncStatus('synced');
        setIsIntroCloudReady(true);
      };
      siteRef.on('value', onSiteValue, () => {
        setSyncStatus('local');
        setIsIntroCloudReady(true);
      });
      return () => siteRef.off('value', onSiteValue);
    }

    const subRef = db.ref(`data/${currentSiteId}/${currentSubgroupId}`);
    const onSubValue = (snap: any) => {
      const val = snap.val();
      if (val) {
        const clean = sanitizeState(val);
        setAppState(clean);
        safeSetStorage(`gi_cache_${currentSiteId}_${currentSubgroupId}`, JSON.stringify(clean));
      }
      setSyncStatus('synced');
      setIsIntroCloudReady(true);
    };
    subRef.on('value', onSubValue, () => {
      setSyncStatus('local');
      setIsIntroCloudReady(true);
    });

    return () => {
      subRef.off('value', onSubValue);
    };
  }, [currentSiteId, currentSubgroupId]);

  // Orchestrate Smooth Center-to-Header Glide once Firebase syncs (or max 1.25s fallback)
  useEffect(() => {
    if (introStage === 'done') return;
    const readyTimer = setTimeout(() => {
      setIsIntroCloudReady(true);
    }, 650);
    return () => clearTimeout(readyTimer);
  }, [introStage]);

  useEffect(() => {
    if (introStage !== 'center' || !isIntroCloudReady) return;
    const glideTimer = setTimeout(() => {
      setIntroStage('gliding');
    }, 550);
    return () => clearTimeout(glideTimer);
  }, [introStage, isIntroCloudReady]);

  useEffect(() => {
    if (introStage !== 'gliding') return;
    const doneTimer = setTimeout(() => {
      setIntroStage('done');
    }, 680);
    return () => clearTimeout(doneTimer);
  }, [introStage]);

  const handleSkipIntro = useCallback(() => {
    setIntroStage(prev => (prev === 'center' ? 'gliding' : 'done'));
  }, []);

  // Write helper to Primary (configA) with Poor-Network Offline Queue
  const persistAppState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setAppState(prev => {
        const next = updater(prev);
        setTotalSyncs(c => c + 1);
        const path = `data/${currentSiteId}/${currentSubgroupId}`;
        safeSetStorage(`gi_cache_${currentSiteId}_${currentSubgroupId}`, JSON.stringify(next));

        if (!navigator.onLine) {
          setSyncStatus('local');
          setOfflineQueuedCount(c => {
            const nextCount = c + 1;
            safeSetStorage('gi_offline_queue_count', String(nextCount));
            return nextCount;
          });
          return next;
        }

        const { db } = getFirebaseServices();
        if (db && currentSiteId && currentSubgroupId && currentSubgroupId !== 'ALL_GROUPS') {
          setSyncStatus('syncing');
          db.ref(path)
            .set(next)
            .then(() => {
              setSyncStatus('synced');
              setOfflineQueuedCount(0);
              safeSetStorage('gi_offline_queue_count', '0');
            })
            .catch(() => {
              setSyncStatus('local');
              setOfflineQueuedCount(c => {
                const nextCount = c + 1;
                safeSetStorage('gi_offline_queue_count', String(nextCount));
                return nextCount;
              });
            });
        }
        return next;
      });
    },
    [currentSiteId, currentSubgroupId]
  );

  // Flush offline queue automatically when device comes back online
  const flushOfflineQueue = useCallback(() => {
    const { db } = getFirebaseServices();
    if (db && currentSiteId && currentSubgroupId && currentSubgroupId !== 'ALL_GROUPS') {
      setSyncStatus('syncing');
      db.ref(`data/${currentSiteId}/${currentSubgroupId}`)
        .set(appState)
        .then(() => {
          setSyncStatus('synced');
          setOfflineQueuedCount(0);
          safeSetStorage('gi_offline_queue_count', '0');
          showToast('Offline changes synced to Cloud!', 'success');
        })
        .catch(() => setSyncStatus('local'));
    }
  }, [currentSiteId, currentSubgroupId, appState, showToast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('local');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushOfflineQueue]);

  const persistStructure = useCallback((nextSites: SiteNode[]) => {
    setSites(nextSites);
    const { db } = getFirebaseServices();
    if (db) {
      db.ref('global/structure').set(nextSites).catch(() => {});
    }
  }, []);

  const currentSite = useMemo(
    () => sites.find(s => s.id === currentSiteId) || sites[0],
    [sites, currentSiteId]
  );
  const currentSubgroup = useMemo(
    () => currentSite?.subgroups.find(sub => sub.id === currentSubgroupId) || currentSite?.subgroups[0],
    [currentSite, currentSubgroupId]
  );

  const dashboardStats = useMemo(
    () => calculateSiteDashboardStats(appState, monthKey, selectedDay),
    [appState, monthKey, selectedDay]
  );

  const activeMaterialNames = useMemo(
    () => Object.keys(calculateActiveStockMap(appState.dpr)),
    [appState.dpr]
  );

  // Handlers for Site & Subgroup Dropdown
  const handleSelectSiteSubgroup = (sId: string, subId: string) => {
    setCurrentSiteId(sId);
    setCurrentSubgroupId(subId);
    safeSetStorage('gi_last_site', sId);
    safeSetStorage('gi_last_sub', subId);
    const targetSite = sites.find(s => s.id === sId);
    const targetSub = targetSite?.subgroups.find(sub => sub.id === subId);
    showToast(
      subId === 'ALL_GROUPS'
        ? `Switched to ${targetSite?.name} Master Roll-Up`
        : `Switched to ${targetSite?.name} ➔ ${targetSub?.name}`,
      'info'
    );
  };

  const handleCreateSite = (siteName: string) => {
    const newSiteId = `site_${Date.now()}`;
    const newSubId = `sub_${Date.now()}`;
    const newSite: SiteNode = {
      id: newSiteId,
      name: siteName,
      subgroups: [{ id: newSubId, name: 'Main Group' }]
    };
    const next = [...sites, newSite];
    persistStructure(next);
    setCurrentSiteId(newSiteId);
    setCurrentSubgroupId(newSubId);
    logActivity(`Created new site: ${siteName}`);
    showToast(`Created site ${siteName}`, 'success');
  };

  const handleRenameSite = (siteId: string, newName: string) => {
    const next = sites.map(s => (s.id === siteId ? { ...s, name: newName } : s));
    persistStructure(next);
    logActivity(`Renamed site to ${newName}`);
    showToast(`Renamed site to ${newName}`, 'success');
  };

  const handleDeleteSite = (siteId: string) => {
    const next = sites.filter(s => s.id !== siteId);
    persistStructure(next);
    const { db } = getFirebaseServices();
    if (db) db.ref(`data/${siteId}`).remove().catch(() => {});
    logActivity('Deleted a main site');
    if (currentSiteId === siteId && next.length > 0) {
      setCurrentSiteId(next[0].id);
      setCurrentSubgroupId(next[0].subgroups[0]?.id || 'ALL_GROUPS');
    }
    showToast('Deleted site', 'info');
  };

  const handleCreateSubgroup = (siteId: string, subName: string) => {
    const newSubId = `sub_${Date.now()}`;
    const next = sites.map(s =>
      s.id === siteId
        ? { ...s, subgroups: [...(s.subgroups || []), { id: newSubId, name: subName }] }
        : s
    );
    persistStructure(next);
    setCurrentSiteId(siteId);
    setCurrentSubgroupId(newSubId);
    logActivity(`Added group ${subName}`);
    showToast(`Added group ${subName}`, 'success');
  };

  const handleRenameSubgroup = (siteId: string, subId: string, newName: string) => {
    const next = sites.map(s =>
      s.id === siteId
        ? {
            ...s,
            subgroups: s.subgroups.map(sub => (sub.id === subId ? { ...sub, name: newName } : sub))
          }
        : s
    );
    persistStructure(next);
    logActivity(`Renamed group to ${newName}`);
    showToast(`Renamed group to ${newName}`, 'success');
  };

  const handleDeleteSubgroup = (siteId: string, subId: string) => {
    const next = sites.map(s =>
      s.id === siteId ? { ...s, subgroups: s.subgroups.filter(sub => sub.id !== subId) } : s
    );
    persistStructure(next);
    const { db } = getFirebaseServices();
    if (db) db.ref(`data/${siteId}/${subId}`).remove().catch(() => {});
    logActivity('Deleted a group');
    if (currentSubgroupId === subId) {
      const updatedSite = next.find(s => s.id === siteId);
      setCurrentSubgroupId(updatedSite?.subgroups[0]?.id || 'ALL_GROUPS');
    }
    showToast('Deleted group', 'info');
  };

  // Check if selectedDay is manually locked for any worker
  const isDayManuallyLocked = useMemo(() => {
    const monthAtt = appState.attendance[monthKey] || {};
    return appState.workers.some(w => Boolean(monthAtt[w.id]?.[selectedDay]?.locked));
  }, [appState.attendance, appState.workers, monthKey, selectedDay]);

  const isDayAutoLocked = useMemo(
    () =>
      isDayAutoLockedForRole(
        userRole,
        selectedDay,
        monthKey,
        currentDayOfMonth,
        currentMonthKey,
        isDayManuallyLocked
      ),
    [userRole, selectedDay, monthKey, currentDayOfMonth, currentMonthKey, isDayManuallyLocked]
  );

  // Handlers for AttendanceTab & RegisterTab (Admin & Site Incharge never locked out!)
  const isWorkerDayLocked = useCallback(
    (wId: string, day: number) => {
      const manualLocked = Boolean(appState.attendance[monthKey]?.[wId]?.[day]?.locked);
      return isDayAutoLockedForRole(
        userRole,
        day,
        monthKey,
        currentDayOfMonth,
        currentMonthKey,
        manualLocked
      );
    },
    [appState.attendance, monthKey, userRole, currentDayOfMonth, currentMonthKey]
  );

  // Admin (9431) & Site Incharge (1820) 1-click day lock/unlock toggle for Supervisors
  const handleToggleDayLockForSupervisors = () => {
    if (userRole !== 'admin' && userRole !== 'incharge') {
      setIsPinModalOpen(true);
      return;
    }
    const nextLockState = !isDayManuallyLocked;
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      prev.workers.forEach(w => {
        const workerAtt = { ...(monthAtt[w.id] || {}) };
        const existing = workerAtt[selectedDay] || { duty: null, ot: 0, adv: 0, locked: false };
        workerAtt[selectedDay] = { ...existing, locked: nextLockState };
        monthAtt[w.id] = workerAtt;
      });
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
    logActivity(
      `${nextLockState ? 'Locked' : 'Unlocked'} Day ${selectedDay} attendance for Supervisors`
    );
    showToast(
      nextLockState
        ? `Day ${selectedDay} locked for Supervisors`
        : `Day ${selectedDay} unlocked for Supervisors`,
      'success'
    );
  };

  // Worker Transfer / Copy Between Groups
  const handleTransferWorker = (
    workerId: string,
    targetSiteId: string,
    targetSubgroupId: string,
    mode: 'move' | 'copy'
  ) => {
    const workerObj = appState.workers.find(w => w.id === workerId);
    if (!workerObj) return;

    const targetSite = sites.find(s => s.id === targetSiteId);
    const targetSub = targetSite?.subgroups.find(sub => sub.id === targetSubgroupId);
    const transferredWorker: WorkerProfile = {
      ...workerObj,
      id: mode === 'copy' ? `w_${Date.now()}` : workerObj.id
    };

    const { db } = getFirebaseServices();
    if (db) {
      const destRef = db.ref(`data/${targetSiteId}/${targetSubgroupId}/workers`);
      destRef
        .once('value')
        .then((snap: any) => {
          const val = snap.val();
          const existingList: WorkerProfile[] = Array.isArray(val)
            ? val.filter(Boolean)
            : val
            ? (Object.values(val).filter(Boolean) as WorkerProfile[])
            : [];
          const nextList = [...existingList.filter(w => w.id !== transferredWorker.id), transferredWorker];
          return destRef.set(nextList);
        })
        .catch(() => {});
    }

    if (mode === 'move') {
      persistAppState(prev => ({
        ...prev,
        workers: prev.workers.filter(w => w.id !== workerId)
      }));
    }

    logActivity(
      `${mode === 'move' ? 'Moved' : 'Copied'} worker ${workerObj.name} to ${targetSite?.name || 'Site'} ➔ ${targetSub?.name || 'Group'}`
    );
    showToast(
      `${mode === 'move' ? 'Moved' : 'Copied'} ${workerObj.name} to ${targetSub?.name || 'target group'}`,
      'success'
    );
  };

  // Partial Payment / Wage Settlement Tracker
  const handleRecordSettlement = (workerId: string, amountPaid: number, note: string) => {
    const workerObj = appState.workers.find(w => w.id === workerId);
    if (!workerObj || !amountPaid || amountPaid <= 0) return;

    persistAppState(prev => {
      const currentOpening = parseFloat(String(prev.advances[workerId] || 0)) || 0;
      return {
        ...prev,
        advances: {
          ...prev.advances,
          [workerId]: currentOpening + amountPaid
        }
      };
    });
    logActivity(`Recorded ₹${amountPaid} wage settlement for ${workerObj.name} (${note})`);
    showToast(`Recorded ₹${amountPaid.toLocaleString('en-IN')} payment for ${workerObj.name}`, 'success');
  };

  // Save Custom Low-Stock Alert Thresholds
  const handleSaveStockThresholds = (nextThresholds: Record<string, number>) => {
    persistAppState(prev => ({
      ...prev,
      stockThresholds: nextThresholds
    }));
    logActivity('Updated low-stock alert thresholds');
    showToast('Saved custom low-stock alert rules', 'success');
  };

  const handleSetDailyDuty = (wId: string, day: number, duty: number, type: 'worker' | 'kp') => {
    if (type === 'kp') {
      persistAppState(prev => {
        const monthKp = { ...(prev.kpAttendance[monthKey] || {}) };
        const kpDays = { ...(monthKp[wId] || {}) };
        kpDays[day] = { duty, locked: false };
        monthKp[wId] = kpDays;
        return {
          ...prev,
          kpAttendance: { ...prev.kpAttendance, [monthKey]: monthKp }
        };
      });
      return;
    }

    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      const workerAtt = { ...(monthAtt[wId] || {}) };
      const existing = workerAtt[day] || { duty: null, ot: 0, adv: 0, locked: false };
      workerAtt[day] = { ...existing, duty };
      monthAtt[wId] = workerAtt;
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
  };

  const handleSetDailyOT = (wId: string, day: number, otStr: string) => {
    const otVal = parseFloat(otStr) || 0;
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      const workerAtt = { ...(monthAtt[wId] || {}) };
      const existing = workerAtt[day] || { duty: 1, ot: 0, adv: 0, locked: false };
      workerAtt[day] = { ...existing, ot: otVal };
      monthAtt[wId] = workerAtt;
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
  };

  const handleSetDailyAdv = (wId: string, day: number, advStr: string) => {
    const advVal = parseFloat(advStr) || 0;
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      const workerAtt = { ...(monthAtt[wId] || {}) };
      const existing = workerAtt[day] || { duty: 1, ot: 0, adv: 0, locked: false };
      workerAtt[day] = { ...existing, adv: advVal };
      monthAtt[wId] = workerAtt;
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
  };

  const handleUpdateRegisterCell = (
    workerId: string,
    day: number,
    field: 'duty' | 'ot' | 'adv',
    value: string | number | null
  ) => {
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      const workerAtt = { ...(monthAtt[workerId] || {}) };
      const existing = workerAtt[day] || { duty: null, ot: 0, adv: 0, locked: false };
      workerAtt[day] = { ...existing, [field]: value };
      monthAtt[workerId] = workerAtt;
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
  };

  const handleUpdateOpeningAdvance = (workerId: string, value: number) => {
    persistAppState(prev => ({
      ...prev,
      advances: { ...prev.advances, [workerId]: value }
    }));
  };

  const handleMarkAllPresent = () => {
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      prev.workers.forEach(w => {
        const workerAtt = { ...(monthAtt[w.id] || {}) };
        const existing = workerAtt[selectedDay] || { duty: null, ot: 0, adv: 0, locked: false };
        if (existing.duty === null || existing.duty === undefined) {
          workerAtt[selectedDay] = { ...existing, duty: 1 };
        }
        monthAtt[w.id] = workerAtt;
      });
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
    logActivity(`Marked all workers present for Day ${selectedDay}`);
    showToast('Marked all unmarked workers Present (P)', 'success');
  };

  const handleCopyYesterday = () => {
    if (selectedDay <= 1) {
      showToast('Cannot copy yesterday on the 1st of the month', 'error');
      return;
    }
    const prevDay = selectedDay - 1;
    persistAppState(prev => {
      const monthAtt = { ...(prev.attendance[monthKey] || {}) };
      prev.workers.forEach(w => {
        const workerAtt = { ...(monthAtt[w.id] || {}) };
        const yest = workerAtt[prevDay];
        if (yest && yest.duty !== null) {
          const existing = workerAtt[selectedDay] || { duty: null, ot: 0, adv: 0, locked: false };
          workerAtt[selectedDay] = { ...existing, duty: yest.duty };
          monthAtt[w.id] = workerAtt;
        }
      });
      return {
        ...prev,
        attendance: { ...prev.attendance, [monthKey]: monthAtt }
      };
    });
    logActivity(`Copied attendance from Day ${prevDay} to Day ${selectedDay}`);
    showToast(`Copied attendance from Day ${prevDay}`, 'success');
  };

  const handleSaveWorker = (data: {
    id?: string;
    name: string;
    desig: string;
    phone: string;
    rate: number;
    openingAdv?: number;
  }) => {
    persistAppState(prev => {
      if (data.id) {
        return {
          ...prev,
          workers: prev.workers.map(w =>
            w.id === data.id
              ? { id: data.id, name: data.name, desig: data.desig, phone: data.phone, rate: data.rate }
              : w
          ),
          advances:
            data.openingAdv !== undefined
              ? { ...prev.advances, [data.id]: data.openingAdv }
              : prev.advances
        };
      }
      const newId = `w_${Date.now()}`;
      const newWorker: WorkerProfile = {
        id: newId,
        name: data.name,
        desig: data.desig,
        phone: data.phone,
        rate: data.rate
      };
      return {
        ...prev,
        workers: [...prev.workers, newWorker],
        advances:
          data.openingAdv !== undefined
            ? { ...prev.advances, [newId]: data.openingAdv }
            : prev.advances
      };
    });
    logActivity(data.id ? `Updated worker ${data.name} (${data.desig})` : `Registered worker ${data.name} (${data.desig})`);
    showToast(data.id ? `Updated ${data.name}` : `Added ${data.name} (${data.desig}) to workforce`, 'success');
  };

  const handleDeleteWorkerOrKp = (id: string, type: 'worker' | 'kp' = 'worker') => {
    if (type === 'kp') {
      persistAppState(prev => ({
        ...prev,
        keyPersons: prev.keyPersons.filter(k => k.id !== id)
      }));
      logActivity('Deleted a site official');
      showToast('Removed site official', 'info');
      return;
    }
    const target = appState.workers.find(w => w.id === id);
    persistAppState(prev => ({
      ...prev,
      workers: prev.workers.filter(w => w.id !== id)
    }));
    logActivity(`Deleted worker ${target?.name || id}`);
    showToast('Worker removed from site register', 'info');
  };

  // Handlers for DPR, Checklist, and Equipment
  const handleUpdateDPR = (dk: string, updated: DPRRecord) => {
    persistAppState(prev => ({
      ...prev,
      dpr: { ...prev.dpr, [dk]: updated }
    }));
    logActivity(`Updated DPR for ${dk}`);
    showToast('DPR & Material Log saved', 'success');
  };

  const handlePhotoUploadInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { storageBackup } = getFirebaseServices();
    let finalUrl: string | null = null;

    if (storageBackup) {
      try {
        const path = `site_photos/${currentSiteId}/${currentSubgroupId}/${dateKey}_${Date.now()}_${file.name}`;
        const ref = storageBackup.ref(path);
        await ref.put(file);
        finalUrl = await ref.getDownloadURL();
      } catch {
        // Fallback to local data URL
      }
    }

    if (!finalUrl) {
      finalUrl = await new Promise<string | null>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    if (finalUrl) {
      persistAppState(prev => {
        const existing = prev.dpr[dateKey] || {
          work: '',
          weather: '☀️ Sunny / Clear',
          rainStart: '',
          rainEnd: '',
          workStop: 'No',
          matReceived: [],
          matConsumed: [],
          photos: []
        };
        return {
          ...prev,
          dpr: {
            ...prev.dpr,
            [dateKey]: { ...existing, photos: [...(existing.photos || []), finalUrl!] }
          }
        };
      });
      logActivity(`Attached site photo for ${dateKey}`);
      showToast('Site photo attached to DPR', 'success');
    }
  };

  const handleAddTimelineNote = (text: string, priority: 'General' | 'Urgent' | 'Safety') => {
    const newNote: TimelineNote = {
      id: `note_${Date.now()}`,
      text,
      priority,
      completed: false,
      completedBy: '',
      completedAt: null,
      author: userName || userRole.toUpperCase(),
      role: userRole,
      timestamp: Date.now()
    };
    persistAppState(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        [dateKey]: [newNote, ...(prev.timeline[dateKey] || [])]
      }
    }));
    logActivity(`Posted ${priority} note on site timeline`);
    showToast('Added site instruction note', 'success');
  };

  const handleToggleTimelineNote = (dk: string, idx: number) => {
    persistAppState(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        [dk]: (prev.timeline[dk] || []).map((n, i) =>
          i === idx
            ? {
                ...n,
                completed: !n.completed,
                completedBy: !n.completed ? userName || userRole.toUpperCase() : '',
                completedAt: !n.completed ? Date.now() : null
              }
            : n
        )
      }
    }));
  };

  const handleDeleteTimelineNote = (dk: string, idx: number) => {
    persistAppState(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        [dk]: (prev.timeline[dk] || []).filter((_, i) => i !== idx)
      }
    }));
  };

  const handleAddEquipment = (
    name: string,
    operator: string,
    fuel: string,
    status: 'Operational' | 'Maintenance' | 'Idle'
  ) => {
    const newEq: EquipmentItem = {
      id: `eq_${Date.now()}`,
      name,
      operator,
      fuel,
      status
    };
    persistAppState(prev => ({
      ...prev,
      equipment: [...prev.equipment, newEq]
    }));
    logActivity(`Added equipment ${name}`);
    showToast(`Added machinery ${name}`, 'success');
  };

  const handleCycleEquipmentStatus = (idx: number) => {
    const order: ('Operational' | 'Maintenance' | 'Idle')[] = ['Operational', 'Maintenance', 'Idle'];
    persistAppState(prev => ({
      ...prev,
      equipment: prev.equipment.map((eq, i) => {
        if (i !== idx) return eq;
        const nextStatus = order[(order.indexOf(eq.status) + 1) % order.length];
        return { ...eq, status: nextStatus };
      })
    }));
  };

  const handleDeleteEquipment = (idx: number) => {
    persistAppState(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== idx)
    }));
    showToast('Removed equipment entry', 'info');
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    if (y && m && d) {
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
    }
  };

  const isoDateValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${barrelRoll ? 'barrel-roll' : ''}`}>
      {/* 60FPS SMOOTH CENTER-TO-HEADER LOGO & TEXT INTRO GLIDE */}
      <IntroCenterToHeaderGlide
        stage={introStage}
        isCloudReady={isIntroCloudReady}
        userName={userName}
        siteName={currentSite?.name || 'Barsoi'}
        subgroupName={isMasterRollup ? 'All Groups' : currentSubgroup?.name || 'Madan'}
        workerCount={appState.workers.length}
        headerLogoRef={headerLogoRef}
        onSkip={handleSkipIntro}
      />

      {/* 1. OFFICIAL GLOBAL INDUSTRIES LETTERHEAD (LOGO + BRAND TEXT + REGD OFFICE) */}
      <header className="sticky top-0 z-30 shadow-sm no-print">
        <GlobalIndustriesLetterhead
          logoTargetRef={headerLogoRef}
          hideLogoForMorph={introStage !== 'done'}
        />

        {/* 2. NAVY CONTROL BAR WITH HIERARCHICAL SITE SWITCHER, CLOUD SYNCED BADGE & PROFILE PILL */}
        <div className="bg-gradient-to-r from-[#0B1B2B] to-[#152E4D] text-white border-b-[3px] border-[#FFD700] px-3 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {/* Left: SITE: [🏢 Barsoi ➔ 📍 TAJUDDIN ▼] + 🟢 Cloud Synced */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SiteHierarchyDropdown
                sites={sites}
                currentSiteId={currentSiteId}
                currentSubgroupId={currentSubgroupId}
                isMasterRollup={isMasterRollup}
                userRole={userRole}
                onSelectSiteSubgroup={handleSelectSiteSubgroup}
                onCreateSite={handleCreateSite}
                onRenameSite={handleRenameSite}
                onDeleteSite={handleDeleteSite}
                onCreateSubgroup={handleCreateSubgroup}
                onRenameSubgroup={handleRenameSubgroup}
                onDeleteSubgroup={handleDeleteSubgroup}
                onRequireAuth={() => setIsPinModalOpen(true)}
              />

              {/* Cloud Synced / Offline Queue Pill Badge */}
              <div
                title="Firebase Real-time Connection Status"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                  !isOnline || offlineQueuedCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/45'
                }`}
              >
                <span>{!isOnline || offlineQueuedCount > 0 ? '🟠' : '🟢'}</span>
                <span>
                  {!isOnline
                    ? `Offline (${offlineQueuedCount} queued)`
                    : offlineQueuedCount > 0
                    ? `${offlineQueuedCount} Pending Sync`
                    : syncStatus === 'syncing'
                    ? 'Syncing...'
                    : 'Cloud Synced'}
                </span>
              </div>
            </div>

            {/* Right: Profile Pill (👤 Mudassir), Date Picker, Theme Toggle, Role Lock */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              {/* Profile Pill Button matching image_09662ec8.png */}
              <button
                type="button"
                onClick={() => setIsAnalyticsOpen(true)}
                aria-label={`Open Profile and Live Portal Analytics for ${userName || 'User'}`}
                title="View Profile Options & Live Portal Analytics"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-xs transition-all hover:scale-103 cursor-pointer"
              >
                <span aria-hidden="true">👤</span>
                <span className="max-w-[110px] sm:max-w-[150px] truncate">{userName || 'Set Name'}</span>
              </button>

              {/* Date Picker */}
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 pointer-events-none hidden sm:block" />
                <input
                  type="date"
                  value={isoDateValue}
                  onChange={handleDateInputChange}
                  aria-label="Active attendance date"
                  className="w-[108px] sm:w-auto pl-1.5 sm:pl-8 pr-1 sm:pr-2 py-1.5 text-[11px] sm:text-xs font-mono bg-white/10 border border-white/20 rounded-full text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* UI Improvement Guide Button */}
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                aria-label="Open UI Improvement Guide"
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-300 border border-white/15 transition-colors cursor-pointer"
                title="See what was improved in this UI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>UI Guide</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                type="button"
                onClick={() => setDarkMode(d => !d)}
                aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/15 transition-colors cursor-pointer"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {/* Role Unlock / Lock Button */}
              {userRole === 'viewer' ? (
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold bg-white/20 hover:bg-white/30 text-white border border-white/20 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>View Only</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('viewer');
                    safeSetStorage('gi_role_v2', 'viewer');
                    safeSetStorage('gi_role', 'viewer');
                    logActivity('Locked portal access');
                    showToast('Locked to Viewer mode', 'info');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
                  title="Click to lock session"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="uppercase">{userRole}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* POOR-NETWORK OFFLINE SYNC QUEUE BANNER */}
        <OfflineQueueBanner
          isOnline={isOnline}
          queuedCount={offlineQueuedCount}
          onSyncNow={flushOfflineQueue}
        />
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 space-y-3">
        {/* COMPACT 4-KPI SUMMARY STRIP */}
        <section
          aria-label="Site Key Metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 tabular-nums no-print"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Present Today
              </span>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">
                {dashboardStats.presentToday}{' '}
                <span className="text-xs font-normal text-slate-400">/ {dashboardStats.totalWorkers}</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              {dashboardStats.totalWorkers > 0
                ? `${Math.round((dashboardStats.presentToday / dashboardStats.totalWorkers) * 100)}%`
                : '0%'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Monthly OT
              </span>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {dashboardStats.totalOT} <span className="text-xs font-normal text-slate-400">Hrs</span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {selectedMonth}/{selectedYear}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Advances Paid
              </span>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                ₹{Math.round(dashboardStats.totalAdvance).toLocaleString('en-IN')}
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Ded.</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Net Wage Liability
              </span>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₹{Math.round(dashboardStats.totalNetBalance).toLocaleString('en-IN')}
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Payable
            </span>
          </div>
        </section>

        {/* DESKTOP NAVIGATION TABS (Hidden on mobile where Bottom Nav is used) */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-xs no-print"
        >
          {[
            { id: 'attendance', label: 'Daily Attendance', icon: CheckSquare },
            { id: 'dpr', label: 'DPR & Site Stock', icon: ClipboardList },
            { id: 'register', label: 'Monthly Register & Staff', icon: Table },
            { id: 'reports', label: 'Wage Slips, Reports & Tools', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ACTIVE WORKSPACE VIEW */}
        {activeTab === 'attendance' && (
          <AttendanceTab
            appState={appState}
            selectedDay={selectedDay}
            monthKey={monthKey}
            userRole={userRole}
            isMasterRollup={isMasterRollup}
            isDayAutoLocked={isDayAutoLocked}
            isDayManuallyLocked={isDayManuallyLocked}
            isWorkerDayLocked={isWorkerDayLocked}
            onSetDailyDuty={handleSetDailyDuty}
            onSetDailyOT={handleSetDailyOT}
            onSetDailyAdv={handleSetDailyAdv}
            onMarkAllPresent={handleMarkAllPresent}
            onToggleDayLockForSupervisors={handleToggleDayLockForSupervisors}
            onOpenTransferModal={w => {
              setTransferTargetWorker(w || null);
              setIsTransferModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingWorker(null);
              setIsWorkerModalOpen(true);
            }}
            onOpenEditModal={(id, type) => {
              if (type === 'worker') {
                const found = appState.workers.find(w => w.id === id) || null;
                setEditingWorker(found);
                setIsWorkerModalOpen(true);
              }
            }}
            onDeleteWorker={handleDeleteWorkerOrKp}
            onOpenWorkerProfile={wId => {
              const found = appState.workers.find(w => w.id === wId) || null;
              setProfileWorker(found);
            }}
            onRequireAuth={() => setIsPinModalOpen(true)}
          />
        )}

        {activeTab === 'dpr' && (
          <DprSiteTab
            appState={appState}
            dateKey={dateKey}
            selectedDay={selectedDay}
            monthKey={monthKey}
            userRole={userRole}
            userName={userName || userRole.toUpperCase()}
            isMasterRollup={isMasterRollup}
            onUpdateDPR={handleUpdateDPR}
            onPhotoUpload={handlePhotoUploadInput}
            onOpenPhotoLightbox={url => window.open(url, '_blank', 'noopener,noreferrer')}
            onOpenStockThresholdModal={() => setIsStockThresholdModalOpen(true)}
            onAddTimelineNote={handleAddTimelineNote}
            onToggleTimelineNote={handleToggleTimelineNote}
            onDeleteTimelineNote={handleDeleteTimelineNote}
            onAddEquipment={handleAddEquipment}
            onCycleEquipmentStatus={handleCycleEquipmentStatus}
            onDeleteEquipment={handleDeleteEquipment}
            onRequireAuth={() => setIsPinModalOpen(true)}
            showToast={msg => showToast(msg, 'info')}
          />
        )}

        {activeTab === 'register' && (
          <RegisterTab
            appState={appState}
            userRole={userRole}
            monthKey={monthKey}
            selectedDay={selectedDay}
            siteName={currentSite?.name || 'Site'}
            subgroupName={isMasterRollup ? 'Master Roll-Up' : currentSubgroup?.name || 'Subgroup'}
            onUpdateCell={handleUpdateRegisterCell}
            onUpdateOpeningAdvance={handleUpdateOpeningAdvance}
            onOpenWorkerModal={(w?: WorkerProfile) => {
              setEditingWorker(w || null);
              setIsWorkerModalOpen(true);
            }}
            onDeleteWorker={id => handleDeleteWorkerOrKp(id, 'worker')}
            onOpenWorkerProfile={(w: WorkerProfile) => setProfileWorker(w)}
            onRequireLogin={() => setIsPinModalOpen(true)}
            onToast={showToast}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsSlipsTab
            appState={appState}
            monthKey={monthKey}
            selectedDay={selectedDay}
            siteName={currentSite?.name || 'Site'}
            subgroupName={isMasterRollup ? 'Master Roll-Up' : currentSubgroup?.name || 'Subgroup'}
            onToast={showToast}
          />
        )}
      </main>

      {/* MOBILE THUMB-ZONE BOTTOM NAVIGATION BAR (4 clear tabs, <= 56px height) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 h-14 no-print"
      >
        {[
          { id: 'attendance', label: 'Attendance', icon: CheckSquare },
          { id: 'dpr', label: 'DPR & Stock', icon: ClipboardList },
          { id: 'register', label: 'Register', icon: Table },
          { id: 'reports', label: 'Slips & Tools', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-16 md:bottom-5 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'success'
              ? 'bg-emerald-600'
              : 'bg-slate-900 dark:bg-blue-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* STARTUP DEVICE NAME PROMPT MODAL (Shown when gi_user_profile is empty) */}
      <NamePromptModal
        isOpen={!userName}
        onSaveName={handleSaveUserName}
      />

      {/* PROFILE & LIVE PORTAL ANALYTICS SLIDE-OVER DRAWER */}
      <ProfileAnalyticsDrawer
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        userName={userName}
        onUpdateUserName={handleSaveUserName}
        userRole={userRole}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onLockRole={() => {
          setUserRole('viewer');
          safeSetStorage('gi_role_v2', 'viewer');
          safeSetStorage('gi_role', 'viewer');
          logActivity('Locked portal access');
          showToast('Locked to Viewer mode', 'info');
        }}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onForceSync={() => {
          flushOfflineQueue();
          showToast('Force Synced with Cloud', 'success');
        }}
        sites={sites}
        appState={appState}
        monthKey={monthKey}
        selectedDay={selectedDay}
        onJumpToDay={dayNum => {
          setSelectedDay(dayNum);
          showToast(`Jumped to Day ${dayNum}`, 'info');
        }}
        totalSyncs={totalSyncs}
        presenceList={presenceList}
        peakUsers={peakUsers}
        activityLogs={activityLogs}
      />

      {/* PIN LOGIN MODAL */}
      <PinLoginModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={(role, msg) => {
          setUserRole(role);
          safeSetStorage('gi_role_v2', role);
          safeSetStorage('gi_role', role);
          logActivity(`Authorized as ${role}`);
          showToast(msg, 'success');
        }}
        onBarrelRoll={() => {
          setBarrelRoll(true);
          showToast('Barrel Roll Activated!', 'info');
          setTimeout(() => setBarrelRoll(false), 2000);
        }}
      />

      {/* WORKER ADD/EDIT MODAL WITH 110+ TRADES */}
      <WorkerFormModal
        isOpen={isWorkerModalOpen}
        editingWorker={editingWorker}
        initialAdvance={editingWorker ? appState.advances[editingWorker.id] || 0 : 0}
        onClose={() => setIsWorkerModalOpen(false)}
        onSave={handleSaveWorker}
      />

      {/* WORKER PROFILE, CALENDAR & SETTLEMENT MODAL */}
      <WorkerProfileModal
        worker={profileWorker}
        appState={appState}
        monthKey={monthKey}
        siteName={currentSite?.name || 'Site'}
        userRole={userRole}
        onClose={() => setProfileWorker(null)}
        onRecordSettlement={handleRecordSettlement}
        onOpenTransferModal={w => {
          setTransferTargetWorker(w);
          setIsTransferModalOpen(true);
        }}
      />

      {/* WORKER TRANSFER / COPY BETWEEN GROUPS MODAL */}
      <WorkerTransferModal
        isOpen={isTransferModalOpen}
        workers={appState.workers}
        initialWorker={transferTargetWorker}
        sites={sites}
        currentSiteId={currentSiteId}
        currentSubgroupId={currentSubgroupId}
        onClose={() => setIsTransferModalOpen(false)}
        onTransferWorker={handleTransferWorker}
      />

      {/* CUSTOM LOW-STOCK ALERT THRESHOLDS MODAL */}
      <StockThresholdModal
        isOpen={isStockThresholdModalOpen}
        thresholds={appState.stockThresholds}
        activeMaterialNames={activeMaterialNames}
        onClose={() => setIsStockThresholdModalOpen(false)}
        onSaveThresholds={handleSaveStockThresholds}
      />

      {/* UI IMPROVEMENT GUIDE MODAL */}
      <UiImprovementGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
