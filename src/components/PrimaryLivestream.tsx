import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { LiveIndicator } from "./LiveIndicator";
import { useArsenalLive, StreamServer } from "@/hooks/useArsenalLive";

function HlsPlayer({ servers, streamUrl }: { servers?: StreamServer[]; streamUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [error, setError] = useState(false);
  const loadedUrlRef = useRef<string>("");

  // Filter to only m3u8 direct streams
  const hlsServers = (servers || []).filter(
    (s) => s.type === "direct" && s.url.includes(".m3u8")
  );
  const activeUrl = hlsServers.length > 0
    ? hlsServers[Math.min(currentServerIndex, hlsServers.length - 1)]?.url || streamUrl
    : streamUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    // Don't reload if already playing this URL
    if (loadedUrlRef.current === activeUrl && hlsRef.current) return;
    loadedUrlRef.current = activeUrl;

    // Destroy previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setError(false);

    if (activeUrl.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        fragLoadingMaxRetry: 3,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
      });
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn("HLS fatal error:", data.type, data.details);
          hls.destroy();
          hlsRef.current = null;
          loadedUrlRef.current = "";
          // Auto-try next server
          if (hlsServers.length > 1) {
            setCurrentServerIndex((prev) => (prev + 1) % hlsServers.length);
          } else {
            setError(true);
          }
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeUrl;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}), { once: true });
    } else {
      setError(true);
    }

    return () => {
      // Only cleanup on unmount, not on re-renders
    };
  }, [activeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const tryNextServer = () => {
    if (hlsServers.length > 1) {
      loadedUrlRef.current = "";
      setCurrentServerIndex((prev) => (prev + 1) % hlsServers.length);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        controls
        playsInline
        muted
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center px-4">
            <p className="font-mono text-sm text-destructive mb-2">Stream failed to load</p>
            {hlsServers.length > 1 && (
              <button
                onClick={tryNextServer}
                className="font-mono text-xs px-4 py-2 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Try Next Server ({hlsServers.length} available)
              </button>
            )}
          </div>
        </div>
      )}
      {hlsServers.length > 1 && !error && (
        <div className="absolute top-2 right-2 z-10">
          <select
            value={currentServerIndex}
            onChange={(e) => {
              loadedUrlRef.current = "";
              setCurrentServerIndex(Number(e.target.value));
            }}
            className="font-mono text-xs bg-black/70 text-foreground border border-border rounded px-2 py-1"
          >
            {hlsServers.map((s, i) => (
              <option key={i} value={i}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!targetDate) return;

    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      };
    };

    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function PrimaryLivestream() {
  const { data, isLoading } = useArsenalLive();
  const startTime = data?.startTime ?? null;
  const countdown = useCountdown(startTime);

  // Loading
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Mission Feed
          </h3>
        </div>
        <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-xs sm:text-sm text-muted-foreground">
              Checking Arsenal match status...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 1: LIVE with stream
  if (data?.live && data.streamUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-primary/30 bg-card glow-red"
      >
        <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display text-xs uppercase tracking-[0.3em] text-foreground">
              LIVE: {data.homeTeam} vs {data.awayTeam}
            </h3>
            {data.league && (
              <span className="font-mono text-xs text-muted-foreground">
                {data.league}
              </span>
            )}
          </div>
          <LiveIndicator isLive={true} />
        </div>
        <HlsPlayer
          servers={data.servers}
          streamUrl={data.streamUrl}
        />
      </motion.div>
    );
  }

  // STATE 1b: Live but no stream URL
  if (data?.live && !data.streamUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-primary/30 bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-xs uppercase tracking-[0.3em] text-foreground">
            {data.homeTeam} vs {data.awayTeam}
          </h3>
          <LiveIndicator isLive={true} />
        </div>
        <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 text-center px-4">
            <div className="mx-auto mb-3 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <svg className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-mono text-sm sm:text-base font-bold text-primary">LIVE MATCH DETECTED</p>
            <p className="mt-1 font-mono text-xs sm:text-sm text-muted-foreground">Stream unavailable — check back shortly</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 2: Upcoming match with countdown
  if (data?.upcoming && startTime && !countdown.expired) {
    const opponent = data.awayTeam || data.opponent || "Opponent";
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Upcoming Mission
          </h3>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-yellow-500">
              UPCOMING
            </span>
          </div>
        </div>
        <div className="relative w-full aspect-video bg-secondary">
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/70 z-10" />
          {/* Centered countdown overlay */}
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="font-display text-lg md:text-3xl font-black uppercase tracking-wider text-foreground mb-2">
                Arsenal vs {opponent}
              </p>
              <p className="font-mono text-xs sm:text-sm text-muted-foreground mb-6">
                Match starts in
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                <CountdownUnit value={countdown.hours} label="HRS" />
                <span className="font-mono text-xl sm:text-3xl text-muted-foreground">:</span>
                <CountdownUnit value={countdown.minutes} label="MIN" />
                <span className="font-mono text-xl sm:text-3xl text-muted-foreground">:</span>
                <CountdownUnit value={countdown.seconds} label="SEC" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 3: Recently finished match
  if (data?.finished && data.score) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Match Complete
          </h3>
          <div className="inline-flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted px-3 py-1">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              FULL TIME
            </span>
          </div>
        </div>
        <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 text-center px-4">
            <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-muted-foreground mb-4">
              Full Time
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-3">
              <p className="font-display text-base sm:text-xl font-bold text-foreground text-right min-w-[100px]">
                {data.homeTeam}
              </p>
              <p className="font-display text-4xl sm:text-6xl font-black text-primary tracking-wider">
                {data.score}
              </p>
              <p className="font-display text-base sm:text-xl font-bold text-foreground text-left min-w-[100px]">
                {data.awayTeam}
              </p>
            </div>
            {data.league && (
              <p className="font-mono text-xs text-muted-foreground">{data.league}</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 4: No match - Mission Standby
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Mission Feed
        </h3>
        <LiveIndicator isLive={false} />
      </div>
      <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
        <div className="text-center px-4">
          <div className="mx-auto mb-3 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-border bg-muted">
            <svg className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-display text-lg md:text-3xl font-bold uppercase tracking-wider text-foreground">
            MISSION STANDBY
          </p>
          <p className="mt-1 font-mono text-xs sm:text-sm text-muted-foreground">
            No Arsenal match live currently
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-lg border border-border bg-secondary/80 font-mono text-2xl sm:text-4xl font-bold text-foreground">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1.5 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
