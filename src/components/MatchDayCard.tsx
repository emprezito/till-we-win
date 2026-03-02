import { motion } from "framer-motion";
import { Share2, Trophy, Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { SiteConfig } from "@/hooks/useSiteConfig";
import { usePumpFunData, formatMarketCap, formatPrice } from "@/hooks/usePumpFunData";
import { format } from "date-fns";

interface MatchDayCardProps {
  config: SiteConfig;
}

export function MatchDayCard({ config }: MatchDayCardProps) {
  const { data: tokenData } = usePumpFunData(config.contract_address || null);

  const livePrice = tokenData?.price;
  const liveMcap = tokenData?.market_cap;
  const priceChange24h = tokenData?.price_change_24h;
  const liveSymbol = tokenData?.symbol || config.ticker;

  const matchDate = config.match_start_time
    ? format(new Date(config.match_start_time), "MMM d, yyyy • h:mm a")
    : config.next_match_date
      ? format(new Date(config.next_match_date), "MMM d, yyyy")
      : null;

  const isMatchLive = config.match_status === "live" || config.match_status === "LIVE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5 sm:px-6">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Match Day Card
        </h3>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${config.match_home_team} vs ${config.match_away_team} | ${liveSymbol}`,
                text: `${config.match_home_team} ${config.match_score} ${config.match_away_team}\n${liveSymbol} Price: ${livePrice != null ? formatPrice(livePrice) : "—"}\nMcap: ${liveMcap != null ? formatMarketCap(liveMcap) : "—"}\n\nTIL WE WIN 🔴`,
                url: window.location.href,
              }).catch(() => {});
            }
          }}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      {/* Card body — designed to be screenshot-friendly */}
      <div id="match-day-card" className="space-y-4 p-4 sm:p-6">
        {/* Match Info */}
        <div className="text-center">
          {matchDate && (
            <p className="mb-2 font-mono text-xs text-muted-foreground">{matchDate}</p>
          )}
          {config.match_league && (
            <span className="inline-block rounded-full bg-secondary px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {config.match_league}
            </span>
          )}
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <div className="flex-1 text-right">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground sm:text-lg">
              {config.match_home_team || "Home"}
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            {isMatchLive && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                <span className="font-mono text-[10px] font-bold uppercase text-destructive">Live</span>
              </span>
            )}
            <div className="flex items-center gap-1 rounded-xl bg-secondary px-4 py-2 sm:px-6 sm:py-3">
              <span className="font-display text-2xl font-black text-foreground sm:text-4xl">
                {config.match_score || "— : —"}
              </span>
            </div>
          </div>

          <div className="flex-1 text-left">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground sm:text-lg">
              {config.match_away_team || "Away"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {liveSymbol}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-lg bg-secondary/60 p-2.5 text-center sm:p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Price</p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground sm:text-base">
              {livePrice != null ? formatPrice(livePrice) : "—"}
            </p>
            {priceChange24h != null && (
              <p className={`mt-0.5 flex items-center justify-center gap-0.5 font-mono text-[10px] font-semibold ${priceChange24h >= 0 ? "text-green-500" : "text-destructive"}`}>
                {priceChange24h >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-secondary/60 p-2.5 text-center sm:p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mcap</p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground sm:text-base">
              {liveMcap != null ? formatMarketCap(liveMcap) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2.5 text-center sm:p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Holders</p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground sm:text-base">
              {config.holder_count || "—"}
            </p>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary text-glow-red">
            Til We Win
          </span>
        </div>
      </div>
    </motion.div>
  );
}
