import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  targetDate: string | null;
  opponent: string;
}

function calculateTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary font-mono text-xl font-bold text-foreground sm:h-20 sm:w-20 sm:text-3xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1.5 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer({ targetDate, opponent }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(
    targetDate ? calculateTimeLeft(targetDate) : null
  );

  useEffect(() => {
    if (!targetDate) return;
    setTimeLeft(calculateTimeLeft(targetDate));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate || !timeLeft) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          NEXT MATCH DATA UNAVAILABLE
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-8"
    >
      <div className="mb-4 text-center">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Next Mission
        </h3>
        {opponent && (
          <p className="mt-1 font-display text-lg font-bold text-foreground">
            vs {opponent}
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5 sm:gap-4">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="mt-[-1rem] font-mono text-lg sm:text-2xl text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.hours} label="Hrs" />
        <span className="mt-[-1rem] font-mono text-lg sm:text-2xl text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <span className="mt-[-1rem] font-mono text-lg sm:text-2xl text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" />
      </div>
    </motion.div>
  );
}
