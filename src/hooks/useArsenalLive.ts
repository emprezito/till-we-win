import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StreamServer {
  name: string;
  url: string;
  type: string;
  header?: Record<string, string>;
}

export interface ArsenalLiveData {
  live: boolean;
  upcoming?: boolean;
  finished?: boolean;
  homeTeam?: string;
  awayTeam?: string;
  streamUrl?: string;
  startTime?: string | null;
  league?: string;
  status?: string;
  opponent?: string;
  source?: string;
  error?: string;
  score?: string;
  servers?: StreamServer[];
}

/**
 * Reads cached match data from site_config instead of calling
 * the edge function directly. This costs ZERO API requests.
 * The edge function is only called by the backend cron job.
 */
export function useArsenalLive() {
  return useQuery<ArsenalLiveData>({
    queryKey: ["arsenal-live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_config")
        .select(
          "is_live, match_status, match_home_team, match_away_team, match_score, match_league, match_start_time, cached_servers, opponent, livestream_url"
        )
        .single();

      if (error) throw error;
      if (!data) return { live: false, source: "no_config" };

      const status = (data as any).match_status || "none";
      const servers = ((data as any).cached_servers || []) as StreamServer[];

      return {
        live: data.is_live,
        upcoming: status === "upcoming",
        finished: status === "finished",
        homeTeam: (data as any).match_home_team || undefined,
        awayTeam: (data as any).match_away_team || undefined,
        score: (data as any).match_score || undefined,
        league: (data as any).match_league || undefined,
        startTime: (data as any).match_start_time || null,
        streamUrl: data.livestream_url || undefined,
        opponent: data.opponent || undefined,
        servers,
        source: "cached",
      };
    },
    refetchInterval: 15000, // Read DB every 15s (free, no API cost)
    staleTime: 10000,
  });
}
