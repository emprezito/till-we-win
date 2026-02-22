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

    // Fetch from RapidAPI (API-Football v3)
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "api-football-v1.p.rapidapi.com";

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

    // Step 1: Check for live Arsenal fixtures
    const liveResponse = await fetch(
      `https://${rapidApiHost}/v3/fixtures?live=all`,
      {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
      }
    );

    if (!liveResponse.ok) {
      const text = await liveResponse.text();
      console.error("RapidAPI live error:", liveResponse.status, text);
      
      // Fallback: try to get next Arsenal fixture
      return await getNextFixture(rapidApiKey, rapidApiHost, config, supabase, corsHeaders);
    }

    const liveData = await liveResponse.json();
    const liveFixtures = liveData?.response || [];

    // Find Arsenal in live matches
    const arsenalLive = liveFixtures.find(
      (f: any) =>
        f.teams?.home?.name?.toLowerCase().includes("arsenal") ||
        f.teams?.away?.name?.toLowerCase().includes("arsenal")
    );

    if (arsenalLive) {
      // Arsenal match is LIVE
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
          upcoming: false,
          homeTeam: arsenalLive.teams?.home?.name || "Home",
          awayTeam: arsenalLive.teams?.away?.name || "Away",
          streamUrl: "", // API-Football doesn't provide stream URLs
          startTime: arsenalLive.fixture?.date || null,
          league: arsenalLive.league?.name || "Premier League",
          status: arsenalLive.fixture?.status?.long || "LIVE",
          score: `${arsenalLive.goals?.home ?? 0} - ${arsenalLive.goals?.away ?? 0}`,
          source: "api-football",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No live Arsenal match - check for upcoming
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

    return await getNextFixture(rapidApiKey, rapidApiHost, config, supabase, corsHeaders);

  } catch (err) {
    console.error("arsenal-live error:", err);
    return new Response(
      JSON.stringify({ live: false, upcoming: false, error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getNextFixture(
  rapidApiKey: string,
  rapidApiHost: string,
  config: any,
  supabase: any,
  corsHeaders: Record<string, string>
) {
  try {
    // Arsenal team ID in API-Football is 42
    const ARSENAL_ID = 42;
    const nextResponse = await fetch(
      `https://${rapidApiHost}/v3/fixtures?team=${ARSENAL_ID}&next=1`,
      {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
      }
    );

    if (nextResponse.ok) {
      const nextData = await nextResponse.json();
      const nextFixture = nextData?.response?.[0];

      if (nextFixture) {
        const startTime = nextFixture.fixture?.date;
        const opponent = nextFixture.teams?.home?.name?.toLowerCase().includes("arsenal")
          ? nextFixture.teams?.away?.name
          : nextFixture.teams?.home?.name;

        // Update site_config with next match info
        const { data: cfgForUpdate } = await supabase
          .from("site_config")
          .select("id")
          .limit(1)
          .single();

        if (cfgForUpdate && startTime) {
          await supabase
            .from("site_config")
            .update({
              next_match_date: startTime,
              opponent: opponent || config?.opponent || "",
            })
            .eq("id", cfgForUpdate.id);
        }

        return new Response(
          JSON.stringify({
            live: false,
            upcoming: true,
            startTime,
            opponent: opponent || config?.opponent || "",
            league: nextFixture.league?.name || "Premier League",
            source: "api-football",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const text = await nextResponse.text();
      console.error("RapidAPI next fixture error:", nextResponse.status, text);
    }
  } catch (err) {
    console.error("Error fetching next fixture:", err);
  }

  // Final fallback to site_config
  const hasUpcoming = config?.next_match_date && new Date(config.next_match_date).getTime() > Date.now();
  return new Response(
    JSON.stringify({
      live: false,
      upcoming: !!hasUpcoming,
      startTime: hasUpcoming ? config.next_match_date : null,
      opponent: config?.opponent || "",
      source: "fallback",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
