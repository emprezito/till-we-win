import { motion } from "framer-motion";
import { useArsenalLive } from "@/hooks/useArsenalLive";
import { LiveIndicator } from "@/components/LiveIndicator";
import { LiveChat } from "@/components/LiveChat";

function MatchBanner() {
  const { data: arsenalData } = useArsenalLive();

  if (!arsenalData) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {arsenalData.live && <LiveIndicator isLive />}
            <h2 className="font-display text-lg font-bold text-foreground">
              {arsenalData.homeTeam && arsenalData.awayTeam
                ? `${arsenalData.homeTeam} vs ${arsenalData.awayTeam}`
                : arsenalData.opponent
                  ? `Arsenal vs ${arsenalData.opponent}`
                  : "No match right now"}
            </h2>
          </div>
          {arsenalData.league && (
            <p className="font-mono text-xs text-muted-foreground mt-1">{arsenalData.league}</p>
          )}
          {arsenalData.score && (
            <p className="font-mono text-sm text-primary font-bold mt-1">{arsenalData.score}</p>
          )}
        </div>
        {arsenalData.status && (
          <span className="font-mono text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {arsenalData.status}
          </span>
        )}
      </div>
    </div>
  );
}

const Community = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl md:text-4xl font-black uppercase tracking-wider text-foreground">
          Community
        </h1>
        <p className="font-mono text-sm text-muted-foreground mt-1">
          Chat with fellow Gooners during live matches 🔴⚪
        </p>
      </motion.div>

      <MatchBanner />
      <LiveChat />
    </div>
  );
};

export default Community;
