import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchServer {
  name: string;
  url: string;
  type: string;
  header?: Record<string, string>;
}

export interface Match {
  id?: string;
  slug?: string;
  home_team_name: string;
  away_team_name: string;
  league_name?: string;
  match_time?: string;
  homeTeamScore?: string | number;
  awayTeamScore?: string | number;
  status?: string;
  servers?: MatchServer[];
}

export interface AllMatchesData {
  live: Match[];
  upcoming: Match[];
  finished: Match[];
}

export function useAllMatches() {
  return useQuery<AllMatchesData>({
    queryKey: ["all-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("all-matches", {
        body: { action: "list", status: "all" },
      });
      if (error) throw error;
      return data as AllMatchesData;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useMatchLink(slug: string | null) {
  return useQuery({
    queryKey: ["match-link", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.functions.invoke("all-matches", {
        body: { action: "link", slug },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 60000,
  });
}
