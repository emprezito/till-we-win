import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Trophy } from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

interface Fixture {
  date: string;
  opponent: string;
  league: string;
  home: string;
  away: string;
  status: string;
}

function calculateTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function MiniCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <span className="font-mono text-xs text-primary font-bold">LIVE / STARTED</span>
    );
  }

  const parts: string[] = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  parts.push(`${String(timeLeft.hours).padStart(2, "0")}h`);
  parts.push(`${String(timeLeft.minutes).padStart(2, "0")}m`);
  parts.push(`${String(timeLeft.seconds).padStart(2, "0")}s`);

  return (
    <span className="font-mono text-sm font-bold text-primary tabular-nums">
      {parts.join(" ")}
    </span>
  );
}

function getLeagueColor(league: string): string {
  const l = league.toLowerCase();
  if (l.includes("premier")) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (l.includes("champion")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (l.includes("fa cup")) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (l.includes("league cup") || l.includes("carabao")) return "bg-green-500/20 text-green-300 border-green-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function UpcomingFixtures() {
  const { data: config } = useSiteConfig();

  const fixtures = ((config as any)?.upcoming_fixtures || []) as Fixture[];

  if (fixtures.length === 0) {
    return null;
  }

  const upcomingFixtures = fixtures.filter(f => f.status === "upcoming");
  const finishedFixtures = fixtures.filter(f => f.status === "finished");

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="border-b border-border bg-secondary/50 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            7-Day Arsenal Fixtures
          </h2>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}
          </span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Upcoming matches */}
        {upcomingFixtures.map((fixture, i) => {
          const matchDate = new Date(fixture.date);
          const dayStr = matchDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const timeStr = matchDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <motion.div
              key={`upcoming-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 hover:bg-secondary/30 transition-colors"
            >
              {/* Date/Time */}
              <div className="flex flex-col items-center min-w-[60px] sm:min-w-[70px]">
                <span className="font-mono text-xs text-muted-foreground">{dayStr}</span>
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeStr}
                </span>
              </div>

              {/* Match info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-sm font-bold text-foreground truncate">
                    {fixture.home}
                  </span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="font-display text-sm font-bold text-foreground truncate">
                    {fixture.away}
                  </span>
                </div>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${getLeagueColor(fixture.league)}`}>
                  <Trophy className="h-2.5 w-2.5" />
                  {fixture.league}
                </span>
              </div>

              {/* Countdown */}
              <div className="text-right shrink-0">
                <MiniCountdown targetDate={fixture.date} />
              </div>
            </motion.div>
          );
        })}

        {/* Finished matches */}
        {finishedFixtures.map((fixture, i) => {
          const matchDate = new Date(fixture.date);
          const dayStr = matchDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

          return (
            <motion.div
              key={`finished-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (upcomingFixtures.length + i) * 0.1 }}
              className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 opacity-60"
            >
              <div className="flex flex-col items-center min-w-[60px] sm:min-w-[70px]">
                <span className="font-mono text-xs text-muted-foreground">{dayStr}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-sm text-foreground truncate">
                    {fixture.home}
                  </span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="font-display text-sm text-foreground truncate">
                    {fixture.away}
                  </span>
                </div>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${getLeagueColor(fixture.league)}`}>
                  <Trophy className="h-2.5 w-2.5" />
                  {fixture.league}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">FT</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
