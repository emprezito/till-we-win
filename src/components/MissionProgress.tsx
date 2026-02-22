import { motion } from "framer-motion";
import { Radio, Tv, CalendarDays, Trophy } from "lucide-react";
import type { SiteConfig } from "@/hooks/useSiteConfig";

interface MissionProgressProps {
  config: SiteConfig;
}

function StatCard({ icon: Icon, label, value, delay }: { icon: React.ElementType; label: string; value: string | number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-xl border border-border bg-card p-4 text-center"
    >
      <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export function MissionProgress({ config }: MissionProgressProps) {
  return (
    <div>
      <h3 className="mb-4 font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Mission Progress
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Radio} label="Streams" value={config.streams_completed} delay={0.3} />
        <StatCard icon={Tv} label="Matches" value={config.matches_streamed} delay={0.35} />
        <StatCard icon={CalendarDays} label="Started" value={config.mission_start_date} delay={0.4} />
        <StatCard icon={Trophy} label="EPL Status" value={config.epl_status} delay={0.45} />
      </div>
    </div>
  );
}
