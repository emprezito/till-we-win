import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, TrendingUp, RefreshCw } from "lucide-react";
import type { SiteConfig } from "@/hooks/useSiteConfig";
import { usePumpFunData, formatMarketCap, formatPrice } from "@/hooks/usePumpFunData";

interface TokenInfoCardProps {
  config: SiteConfig;
}

export function TokenInfoCard({ config }: TokenInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const { data: pumpData, isLoading: pumpLoading, dataUpdatedAt } = usePumpFunData(
    config.contract_address || null
  );

  const copyAddress = () => {
    if (!config.contract_address) return;
    navigator.clipboard.writeText(config.contract_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const liveMcap = pumpData?.market_cap;
  const livePrice = pumpData?.price;
  const liveVolume = pumpData?.volume_24h;
  const liveName = pumpData?.name || config.token_name;
  const liveSymbol = pumpData?.symbol || config.ticker;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Token Intel
        </h3>
        {pumpData && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={`h-3 w-3 ${pumpLoading ? "animate-spin" : ""}`} />
            <span>Live</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Name</span>
          <span className="font-mono font-semibold text-foreground">{liveName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Ticker</span>
          <span className="font-mono font-bold text-primary">{liveSymbol}</span>
        </div>

        {/* Live price from Pump.fun */}
        {livePrice != null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-mono font-semibold text-foreground">
              {formatPrice(livePrice)}
            </span>
          </div>
        )}

        {/* Live market cap */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Market Cap</span>
          <span className="flex items-center gap-1 font-mono font-semibold text-foreground">
            {liveMcap != null ? (
              <>
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                {formatMarketCap(liveMcap)}
              </>
            ) : (
              config.market_cap || "—"
            )}
          </span>
        </div>

        {/* Live volume */}
        {liveVolume != null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">24h Volume</span>
            <span className="font-mono font-semibold text-foreground">
              {formatMarketCap(liveVolume)}
            </span>
          </div>
        )}

        {/* Holders - fallback to config */}
        {config.holder_count && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Holders</span>
            <span className="font-mono font-semibold text-foreground">{config.holder_count}</span>
          </div>
        )}

        {config.contract_address && (
          <div>
            <span className="text-sm text-muted-foreground">Contract</span>
            <button
              onClick={copyAddress}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <span className="flex-1 truncate text-left">
                {config.contract_address}
              </span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
            </button>
          </div>
        )}

        {config.pumpfun_link && (
          <a
            href={config.pumpfun_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 glow-red"
          >
            Buy on Pump.fun
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
