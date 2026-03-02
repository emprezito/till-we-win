import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { LiveIndicator } from "@/components/LiveIndicator";
import { CountdownTimer } from "@/components/CountdownTimer";
import { TokenInfoCard } from "@/components/TokenInfoCard";
import { PrimaryLivestream } from "@/components/PrimaryLivestream";
import { MissionProgress } from "@/components/MissionProgress";
import { SlidesViewer } from "@/components/SlidesViewer";
import { SocialLinks } from "@/components/SocialLinks";
import { MatchDayCard } from "@/components/MatchDayCard";

const Index = () => {
  const { data: config, isLoading } = useSiteConfig();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Initializing Mission Control...
          </p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-10">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-12 text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative z-10">
          <LiveIndicator isLive={config.is_live} />
          <h1 className="mt-6 font-display text-3xl font-black tracking-wider text-foreground sm:text-7xl text-glow-red">
            TIL WE WIN
          </h1>
          <p className="mt-4 font-mono text-sm text-muted-foreground sm:text-base">
            Livestreaming every Arsenal match until Arsenal wins the EPL
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <span className="font-mono text-lg font-bold text-primary">
              {config.ticker}
            </span>
            {config.pumpfun_link && (
              <a
                href={config.pumpfun_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 glow-red"
              >
                Buy on Pump.fun
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </motion.section>

      {/* Primary Livestream - Main Focus */}
      <PrimaryLivestream />

      {/* Countdown + Token Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <CountdownTimer
            targetDate={config.next_match_date}
            opponent={config.opponent}
          />
        </div>
        <TokenInfoCard config={config} />
      </div>

      {/* Match Day Card - Shareable */}
      <MatchDayCard config={config} />

      {/* Mission Progress */}
      <MissionProgress config={config} />

      {/* Slides */}
      <SlidesViewer />

      {/* Social Links */}
      <SocialLinks config={config} />
    </div>
  );
};

export default Index;
