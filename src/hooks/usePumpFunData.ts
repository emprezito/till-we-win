import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PumpFunData {
  name: string | null;
  symbol: string | null;
  market_cap: number | null;
  price: number | null;
  volume_24h: number | null;
  image_uri: string | null;
  description: string | null;
  total_supply: number | null;
  virtual_sol_reserves: number | null;
  virtual_token_reserves: number | null;
  complete: boolean | null;
  raydium_pool: string | null;
  king_of_the_hill_timestamp: number | null;
  created_timestamp: number | null;
  raw: Record<string, unknown>;
}

export function usePumpFunData(mint: string | null | undefined) {
  return useQuery<PumpFunData>({
    queryKey: ["pump-fun", mint],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pump-fun-proxy", {
        body: { mint },
      });
      if (error) throw error;
      return data as PumpFunData;
    },
    enabled: !!mint,
    refetchInterval: 15_000, // 15 seconds
    staleTime: 10_000,
  });
}

/** Format large numbers into readable strings */
export function formatMarketCap(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPrice(value: number | null | undefined): string {
  if (!value) return "—";
  if (value < 0.000001) return `$${value.toExponential(2)}`;
  if (value < 0.01) return `$${value.toFixed(8)}`;
  if (value < 1) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}
