const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mint } = await req.json();
    if (!mint) {
      return new Response(
        JSON.stringify({ error: "token address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try DexScreener search API (works for any chain)
    const searchRes = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`
    );

    if (!searchRes.ok) {
      const text = await searchRes.text();
      throw new Error(`DexScreener API error ${searchRes.status}: ${text}`);
    }

    const searchData = await searchRes.json();
    const pairs = searchData.pairs;

    if (!pairs || pairs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Token not found on DexScreener" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the pair with highest liquidity
    const bestPair = pairs.reduce((best: any, pair: any) => {
      const liq = pair.liquidity?.usd ?? 0;
      const bestLiq = best.liquidity?.usd ?? 0;
      return liq > bestLiq ? pair : best;
    }, pairs[0]);

    const result = {
      name: bestPair.baseToken?.name ?? null,
      symbol: bestPair.baseToken?.symbol ?? null,
      price: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : null,
      market_cap: bestPair.marketCap ?? bestPair.fdv ?? null,
      volume_24h: bestPair.volume?.h24 ?? null,
      price_change_24h: bestPair.priceChange?.h24 ?? null,
      price_change_1h: bestPair.priceChange?.h1 ?? null,
      liquidity_usd: bestPair.liquidity?.usd ?? null,
      pair_address: bestPair.pairAddress ?? null,
      dex: bestPair.dexId ?? null,
      chain: bestPair.chainId ?? null,
      url: bestPair.url ?? null,
      image_url: bestPair.info?.imageUrl ?? null,
      txns_24h_buys: bestPair.txns?.h24?.buys ?? null,
      txns_24h_sells: bestPair.txns?.h24?.sells ?? null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
