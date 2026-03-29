import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router';
import BottomNav from './BottomNav';

const base = import.meta.env.BASE_URL;
const SPLASH_VIDEOS = [`${base}videos/splash_1.mp4`, `${base}videos/splash_2.mp4`];
const SPLASH_KEY = 'crusade_splash_shown';

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoIndex] = useState(() => Math.floor(Math.random() * SPLASH_VIDEOS.length));
  const [fadeOut, setFadeOut] = useState(false);
  const completedRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
  }, []);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFadeOut(true);
    sessionStorage.setItem(SPLASH_KEY, '1');
    fadeTimerRef.current = setTimeout(onDone, 600);
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, 8000);
    return () => clearTimeout(timer);
  }, [handleComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src={SPLASH_VIDEOS[videoIndex]}
        autoPlay
        muted
        playsInline
        onEnded={handleComplete}
        onError={handleComplete}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        onClick={handleComplete}
        className="absolute bottom-8 right-8 z-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
      >
        Skip &rarr;
      </button>
    </div>
  );
}

export default function AppLayout() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_KEY)
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
      {/* Page content with bottom padding for nav bar */}
      <div className="pb-20">
        <Outlet />
      </div>
      {!showSplash && <BottomNav />}
    </div>
  );
}
