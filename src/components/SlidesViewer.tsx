import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useSlides } from "@/hooks/useSlides";

export function SlidesViewer() {
  const { data: slides } = useSlides();
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const total = slides?.length ?? 0;

  const next = useCallback(() => {
    if (total === 0) return;
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!autoPlay || total === 0) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [autoPlay, next, total]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "f" || e.key === "F") setFullscreen((f) => !f);
    };
    if (fullscreen) {
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [fullscreen, next, prev]);

  if (!slides || slides.length === 0) return null;
  const slide = slides[current];

  const SlideContent = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background p-8 sm:p-16">
      {/* Decorative corners */}
      <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-primary/40" />
      <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-primary/40" />
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary/40" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary/40" />

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-primary">
            BRIEFING {current + 1}/{total}
          </p>
          <h2 className="mb-6 font-display text-2xl font-bold text-foreground sm:text-4xl text-glow-red">
            {slide.title}
          </h2>
          <p className="mx-auto max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground sm:text-base">
            {slide.content}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-8 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <button
          onClick={() => setFullscreen(false)}
          className="absolute right-4 top-4 z-50 rounded-lg border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <button onClick={prev} className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-lg border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={next} className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-lg border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-6 w-6" />
        </button>
        <SlideContent />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Mission Briefing
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoPlay(!autoPlay)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
            {autoPlay ? "PAUSE" : "PLAY"}
          </button>
          <button onClick={() => setFullscreen(true)} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative aspect-video">
        <button onClick={prev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-secondary/80 p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-secondary/80 p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
        <SlideContent />
      </div>
    </div>
  );
}
