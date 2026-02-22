import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArsenalLiveData {
  live: boolean;
  homeTeam?: string;
  awayTeam?: string;
  streamUrl?: string;
  league?: string;
  status?: string;
  source?: string;
  error?: string;
}

export function useArsenalLive() {
  return useQuery<ArsenalLiveData>({
    queryKey: ["arsenal-live"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("arsenal-live");
      if (error) throw error;
      return data as ArsenalLiveData;
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000,
  });
}
