import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Plus,
  Check,
  Shield,
  RefreshCw,
  Sun,
  Moon,
  Lock,
  Unlock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import {
  AppState,
  SiteNode,
  UserRole,
  parseDutyInput
} from '../utils/siteLogic';

// ==========================================
// 1. OFFICIAL GLOBAL INDUSTRIES SVG LOGO, LETTERHEAD & 60FPS CENTER-TO-HEADER INTRO GLIDE
// ==========================================
export const GlobalIndustriesBrandMark: React.FC<{ idSuffix?: string }> = ({ idSuffix = 'hdr' }) => {
  const gradId = `globeGrad_${idSuffix}`;
  const clipId = `globeClip_${idSuffix}`;
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Exact Golden Globe GI SVG from user's original letterhead */}
      <div className="w-11 h-11 sm:w-13 sm:h-13 shrink-0 drop-shadow-xs">
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label="Global Industries GI Globe Logo">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D49B4B" />
              <stop offset="55%" stopColor="#B87B28" />
              <stop offset="100%" stopColor="#8A5612" />
            </linearGradient>
            <clipPath id={clipId}>
              <circle cx="50" cy="50" r="45" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <ellipse cx="50" cy="50" rx="34" ry="45" stroke={`url(#${gradId})`} strokeWidth="2.6" fill="none" />
            <ellipse cx="50" cy="50" rx="23" ry="45" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
            <ellipse cx="50" cy="50" rx="12" ry="45" stroke={`url(#${gradId})`} strokeWidth="2.4" fill="none" />
            <line x1="50" y1="5" x2="50" y2="95" stroke={`url(#${gradId})`} strokeWidth="2.5" />
            <path d="M 5,19 Q 50,26 95,19" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
            <path d="M 5,30 Q 50,35 95,30" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
            <path d="M 5,70 Q 50,65 95,70" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
            <path d="M 5,81 Q 50,74 95,81" stroke={`url(#${gradId})`} strokeWidth="2.5" fill="none" />
            <path d="M 32,6 Q 50,12 68,6 Z" fill={`url(#${gradId})`} />
            <path d="M 32,94 Q 50,88 68,94 Z" fill={`url(#${gradId})`} />
            <rect x="4" y="39" width="92" height="22" fill={`url(#${gradId})`} />
          </g>
          <circle cx="50" cy="50" r="45" stroke={`url(#${gradId})`} strokeWidth="3.5" fill="none" />
          <text
            x="50"
            y="55.5"
            fill="#FFFFFF"
            fontFamily="'Arial Black', Arial, sans-serif"
            fontSize="16.5"
            fontWeight="900"
            letterSpacing="3.5"
            textAnchor="middle"
          >
            GI
          </text>
        </svg>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: '"Brush Script MT", "Kaushan Script", "Comic Sans MS", cursive',
            color: '#4CAF50'
          }}
          className="text-3xl sm:text-[40px] leading-none"
        >
          Global
        </span>
        <span
          style={{
            fontFamily: '"Times New Roman", Times, serif',
            color: '#6da35e'
          }}
          className="text-xl sm:text-[25px] tracking-wide font-normal"
        >
          Industries
        </span>
      </div>
    </div>
  );
};

interface GlobalIndustriesLetterheadProps {
  logoTargetRef?: React.RefObject<HTMLDivElement | null>;
  hideLogoForMorph?: boolean;
}

export const GlobalIndustriesLetterhead: React.FC<GlobalIndustriesLetterheadProps> = ({
  logoTargetRef,
  hideLogoForMorph = false
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b-[3px] border-[#8B5A2B] px-3 sm:px-6 py-2.5 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
        <div
          ref={logoTargetRef}
          className={`inline-flex items-center origin-left transition-opacity duration-150 ${
            hideLogoForMorph ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <GlobalIndustriesBrandMark idSuffix="header" />
        </div>

        <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">
          <strong className="font-bold text-slate-900 dark:text-white">Regd. Office :</strong> Thokrichak, P.O. Garahra, Via Barauni, Dist. Begusarai, Bihar- 851 126.
        </div>
      </div>
    </div>
  );
};

interface IntroCenterToHeaderGlideProps {
  stage: 'center' | 'gliding' | 'done';
  isCloudReady: boolean;
  userName: string;
  siteName: string;
  subgroupName: string;
  workerCount: number;
  headerLogoRef: React.RefObject<HTMLDivElement | null>;
  onSkip: () => void;
}

export const IntroCenterToHeaderGlide: React.FC<IntroCenterToHeaderGlideProps> = ({
  stage,
  isCloudReady,
  userName,
  siteName,
  subgroupName,
  workerCount,
  headerLogoRef,
  onSkip
}) => {
  const introLogoRef = useRef<HTMLDivElement | null>(null);
  const [glideDelta, setGlideDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    if (stage === 'gliding' && introLogoRef.current && headerLogoRef.current) {
      const src = introLogoRef.current.getBoundingClientRect();
      const dest = headerLogoRef.current.getBoundingClientRect();
      const srcCenterX = src.left + src.width / 2;
      const srcCenterY = src.top + src.height / 2;
      const destCenterX = dest.left + dest.width / 2;
      const destCenterY = dest.top + dest.height / 2;
      setGlideDelta({
        dx: destCenterX - srcCenterX,
        dy: destCenterY - srcCenterY
      });
    }
  }, [stage, headerLogoRef]);

  if (stage === 'done') return null;

  const isGliding = stage === 'gliding';

  return (
    <div
      onClick={onSkip}
      role="presentation"
      title="Tap anywhere to skip intro"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden no-print"
    >
      {/* Clean White / Dark Surface Curtain that fades out during the glide */}
      <div
        className={`absolute inset-0 bg-white dark:bg-slate-950 gi-gpu-glide ${
          isGliding ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Morphing Golden GI Globe + Global Industries Brand Mark */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          ref={introLogoRef}
          style={{
            transform: isGliding
              ? `translate3d(${glideDelta.dx}px, ${glideDelta.dy}px, 0) scale(1)`
              : 'translate3d(0px, 0px, 0) scale(1.38)'
          }}
          className="gi-gpu-glide origin-center"
        >
          <div className="gi-intro-pop">
            <GlobalIndustriesBrandMark idSuffix="intro" />
          </div>
        </div>

        {/* Subtitle & Real Firebase Sync Status Pill (Fades out cleanly when logo glides to header) */}
        <div
          style={{
            transform: isGliding ? 'translate3d(0, 12px, 0)' : 'translate3d(0, 0, 0)'
          }}
          className={`mt-6 flex flex-col items-center gap-3 text-center px-4 gi-gpu-glide ${
            isGliding ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-md">
            <strong className="font-bold text-slate-900 dark:text-white">Regd. Office :</strong> Thokrichak, P.O. Garahra, Via Barauni, Dist. Begusarai, Bihar- 851 126
          </p>

          {/* Live Firebase Load Status Pill */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-2xs transition-all duration-300 ${
              isCloudReady
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {isCloudReady ? (
              <>
                <span>🟢</span>
                <span>
                  Cloud Synced • Welcome{userName ? `, ${userName}` : ''} ({siteName} ➔ {subgroupName} • {workerCount} Workers)
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Syncing Site Data...</span>
              </>
            )}
          </div>

          {/* Smooth Golden Progress Bar */}
          <div className="w-48 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              style={{
                width: isCloudReady ? '100%' : '55%',
                transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
              className="h-full bg-gradient-to-r from-[#D49B4B] via-[#4CAF50] to-[#B87B28] rounded-full"
            />
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
            Tap anywhere to skip
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. HIERARCHICAL SITE & SUBGROUP DROPDOWN (MATCHING SCREENSHOT)
// ==========================================
interface SiteHierarchyDropdownProps {
  sites: SiteNode[];
  currentSiteId: string;
  currentSubgroupId: string;
  isMasterRollup: boolean;
  userRole: UserRole;
  onSelectSiteSubgroup: (siteId: string, subgroupId: string) => void;
  onCreateSite: (siteName: string) => void;
  onRenameSite: (siteId: string, newName: string) => void;
  onDeleteSite: (siteId: string) => void;
  onCreateSubgroup: (siteId: string, subName: string) => void;
  onRenameSubgroup: (siteId: string, subId: string, newName: string) => void;
  onDeleteSubgroup: (siteId: string, subId: string) => void;
  onRequireAuth: () => void;
}

export const SiteHierarchyDropdown: React.FC<SiteHierarchyDropdownProps> = ({
  sites,
  currentSiteId,
  currentSubgroupId,
  isMasterRollup,
  userRole,
  onSelectSiteSubgroup,
  onCreateSite,
  onRenameSite,
  onDeleteSite,
  onCreateSubgroup,
  onRenameSubgroup,
  onDeleteSubgroup,
  onRequireAuth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogState, setDialogState] = useState<{
    mode: 'create_site' | 'create_group' | 'rename_site' | 'rename_group' | 'delete_site' | 'delete_group';
    siteId?: string;
    subId?: string;
    initialValue?: string;
    title: string;
    desc: string;
  } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canManage = userRole === 'admin' || userRole === 'incharge' || userRole === 'supervisor';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSite = sites.find(s => s.id === currentSiteId) || sites[0];
  const currentSub = currentSite?.subgroups.find(sub => sub.id === currentSubgroupId) || currentSite?.subgroups[0];

  const openActionDialog = (
    mode: 'create_site' | 'create_group' | 'rename_site' | 'rename_group' | 'delete_site' | 'delete_group',
    siteId?: string,
    subId?: string,
    initialValue = ''
  ) => {
    if (!canManage) {
      setIsOpen(false);
      onRequireAuth();
      return;
    }
    setIsOpen(false);
    setInputValue(initialValue);

    const titles: Record<typeof mode, { title: string; desc: string }> = {
      create_site: {
        title: 'Create New Site',
        desc: 'A Site represents a major geographical project location.'
      },
      create_group: {
        title: 'Create New Group',
        desc: 'Add a work group, contractor team, or block under this site.'
      },
      rename_site: {
        title: 'Rename Site',
        desc: 'Update the name of this project site.'
      },
      rename_group: {
        title: 'Rename Group',
        desc: 'Update the name of this subgroup.'
      },
      delete_site: {
        title: '⚠️ Delete Entire Site',
        desc: `Are you sure you want to permanently delete "${initialValue}" and all its groups?`
      },
      delete_group: {
        title: '🗑️ Delete Group',
        desc: `Are you sure you want to permanently delete group "${initialValue}"?`
      }
    };

    setDialogState({
      mode,
      siteId,
      subId,
      initialValue,
      title: titles[mode].title,
      desc: titles[mode].desc
    });
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogState) return;
    const { mode, siteId, subId } = dialogState;
    const trimmed = inputValue.trim();

    if (mode === 'delete_site' && siteId) {
      onDeleteSite(siteId);
      setDialogState(null);
      return;
    }
    if (mode === 'delete_group' && siteId && subId) {
      onDeleteSubgroup(siteId, subId);
      setDialogState(null);
      return;
    }

    if (!trimmed) return;

    if (mode === 'create_site') {
      onCreateSite(trimmed);
    } else if (mode === 'create_group' && siteId) {
      onCreateSubgroup(siteId, trimmed);
    } else if (mode === 'rename_site' && siteId) {
      onRenameSite(siteId, trimmed);
    } else if (mode === 'rename_group' && siteId && subId) {
      onRenameSubgroup(siteId, subId, trimmed);
    }
    setDialogState(null);
  };

  return (
    <div className="relative flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
      <span className="text-[#FFD700] font-extrabold text-xs sm:text-sm tracking-wider uppercase shrink-0">
        SITE:
      </span>

      {/* White Pill Trigger Button matching user's 2nd screenshot */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Switch Project Site or Subgroup"
        aria-expanded={isOpen}
        className="bg-white hover:bg-slate-50 text-[#102A43] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-between gap-2.5 min-w-[200px] sm:min-w-[270px] max-w-[350px] transition-transform active:scale-98 cursor-pointer"
      >
        <span className="truncate flex items-center gap-1.5">
          <span>🏢 {currentSite ? currentSite.name : 'Select Site'}</span>
          <span className="text-slate-500">➔</span>
          {isMasterRollup ? (
            <span>🌍 Master Roll-Up</span>
          ) : (
            <span>📍 {currentSub ? currentSub.name : 'Select Group'}</span>
          )}
        </span>
        <span className="text-[11px] text-[#102A43] shrink-0">▼</span>
      </button>

      {/* Hierarchical Tree Popover Menu matching user's 2nd screenshot */}
      {isOpen && (
        <div
          role="menu"
          className="absolute top-11 left-0 sm:left-11 z-50 w-[330px] sm:w-[375px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[440px] overflow-y-auto"
        >
          {sites.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 text-center">No sites created</div>
          ) : (
            sites.map(site => (
              <div key={site.id} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                {/* Site Header Row */}
                <div className="bg-slate-50/90 dark:bg-slate-800/80 px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSiteSubgroup(site.id, 'ALL_GROUPS');
                      setIsOpen(false);
                    }}
                    className="text-xs sm:text-sm font-black uppercase tracking-wide text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 text-left truncate"
                    title="Click to view Master Roll-Up for this Site"
                  >
                    <span>🏢</span>
                    <span className="truncate">{site.name}</span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openActionDialog('create_group', site.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white text-[11px] font-black uppercase transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>GROUP</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openActionDialog('rename_site', site.id, undefined, site.name);
                      }}
                      aria-label={`Rename site ${site.name}`}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center justify-center text-xs shadow-2xs transition-transform hover:scale-105"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openActionDialog('delete_site', site.id, undefined, site.name);
                      }}
                      aria-label={`Delete site ${site.name}`}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 flex items-center justify-center text-xs shadow-2xs transition-transform hover:scale-105"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Subgroup Tree Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {site.subgroups.map((sub, idx) => {
                    const isSelected = !isMasterRollup && site.id === currentSiteId && sub.id === currentSubgroupId;
                    const isLast = idx === site.subgroups.length - 1;
                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          onSelectSiteSubgroup(site.id, sub.id);
                          setIsOpen(false);
                        }}
                        className={`relative pl-10 pr-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-pink-50/70 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 font-extrabold'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-bold'
                        }`}
                      >
                        {/* Vertical & Horizontal Tree Connector Lines */}
                        <span
                          aria-hidden="true"
                          className={`absolute left-5 top-0 w-[2px] bg-slate-200 dark:bg-slate-700 ${
                            isLast ? 'h-1/2' : 'h-full'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute left-5 top-1/2 w-3 h-[2px] bg-slate-200 dark:bg-slate-700"
                        />

                        <span className="text-xs sm:text-sm truncate flex items-center gap-1.5">
                          <span>📍</span>
                          <span className="truncate">{sub.name}</span>
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openActionDialog('rename_group', site.id, sub.id, sub.name);
                            }}
                            aria-label={`Rename group ${sub.name}`}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center justify-center text-xs shadow-2xs transition-transform hover:scale-105"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openActionDialog('delete_group', site.id, sub.id, sub.name);
                            }}
                            aria-label={`Delete group ${sub.name}`}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 flex items-center justify-center text-xs shadow-2xs transition-transform hover:scale-105"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Bottom Create New Site Button */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => openActionDialog('create_site')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white text-xs font-black uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>CREATE NEW SITE</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal for Create / Rename / Delete Site or Subgroup */}
      {dialogState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">{dialogState.title}</h3>
              <button
                type="button"
                onClick={() => setDialogState(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{dialogState.desc}</p>
            <form onSubmit={handleDialogSubmit} className="space-y-3">
              {!dialogState.mode.startsWith('delete_') && (
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDialogState(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                    dialogState.mode.startsWith('delete_')
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {dialogState.mode.startsWith('delete_') ? 'Confirm Delete' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. FIRST-TIME STARTUP DEVICE NAME PROMPT MODAL
// ==========================================
interface NamePromptModalProps {
  isOpen: boolean;
  onSaveName: (name: string) => void;
}

export const NamePromptModal: React.FC<NamePromptModalProps> = ({ isOpen, onSaveName }) => {
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) {
      setError('Please enter your name to identify your device on the live board.');
      return;
    }
    onSaveName(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-welcome-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-4"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">
          👤
        </div>
        <div>
          <h2 id="profile-welcome-title" className="text-xl font-black text-slate-900 dark:text-white">
            Global Industries
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter your full name to identify your updates on the live activity board (saved permanently for this device):
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            autoFocus
            value={nameInput}
            onChange={e => {
              setNameInput(e.target.value);
              setError('');
            }}
            placeholder="Your Name (e.g. Mudassir)"
            aria-label="Your Full Name"
            className="w-full px-4 py-3 text-center text-base font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-colors cursor-pointer"
          >
            Enter Portal
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. PROFILE & LIVE PORTAL ANALYTICS SLIDE-OVER DRAWER
// ==========================================
export interface PresenceUser {
  name: string;
  role: string;
  device: string;
  time: number;
}

export interface ActivityLogItem {
  user: string;
  action: string;
  time: number;
}

interface ProfileAnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (newName: string) => void;
  userRole: UserRole;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenPinModal: () => void;
  onLockRole: () => void;
  onForceSync: () => void;
  sites: SiteNode[];
  appState: AppState;
  monthKey: string;
  selectedDay: number;
  onJumpToDay: (day: number) => void;
  totalSyncs: number;
  presenceList: PresenceUser[];
  peakUsers: number;
  activityLogs: ActivityLogItem[];
}

export const ProfileAnalyticsDrawer: React.FC<ProfileAnalyticsDrawerProps> = ({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  userRole,
  darkMode,
  onToggleDarkMode,
  onOpenPinModal,
  onLockRole,
  onForceSync,
  sites,
  appState,
  monthKey,
  selectedDay,
  onJumpToDay,
  totalSyncs,
  presenceList,
  peakUsers,
  activityLogs
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [pingMs, setPingMs] = useState(24);
  const [cpuPct, setCpuPct] = useState(9);
  const [uptimeStr, setUptimeStr] = useState('00:00:12');
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setTempName(userName);
  }, [userName]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPingMs(Math.floor(Math.random() * (42 - 16) + 16));
      setCpuPct(Math.floor(Math.random() * (18 - 5) + 5));
      const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setUptimeStr(`${h}:${m}:${s}`);
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const analyticsData = useMemo(() => {
    const parts = monthKey.split('-');
    const m = parseInt(parts[0], 10) || 1;
    const y = parseInt(parts[1], 10) || 2026;
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthAtt = appState.attendance[monthKey] || {};
    const maxW = Math.max(appState.workers.length, 1);

    // 1. 7-Day Attendance Trend Bars
    const trendBars: { day: number; present: number; pct: number; isSelected: boolean }[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const dNum = selectedDay - offset;
      if (dNum < 1) continue;
      let dayPresent = 0;
      appState.workers.forEach(w => {
        const rec = monthAtt[w.id]?.[dNum];
        const dutyVal = rec ? parseDutyInput(rec.duty) : null;
        if (dutyVal !== null && dutyVal > 0) dayPresent += dutyVal;
      });
      const pct = Math.min(100, Math.round((dayPresent / maxW) * 100));
      trendBars.push({
        day: dNum,
        present: dayPresent,
        pct,
        isSelected: dNum === selectedDay
      });
    }

    // 2. Trade-Wise Workforce Distribution
    const tradeMap: Record<string, number> = {};
    appState.workers.forEach(w => {
      const t = (w.desig || 'Unspecified').trim().toUpperCase();
      tradeMap[t] = (tradeMap[t] || 0) + 1;
    });
    const palette = ['#2D68C4', '#10B981', '#F59E0B', '#9333EA', '#EF4444', '#06B6D4', '#EC4899'];
    const tradeEntries = Object.entries(tradeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([trade, count], idx) => ({
        trade,
        count,
        pct: appState.workers.length > 0 ? Math.round((count / appState.workers.length) * 100) : 0,
        color: palette[idx % palette.length]
      }));

    // 3. Monthly Gross vs Advance Split & Site Operations
    let presentToday = 0;
    let totalGross = 0;
    let totalAdv = 0;
    let totalOT = 0;

    appState.workers.forEach(w => {
      let wD = 0;
      let wO = 0;
      let wA = 0;
      const wDays = monthAtt[w.id];
      if (wDays) {
        const todayRec = wDays[selectedDay];
        const todayDuty = todayRec ? parseDutyInput(todayRec.duty) : null;
        if (todayDuty !== null && todayDuty > 0) presentToday++;

        for (let d = 1; d <= daysInMonth; d++) {
          const rec = wDays[d];
          if (rec) {
            wD += parseDutyInput(rec.duty) || 0;
            wO += parseFloat(String(rec.ot)) || 0;
            wA += parseFloat(String(rec.adv)) || 0;
          }
        }
      }
      const rate = Number(w.rate) || 0;
      totalGross += wD * rate + wO * (rate / 8);
      totalAdv += (Number(appState.advances[w.id]) || 0) + wA;
      totalOT += wO;
    });

    const netPay = Math.max(0, totalGross - totalAdv);
    const denom = Math.max(totalGross, 1);
    const advPct = Math.min(100, Math.round((totalAdv / denom) * 100));
    const netPct = Math.max(0, 100 - advPct);
    const attendRate = appState.workers.length > 0 ? Math.round((presentToday / appState.workers.length) * 100) : 0;

    let totalSubgroups = 0;
    sites.forEach(s => {
      totalSubgroups += s.subgroups?.length || 0;
    });

    let rainDays = 0;
    let matActivity = 0;
    Object.values(appState.dpr || {}).forEach(d => {
      if (!d) return;
      if (d.rainStart || (d.weather && d.weather.includes('Rain'))) rainDays++;
      matActivity += (d.matReceived?.length || 0) + (d.matConsumed?.length || 0);
    });

    const payloadKb = (new Blob([JSON.stringify(appState)]).size / 1024).toFixed(1);

    return {
      trendBars,
      tradeEntries,
      totalGross,
      totalAdv,
      totalOT,
      netPay,
      advPct,
      netPct,
      attendRate,
      totalSubgroups,
      rainDays,
      matActivity,
      payloadKb
    };
  }, [appState, monthKey, selectedDay, sites]);

  if (!isOpen) return null;

  const r = 42;
  const circum = 2 * Math.PI * r;
  let offsetLen = 0;

  const activeSessions = Math.max(presenceList.length, 1);
  const mobileCount = presenceList.filter(u => u.device && u.device.toLowerCase().includes('mobile')).length;
  const mobilePct = presenceList.length > 0 ? Math.round((mobileCount / presenceList.length) * 100) : 0;
  const desktopPct = 100 - mobilePct;

  const adminActionsCount = activityLogs.filter(
    a =>
      (a.action &&
        (a.action.includes('Deleted') ||
          a.action.includes('Wiped') ||
          a.action.includes('Authorized as admin'))) ||
      (a.user && a.user.toLowerCase().includes('admin'))
  ).length;

  const handleSaveNameEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tempName.trim();
    if (cleaned) {
      onUpdateUserName(cleaned);
      setIsEditingName(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live Portal Analytics and Profile"
        className="w-full max-w-[430px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800"
      >
        {/* Blue Header Matching Screenshot #2 */}
        <div className="bg-[#5899E2] dark:bg-blue-700 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <h3 className="text-lg font-extrabold tracking-tight">Live Portal Analytics</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Live Portal Analytics"
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-800 dark:text-slate-100">
          {/* PROFILE & QUICK DEVICE OPTIONS CARD */}
          <div className="rounded-2xl border border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#152E4D] text-white flex items-center justify-center text-lg font-bold shrink-0">
                  👤
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Fixed Device Profile
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {userName || 'Guest User'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="uppercase font-bold text-emerald-600 dark:text-emerald-400">{userRole}</span>
                    <span>•</span>
                    <span>💻 Active Session</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempName(userName);
                  setIsEditingName(prev => !prev);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:border-blue-400 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingName ? 'Cancel' : 'Change Name'}</span>
              </button>
            </div>

            {isEditingName && (
              <form onSubmit={handleSaveNameEdit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  placeholder="Enter new device name..."
                  className="flex-1 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </form>
            )}

            {/* Quick Options Grid inside Profile */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {userRole === 'viewer' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPinModal();
                  }}
                  className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Role PIN</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLockRole}
                  className="px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Lock ({userRole})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center gap-1.5"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
              </button>

              <button
                type="button"
                onClick={onForceSync}
                className="col-span-2 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Force Cloud Sync</span>
              </button>
            </div>
          </div>

          {/* VISUAL WORKFORCE & FINANCIAL CHARTS (EXACT MATCH TO SCREENSHOT #2) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Visual Workforce &amp; Financial Charts
            </h4>

            {/* 1. 7-Day Attendance Trend Card */}
            <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  7-Day Attendance Trend
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Click bar to jump</span>
              </div>
              <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1 px-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800">
                {analyticsData.trendBars.map(bar => (
                  <button
                    key={bar.day}
                    type="button"
                    onClick={() => onJumpToDay(bar.day)}
                    title={`Click to jump to Day ${bar.day} (${bar.present} Present)`}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1 group cursor-pointer"
                  >
                    <span
                      className={`text-[10px] font-black ${
                        bar.isSelected ? 'text-pink-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {bar.present}
                    </span>
                    <div
                      style={{
                        height: `${Math.max(bar.pct, 10)}%`,
                        background: bar.isSelected
                          ? 'linear-gradient(180deg, #FACC15, #F59E0B)'
                          : 'linear-gradient(180deg, #EC4899, #60A5FA)'
                      }}
                      className="w-full max-w-[26px] rounded-t-md rounded-b-xs transition-all group-hover:opacity-85"
                    />
                    <span
                      className={`text-[10px] ${
                        bar.isSelected
                          ? 'font-black text-pink-600 dark:text-amber-400'
                          : 'font-bold text-slate-400'
                      }`}
                    >
                      D{bar.day}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Trade-Wise Workforce Donut Card */}
            <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3.5 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Trade-Wise Workforce
              </span>
              <div className="flex items-center gap-4">
                <svg viewBox="0 0 120 120" width="96" height="96" className="shrink-0">
                  {appState.workers.length === 0 ? (
                    <circle cx="60" cy="60" r={r} fill="none" stroke="#E2E8F0" strokeWidth="14" />
                  ) : (
                    analyticsData.tradeEntries.map(item => {
                      const segLen = (item.count / appState.workers.length) * circum;
                      const currentOffset = offsetLen;
                      offsetLen += segLen;
                      return (
                        <circle
                          key={item.trade}
                          cx="60"
                          cy="60"
                          r={r}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="14"
                          strokeDasharray={`${segLen} ${circum}`}
                          strokeDashoffset={-currentOffset}
                          transform="rotate(-90 60 60)"
                        />
                      );
                    })
                  )}
                  <text
                    x="60"
                    y="57"
                    textAnchor="middle"
                    fill="#3B82F6"
                    fontSize="18"
                    fontWeight="900"
                  >
                    {appState.workers.length}
                  </text>
                  <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                    fontWeight="800"
                  >
                    STAFF
                  </text>
                </svg>

                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {analyticsData.tradeEntries.map(item => (
                    <div key={item.trade} className="flex items-center justify-between text-xs font-extrabold gap-2">
                      <span className="flex items-center gap-2 truncate text-slate-600 dark:text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.trade}</span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Gross vs. Advance Split Card */}
            <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3.5 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Gross vs. Advance Split
              </span>
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-slate-500">
                  GROSS:{' '}
                  <strong className="text-blue-500 text-sm">
                    ₹{Math.round(analyticsData.totalGross).toLocaleString('en-IN')}
                  </strong>
                </span>
                <span className="text-slate-500">
                  ADV:{' '}
                  <strong className="text-rose-500 text-sm">
                    ₹{Math.round(analyticsData.totalAdv).toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>

              <div className="h-4 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                <div
                  style={{ width: `${analyticsData.netPct}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full"
                  title={`Net Payable: ${analyticsData.netPct}%`}
                />
                <div
                  style={{ width: `${analyticsData.advPct}%` }}
                  className="bg-gradient-to-r from-rose-500 to-rose-600 h-full"
                  title={`Advances: ${analyticsData.advPct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  🟢 NET PAYABLE: {analyticsData.netPct}% (₹{Math.round(analyticsData.netPay).toLocaleString('en-IN')})
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  🔴 ADVANCES: {analyticsData.advPct}%
                </span>
              </div>
            </div>
          </div>

          {/* NETWORK PRESENCE (EXACT MATCH TO SCREENSHOT #2) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Network Presence
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Active Sessions
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{activeSessions}</b>
              </div>
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Peak Users
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{Math.max(peakUsers, activeSessions)}</b>
              </div>
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Mobile Div.
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{mobilePct}%</b>
              </div>
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Desktop Div.
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{desktopPct}%</b>
              </div>
            </div>

            {/* Online Users List */}
            <div className="space-y-2">
              {(presenceList.length > 0
                ? presenceList
                : [
                    {
                      name: userName || 'Mudassir',
                      role: userRole,
                      device: '💻 Desktop',
                      time: Date.now()
                    }
                  ]
              ).map((u, i) => {
                const timeStr = new Date(u.time || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div
                    key={`${u.name}-${i}`}
                    className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                      <strong className="font-black text-slate-900 dark:text-white">{u.name}</strong>
                      <span className="text-slate-400 font-semibold">({u.role})</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px]">
                      <span>Since {timeStr}</span>
                      <span>{u.device && u.device.includes('Mobile') ? '📱' : '💻'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AUDIT LOG SECTION (EXACT MATCH TO SCREENSHOT #2) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Audit Log
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Today's Logs
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{activityLogs.length}</b>
              </div>
              <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-[#FAF5FF]/60 dark:bg-slate-800/50 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Admin Actions
                </span>
                <b className="text-lg font-black text-blue-500 mt-0.5 block">{adminActionsCount}</b>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <div className="text-center py-3 text-xs text-slate-400">No activity logs recorded yet today</div>
              ) : (
                activityLogs.slice(0, 25).map((log, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <strong className="font-bold text-slate-900 dark:text-white">{log.user}</strong>:{' '}
                      <span className="text-slate-600 dark:text-slate-300">{log.action}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SYSTEM DIAGNOSTICS & SITE OPERATIONS */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              System Diagnostics &amp; Operations
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Ping</span>
                <b className="text-xs font-black text-slate-800 dark:text-white">{pingMs}ms</b>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">CPU Est.</span>
                <b className="text-xs font-black text-slate-800 dark:text-white">{cpuPct}%</b>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Uptime</span>
                <b className="text-xs font-mono font-black text-slate-800 dark:text-white">{uptimeStr}</b>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cloud Node</span>
                <b className="text-xs font-black text-slate-800 dark:text-white">Asia-SE1</b>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payload</span>
                <b className="text-xs font-black text-slate-800 dark:text-white">{analyticsData.payloadKb} KB</b>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Database</span>
                <b className="text-xs font-black text-emerald-600 dark:text-emerald-400">Connected</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
