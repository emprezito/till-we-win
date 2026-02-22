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
        JSON.stringify({ error: "mint address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pump.fun API error ${res.status}: ${text}`);
    }

    const data = await res.json();

    // Extract relevant fields
    const result = {
      name: data.name ?? null,
      symbol: data.symbol ?? null,
      market_cap: data.market_cap ?? data.usd_market_cap ?? null,
      price: data.price ?? null,
      volume_24h: data.volume_24h ?? null,
      image_uri: data.image_uri ?? null,
      description: data.description ?? null,
      total_supply: data.total_supply ?? null,
      virtual_sol_reserves: data.virtual_sol_reserves ?? null,
      virtual_token_reserves: data.virtual_token_reserves ?? null,
      complete: data.complete ?? null,
      raydium_pool: data.raydium_pool ?? null,
      king_of_the_hill_timestamp: data.king_of_the_hill_timestamp ?? null,
      created_timestamp: data.created_timestamp ?? null,
      // Raw data for debugging
      raw: data,
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
