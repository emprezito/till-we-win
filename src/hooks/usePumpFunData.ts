import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TokenData {
  name: string | null;
  symbol: string | null;
  price: number | null;
  market_cap: number | null;
  volume_24h: number | null;
  price_change_24h: number | null;
  price_change_1h: number | null;
  liquidity_usd: number | null;
  pair_address: string | null;
  dex: string | null;
  chain: string | null;
  url: string | null;
  image_url: string | null;
  txns_24h_buys: number | null;
  txns_24h_sells: number | null;
}

export function usePumpFunData(mint: string | null | undefined) {
  return useQuery<TokenData>({
    queryKey: ["token-data", mint],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pump-fun-proxy", {
        body: { mint },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as TokenData;
    },
    enabled: !!mint,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 2,
  });
}

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
