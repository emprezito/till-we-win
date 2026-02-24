import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { useAllMatches, Match, useMatchLink } from "@/hooks/useAllMatches";
import { LiveIndicator } from "@/components/LiveIndicator";

function MatchHlsPlayer({ streamUrl, servers }: { streamUrl: string; servers?: any[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setError(false);

    if (streamUrl.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          setError(true);
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}), { once: true });
    } else {
      setError(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  if (error) {
    return (
      <div className="w-full aspect-video bg-secondary flex items-center justify-center rounded-lg">
        <p className="font-mono text-sm text-destructive">Stream failed to load</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 w-full h-full" controls playsInline muted />
    </div>
  );
}

function MatchCard({ match, status }: { match: Match; status: "live" | "upcoming" | "finished" }) {
  const [expanded, setExpanded] = useState(false);
  const slug = match.slug || null;
  const { data: linkData, isLoading: linkLoading } = useMatchLink(expanded ? slug : null);

  const streamUrl =
    linkData?.servers?.find((s: any) => s.type === "direct" && s.url?.includes(".m3u8"))?.url ||
    linkData?.servers?.[0]?.url ||
    null;

  const matchTime = match.match_time
    ? new Date(Number(match.match_time) * 1000)
    : null;

  const statusColors = {
    live: "border-primary/40 bg-primary/5",
    upcoming: "border-yellow-500/30 bg-yellow-500/5",
    finished: "border-muted-foreground/20 bg-muted/30",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${statusColors[status]} overflow-hidden`}
    >
      <button
        onClick={() => status === "live" && setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left ${
          status === "live" ? "cursor-pointer hover:bg-primary/10 transition-colors" : "cursor-default"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-sm font-bold text-foreground truncate">
              {match.home_team_name} vs {match.away_team_name}
            </p>
            {match.league_name && (
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                {match.league_name}
              </span>
            )}
          </div>
          {status === "live" && match.homeTeamScore !== undefined && (
            <p className="font-mono text-xs text-primary mt-1">
              Score: {match.homeTeamScore} - {match.awayTeamScore}
            </p>
          )}
          {status === "upcoming" && matchTime && (
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {matchTime.toLocaleDateString()} at {matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {status === "finished" && (
            <p className="font-mono text-xs text-muted-foreground mt-1">
              FT: {match.homeTeamScore ?? 0} - {match.awayTeamScore ?? 0}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {status === "live" && <LiveIndicator isLive />}
          {status === "upcoming" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase text-yellow-500">SOON</span>
            </span>
          )}
          {status === "finished" && (
            <span className="font-mono text-[10px] text-muted-foreground uppercase">FT</span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && status === "live" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-4">
              {linkLoading && (
                <div className="w-full aspect-video bg-secondary flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="font-mono text-xs text-muted-foreground">Loading stream...</p>
                  </div>
                </div>
              )}
              {!linkLoading && streamUrl && (
                <MatchHlsPlayer streamUrl={streamUrl} servers={linkData?.servers} />
              )}
              {!linkLoading && !streamUrl && (
                <div className="w-full aspect-video bg-secondary flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <p className="font-mono text-sm text-muted-foreground">No stream available</p>
                    <p className="font-mono text-xs text-muted-foreground/60 mt-1">
                      Stream links may not be available yet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Matches = () => {
  const { data, isLoading, error } = useAllMatches();
  const [tab, setTab] = useState<"live" | "upcoming" | "finished">("live");

  const tabs = [
    { key: "live" as const, label: "Live", count: data?.live?.length || 0 },
    { key: "upcoming" as const, label: "Upcoming", count: data?.upcoming?.length || 0 },
    { key: "finished" as const, label: "Finished", count: data?.finished?.length || 0 },
  ];

  // Auto-select tab with content
  useEffect(() => {
    if (data) {
      if (data.live.length > 0) setTab("live");
      else if (data.upcoming.length > 0) setTab("upcoming");
      else if (data.finished.length > 0) setTab("finished");
    }
  }, [data]);

  const currentMatches = data?.[tab] || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl md:text-4xl font-black uppercase tracking-wider text-foreground">
          All Matches
        </h1>
        <p className="font-mono text-sm text-muted-foreground mt-1">
          Live football matches from around the world — click any live match to watch
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold px-1">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-sm text-muted-foreground">Fetching matches...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-mono text-sm text-destructive">Failed to load matches</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {currentMatches.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                No {tab} matches right now
              </p>
            </div>
          )}
          {currentMatches.map((match: Match, i: number) => (
            <MatchCard key={match.slug || `${match.home_team_name}-${i}`} match={match} status={tab} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
