import { motion } from "framer-motion";
import { LiveIndicator } from "./LiveIndicator";
import { useArsenalLive } from "@/hooks/useArsenalLive";

export function PrimaryLivestream() {
  const { data, isLoading } = useArsenalLive();

  // STATE 1: Loading
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
        <div className="flex aspect-video items-center justify-center bg-secondary">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">
              Checking Arsenal match status...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 2: Arsenal match LIVE with stream
  if (data?.live && data.streamUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-primary/30 bg-card glow-red"
      >
        <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
          <div className="flex items-center gap-3">
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
        <div className="relative aspect-video">
          <iframe
            src={data.streamUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Arsenal Live Stream"
          />
        </div>
      </motion.div>
    );
  }

  // STATE 2b: Live match detected but no stream URL
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
        <div className="flex aspect-video items-center justify-center bg-secondary">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-mono text-sm font-bold text-primary">LIVE MATCH DETECTED</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Stream unavailable — check back shortly</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // STATE 3: No Arsenal match live - Mission Standby
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
      <div className="flex aspect-video items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
            MISSION STANDBY
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            No Arsenal match live currently
          </p>
        </div>
      </div>
    </motion.div>
  );
}
