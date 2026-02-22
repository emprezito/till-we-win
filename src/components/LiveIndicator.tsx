import { motion } from "framer-motion";

interface LiveIndicatorProps {
  isLive: boolean;
}

export function LiveIndicator({ isLive }: LiveIndicatorProps) {
  if (isLive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-sm font-bold uppercase tracking-widest text-primary">
          LIVE
        </span>
      </motion.div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5">
      <span className="h-3 w-3 rounded-full bg-muted-foreground/50" />
      <span className="font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
        OFFLINE
      </span>
    </div>
  );
}
