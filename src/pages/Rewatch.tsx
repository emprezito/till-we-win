import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Clock, Trophy, Film } from "lucide-react";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";

interface Recording {
  id: string;
  match_title: string;
  home_team: string;
  away_team: string;
  score: string;
  league: string;
  match_date: string | null;
  recording_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_mb: number | null;
  expires_at: string;
  created_at: string;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const Rewatch = () => {
  const [activeVideo, setActiveVideo] = useState<Recording | null>(null);

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["match_recordings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_recordings")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("match_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Recording[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Film className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-black tracking-wider text-foreground">
          MATCH REWATCH
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Missed a match? Watch full replays here. Recordings are available for 7–10 days after each game.
      </p>

      {/* Active Video Player */}
      {activeVideo && (
        <div className="space-y-3">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
            <video
              src={activeVideo.recording_url}
              controls
              autoPlay
              className="h-full w-full"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                {activeVideo.match_title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {activeVideo.league}
                {activeVideo.score && ` · ${activeVideo.score}`}
                {activeVideo.match_date &&
                  ` · ${format(new Date(activeVideo.match_date), "MMM d, yyyy")}`}
              </p>
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Recordings Grid */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !recordings?.length ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-mono text-sm text-muted-foreground">
            No recordings available yet. Replays will appear here after the next live match.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((rec) => (
            <button
              key={rec.id}
              onClick={() => setActiveVideo(rec)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Thumbnail / Placeholder */}
              <div className="aspect-video bg-muted/30 flex items-center justify-center relative">
                {rec.thumbnail_url ? (
                  <img
                    src={rec.thumbnail_url}
                    alt={rec.match_title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                    <Play className="h-10 w-10" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
                {/* Duration badge */}
                {rec.duration_seconds && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
                    {formatDuration(rec.duration_seconds)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <h3 className="font-display text-sm font-bold text-foreground line-clamp-1">
                  {rec.match_title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {rec.league && <span>{rec.league}</span>}
                  {rec.score && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-primary">{rec.score}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span>
                    Expires{" "}
                    {formatDistanceToNow(new Date(rec.expires_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rewatch;
