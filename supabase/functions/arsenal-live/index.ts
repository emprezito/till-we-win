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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("site_config")
      .select("enable_auto_stream, manual_override_stream_url, is_live, next_match_date, opponent")
      .limit(1)
      .single();

    // Manual override
    if (config?.manual_override_stream_url) {
      return new Response(
        JSON.stringify({
          live: true,
          upcoming: false,
          homeTeam: "Arsenal",
          awayTeam: config.opponent || "Opponent",
          streamUrl: config.manual_override_stream_url,
          startTime: null,
          league: "Manual Override",
          status: "LIVE",
          source: "manual",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto stream disabled
    if (!config?.enable_auto_stream) {
      const hasUpcoming = config?.next_match_date && new Date(config.next_match_date).getTime() > Date.now();
      return new Response(
        JSON.stringify({
          live: false,
          upcoming: !!hasUpcoming,
          startTime: hasUpcoming ? config.next_match_date : null,
          opponent: config?.opponent || "",
          source: "disabled",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      const hasUpcoming = config?.next_match_date && new Date(config.next_match_date).getTime() > Date.now();
      return new Response(
        JSON.stringify({
          live: false,
          upcoming: !!hasUpcoming,
          startTime: hasUpcoming ? config.next_match_date : null,
          opponent: config?.opponent || "",
          error: "API key not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live matches from the Football Live Stream API
    const response = await fetch(
      `https://${rapidApiHost}/matches`,
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
      const hasUpcoming = config?.next_match_date && new Date(config.next_match_date).getTime() > Date.now();
      return new Response(
        JSON.stringify({
          live: false,
          upcoming: !!hasUpcoming,
          startTime: hasUpcoming ? config.next_match_date : null,
          opponent: config?.opponent || "",
          error: "Stream API unavailable",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const matches = data?.matches || [];

    // Find Arsenal match
    const arsenalMatch = matches.find(
      (m: any) =>
        m.home_team_name?.toLowerCase().includes("arsenal") ||
        m.away_team_name?.toLowerCase().includes("arsenal")
    );

    if (!arsenalMatch) {
      // No live Arsenal match
      if (config?.is_live) {
        const { data: cfgForUpdate } = await supabase
          .from("site_config")
          .select("id")
          .limit(1)
          .single();
        if (cfgForUpdate) {
          await supabase
            .from("site_config")
            .update({ is_live: false })
            .eq("id", cfgForUpdate.id);
        }
      }

      const hasUpcoming = config?.next_match_date && new Date(config.next_match_date).getTime() > Date.now();
      return new Response(
        JSON.stringify({
          live: false,
          upcoming: !!hasUpcoming,
          startTime: hasUpcoming ? config.next_match_date : null,
          opponent: config?.opponent || "",
          source: "api-no-match",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Arsenal match found
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

    // Build stream URLs from the match data
    const streamUrls = arsenalMatch.stream_links || arsenalMatch.streams || [];
    const streamUrl = Array.isArray(streamUrls) && streamUrls.length > 0
      ? streamUrls[0]?.url || streamUrls[0]?.stream_url || streamUrls[0] || ""
      : arsenalMatch.stream_url || arsenalMatch.streamUrl || "";

    const isLive = arsenalMatch.match_status === "live" || arsenalMatch.match_status === "Live";

    return new Response(
      JSON.stringify({
        live: isLive,
        upcoming: !isLive,
        homeTeam: arsenalMatch.home_team_name || "Home",
        awayTeam: arsenalMatch.away_team_name || "Away",
        streamUrl: typeof streamUrl === "string" ? streamUrl : "",
        startTime: arsenalMatch.match_time
          ? new Date(Number(arsenalMatch.match_time) * 1000).toISOString()
          : null,
        league: arsenalMatch.league_name || arsenalMatch.competition || "Premier League",
        status: arsenalMatch.match_status || "LIVE",
        score: `${arsenalMatch.homeTeamScore || 0} - ${arsenalMatch.awayTeamScore || 0}`,
        source: "rapidapi",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("arsenal-live error:", err);
    return new Response(
      JSON.stringify({ live: false, upcoming: false, error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
