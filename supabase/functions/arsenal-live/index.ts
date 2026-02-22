import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Check for manual override in site_config
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("site_config")
      .select("enable_auto_stream, manual_override_stream_url, is_live")
      .limit(1)
      .single();

    // If manual override URL is set, use it
    if (config?.manual_override_stream_url) {
      return new Response(
        JSON.stringify({
          live: true,
          homeTeam: "Arsenal",
          awayTeam: "Opponent",
          streamUrl: config.manual_override_stream_url,
          league: "Manual Override",
          status: "LIVE",
          source: "manual",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If auto stream is disabled, return not live
    if (!config?.enable_auto_stream) {
      return new Response(
        JSON.stringify({ live: false, source: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from RapidAPI
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      return new Response(
        JSON.stringify({ live: false, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://${rapidApiHost}/matches/live`,
      {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("RapidAPI error:", response.status, text);
      return new Response(
        JSON.stringify({ live: false, error: "Stream API unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matches = await response.json();

    // Find Arsenal match
    const arsenalMatch = Array.isArray(matches)
      ? matches.find(
          (m: any) =>
            m.home_team?.toLowerCase().includes("arsenal") ||
            m.away_team?.toLowerCase().includes("arsenal") ||
            m.homeTeam?.toLowerCase().includes("arsenal") ||
            m.awayTeam?.toLowerCase().includes("arsenal")
        )
      : null;

    if (!arsenalMatch) {
      // Update is_live to false if currently live
      if (config?.is_live) {
        await supabase
          .from("site_config")
          .update({ is_live: false })
          .eq("id", config.id || (await supabase.from("site_config").select("id").limit(1).single()).data?.id);
      }
      return new Response(
        JSON.stringify({ live: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Arsenal match found - auto-set live status
    const { data: cfgForUpdate } = await supabase
      .from("site_config")
      .select("id")
      .limit(1)
      .single();

    if (cfgForUpdate) {
      await supabase
        .from("site_config")
        .update({ is_live: true })
        .eq("id", cfgForUpdate.id);
    }

    return new Response(
      JSON.stringify({
        live: true,
        homeTeam: arsenalMatch.home_team || arsenalMatch.homeTeam || "Home",
        awayTeam: arsenalMatch.away_team || arsenalMatch.awayTeam || "Away",
        streamUrl: arsenalMatch.stream_url || arsenalMatch.streamUrl || arsenalMatch.url || "",
        league: arsenalMatch.league || arsenalMatch.competition || "Premier League",
        status: arsenalMatch.status || "LIVE",
        source: "rapidapi",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("arsenal-live error:", err);
    return new Response(
      JSON.stringify({ live: false, error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
