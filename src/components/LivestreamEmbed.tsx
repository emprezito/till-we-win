import { motion } from "framer-motion";
import { LiveIndicator } from "./LiveIndicator";

interface LivestreamEmbedProps {
  url: string;
  isLive: boolean;
  compact?: boolean;
}

function toEmbedUrl(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // Already an embed URL
  if (trimmed.includes("youtube.com/embed/")) return trimmed;
  // youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
  if (liveMatch) return `https://www.youtube.com/embed/${liveMatch[1]}?autoplay=1`;
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1`;
  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1`;
  return trimmed;
}

export function LivestreamEmbed({ url, isLive, compact }: LivestreamEmbedProps) {
  const embedUrl = toEmbedUrl(url);
  const hasUrl = embedUrl.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Mission Feed
        </h3>
        <LiveIndicator isLive={isLive} />
      </div>
      <div className={`relative ${compact ? "aspect-video" : "aspect-video"}`}>
        {hasUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Livestream"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-mono text-sm text-muted-foreground">STREAM STANDBY</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
