import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Share2, Trophy, Download, TrendingUp, TrendingDown, Swords } from "lucide-react";
import { toPng } from "html-to-image";
import type { SiteConfig } from "@/hooks/useSiteConfig";
import { usePumpFunData, formatMarketCap, formatPrice } from "@/hooks/usePumpFunData";
import { format } from "date-fns";

interface MatchDayCardProps {
  config: SiteConfig;
}

export function MatchDayCard({ config }: MatchDayCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
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
  const isUpcoming = config.match_status === "upcoming";
  const isFinished = config.match_status === "finished";

  const statusLabel = isMatchLive ? "LIVE NOW" : isUpcoming ? "UPCOMING" : isFinished ? "FULL TIME" : "MATCH DAY";

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: "#0a0a0a",
      });
      const link = document.createElement("a");
      link.download = `tww-matchday-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download card:", err);
    }
  }, []);

  const shareCard = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: "#0a0a0a",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "tww-matchday.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${config.match_home_team} vs ${config.match_away_team} | ${liveSymbol}`,
          text: `${config.match_home_team} ${config.match_score} ${config.match_away_team}\n${liveSymbol} Price: ${livePrice != null ? formatPrice(livePrice) : "—"}\nMcap: ${liveMcap != null ? formatMarketCap(liveMcap) : "—"}\n\nTIL WE WIN 🔴`,
          url: "https://till-we-win.lovable.app",
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${config.match_home_team} vs ${config.match_away_team} | ${liveSymbol}`,
          text: `${config.match_home_team} ${config.match_score} ${config.match_away_team}\n${liveSymbol} Price: ${livePrice != null ? formatPrice(livePrice) : "—"}\nMcap: ${liveMcap != null ? formatMarketCap(liveMcap) : "—"}\n\nTIL WE WIN 🔴`,
          url: "https://till-we-win.lovable.app",
        });
      }
    } catch (err) {
      console.error("Failed to share card:", err);
    }
  }, [config, livePrice, liveMcap, liveSymbol]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Action buttons — outside the captured card */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5 sm:px-6">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Match Day Card
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCard}
            className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Download className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            onClick={shareCard}
            className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* ====== BRANDED CARD — this is what gets exported ====== */}
      <div
        ref={cardRef}
        id="match-day-card"
        style={{ background: "linear-gradient(170deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)" }}
        className="relative space-y-5 p-5 sm:p-8"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                {config.token_name || "TIL WE WIN"}
              </p>
              <p style={{ color: "#888888", fontSize: "10px", fontFamily: "monospace" }}>
                till-we-win.lovable.app
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isMatchLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: isMatchLive ? "#ef4444" : "#888888",
                fontFamily: "monospace",
                textTransform: "uppercase" as const,
              }}
            >
              {isMatchLive && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              )}
              {statusLabel}
            </span>
          </div>
        </div>

        {/* League & Date */}
        <div style={{ textAlign: "center" }}>
          {config.match_league && (
            <p style={{ color: "#888888", fontSize: "11px", fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "0.2em", marginBottom: "4px" }}>
              {config.match_league}
            </p>
          )}
          {matchDate && (
            <p style={{ color: "#666666", fontSize: "11px", fontFamily: "monospace" }}>{matchDate}</p>
          )}
        </div>

        {/* Scoreboard */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <div style={{ flex: 1, textAlign: "right" }}>
            <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              {config.match_home_team || "Home"}
            </p>
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "16px",
              padding: "12px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: 900, fontFamily: "monospace" }}>
                {config.match_score || "— : —"}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              {config.match_away_team || "Away"}
            </p>
          </div>
        </div>

        {/* Divider with ticker */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#ef4444", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", fontFamily: "monospace", textTransform: "uppercase" as const }}>
            {liveSymbol}
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Token Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#666666", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Price</p>
            <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>
              {livePrice != null ? formatPrice(livePrice) : "—"}
            </p>
            {priceChange24h != null && (
              <p style={{
                color: priceChange24h >= 0 ? "#22c55e" : "#ef4444",
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: "monospace",
                marginTop: "2px",
              }}>
                {priceChange24h >= 0 ? "▲" : "▼"} {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(1)}%
              </p>
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#666666", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Mcap</p>
            <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>
              {liveMcap != null ? formatMarketCap(liveMcap) : "—"}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#666666", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Holders</p>
            <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>
              {config.holder_count || "—"}
            </p>
          </div>
        </div>

        {/* Brand Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <p style={{ color: "#444444", fontSize: "9px", fontFamily: "monospace" }}>
            till-we-win.lovable.app
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Swords style={{ width: 12, height: 12, color: "#ef4444" }} />
            <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>
              TIL WE WIN
            </span>
          </div>
          <p style={{ color: "#444444", fontSize: "9px", fontFamily: "monospace" }}>
            {liveSymbol}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
