import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, WifiOff, RefreshCw, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice && !isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    promptInstall
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await promptInstall();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Global Industries Mobile App"
        title="Install Global Industries Portal to Home Screen (Offline-Ready PWA)"
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 transition-colors cursor-pointer shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B1B2B] border border-amber-400/50 text-amber-400 flex items-center justify-center font-extrabold text-xs">
                  GI
                </div>
                <div>
                  <h3 id="pwa-install-title" className="text-sm font-extrabold">
                    Install Global Industries App
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Works offline at remote sites & syncs automatically
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install instructions"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-blue-500" /> in Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Select <strong>Add to Home Screen</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-blue-500" /> and tap <strong>Add</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Android Chrome / Desktop Browser:
                    </strong>
                    Open the browser menu <strong>(⋮)</strong> and tap{' '}
                    <strong>&ldquo;Install app&rdquo;</strong> or{' '}
                    <strong>&ldquo;Add to Home screen&rdquo;</strong> to launch Global Industries full-screen like a native app.
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

interface OfflineQueueBannerProps {
  isOnline: boolean;
  queuedCount: number;
  onSyncNow: () => void;
}

export const OfflineQueueBanner: React.FC<OfflineQueueBannerProps> = ({
  isOnline,
  queuedCount,
  onSyncNow
}) => {
  if (isOnline && queuedCount === 0) return null;

  return (
    <div
      role="status"
      className={`px-3 sm:px-6 py-2 text-xs font-bold flex items-center justify-between gap-2 border-b no-print ${
        !isOnline
          ? 'bg-amber-500 text-slate-950 border-amber-600'
          : 'bg-blue-600 text-white border-blue-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 shrink-0" />
        ) : (
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
        )}
        <span>
          {!isOnline
            ? queuedCount > 0
              ? `Offline Mode: ${queuedCount} change${queuedCount > 1 ? 's' : ''} saved offline — will sync automatically when network returns.`
              : 'Offline Mode: Poor network detected. Attendance & DPR edits are being queued locally on this device.'
            : `Syncing ${queuedCount} offline change${queuedCount > 1 ? 's' : ''} to Firebase Cloud...`}
        </span>
      </div>
      {isOnline && queuedCount > 0 && (
        <button
          type="button"
          onClick={onSyncNow}
          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};
