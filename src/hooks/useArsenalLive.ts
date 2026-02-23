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

export function useArsenalLive() {
  return useQuery<ArsenalLiveData>({
    queryKey: ["arsenal-live"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("arsenal-live");
      if (error) throw error;
      return data as ArsenalLiveData;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
