import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchMatches(rapidApiKey: string, rapidApiHost: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${rapidApiHost}/matches`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": rapidApiHost,
    },
  });
  return res.json();
}

function findArsenalMatch(matches: any[]) {
  return matches.find((m: any) => {
    const home = (m.home_team_name || "").toLowerCase();
    const away = (m.away_team_name || "").toLowerCase();
    return home.includes("arsenal") || away.includes("arsenal");
  });
}

function getStreamUrl(match: any): string | null {
  if (!match.servers || !Array.isArray(match.servers) || match.servers.length === 0) return null;
  // Prefer direct streams first, then any available
  const direct = match.servers.find((s: any) => s.type === "direct");
  if (direct?.url) return direct.url;
  // Fallback to first server with a URL
  const first = match.servers.find((s: any) => s.url);
  return first?.url || null;
}

function getOpponent(match: any): string {
  const home = (match.home_team_name || "").toLowerCase();
  if (home.includes("arsenal")) {
    return match.away_team_name || "Unknown";
  }
  return match.home_team_name || "Unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ live: false, error: "RAPIDAPI_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for manual override first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("site_config")
      .select("is_live, manual_override_stream_url, enable_auto_stream, opponent")
      .single();

    // If manual override is set, use it
    if (config?.manual_override_stream_url) {
      return new Response(
        JSON.stringify({
          live: true,
          streamUrl: config.manual_override_stream_url,
          opponent: config.opponent || "TBD",
          source: "manual_override",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If auto stream is disabled, return current DB state
    if (config && !config.enable_auto_stream) {
      return new Response(
        JSON.stringify({
          live: config.is_live || false,
          opponent: config.opponent || "TBD",
          source: "manual",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 1: Check for LIVE Arsenal match ---
    let arsenalMatch = null;
    const liveData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "live", page: "1" });
    const liveMatches = liveData?.matches || [];
    arsenalMatch = findArsenalMatch(liveMatches);

    // If not found on page 1, check more pages
    if (!arsenalMatch && liveData?.pagination?.hasNext) {
      const totalPages = Math.min(liveData.pagination.totalPages || 1, 5);
      for (let p = 2; p <= totalPages && !arsenalMatch; p++) {
        const pageData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "live", page: String(p) });
        arsenalMatch = findArsenalMatch(pageData?.matches || []);
      }
    }

    if (arsenalMatch) {
      const streamUrl = getStreamUrl(arsenalMatch);
      const opponent = getOpponent(arsenalMatch);
      const score = `${arsenalMatch.homeTeamScore || "0"}-${arsenalMatch.awayTeamScore || "0"}`;

      // Update DB
      await supabase.from("site_config").update({
        is_live: true,
        opponent,
        livestream_url: streamUrl || "",
      }).eq("id", (await supabase.from("site_config").select("id").single()).data?.id);

      return new Response(
        JSON.stringify({
          live: true,
          homeTeam: arsenalMatch.home_team_name,
          awayTeam: arsenalMatch.away_team_name,
          score,
          league: arsenalMatch.league_name,
          streamUrl,
          servers: arsenalMatch.servers || [],
          opponent,
          source: "api_live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 2: Check for UPCOMING Arsenal match (status=vs) ---
    const upcomingData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "vs", page: "1" });
    const upcomingMatches = upcomingData?.matches || [];
    let upcomingArsenal = findArsenalMatch(upcomingMatches);

    if (!upcomingArsenal && upcomingData?.pagination?.hasNext) {
      const totalPages = Math.min(upcomingData.pagination.totalPages || 1, 5);
      for (let p = 2; p <= totalPages && !upcomingArsenal; p++) {
        const pageData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "vs", page: String(p) });
        upcomingArsenal = findArsenalMatch(pageData?.matches || []);
      }
    }

    if (upcomingArsenal) {
      const opponent = getOpponent(upcomingArsenal);
      const startTime = upcomingArsenal.match_time
        ? new Date(Number(upcomingArsenal.match_time) * 1000).toISOString()
        : null;

      return new Response(
        JSON.stringify({
          live: false,
          upcoming: true,
          homeTeam: upcomingArsenal.home_team_name,
          awayTeam: upcomingArsenal.away_team_name,
          league: upcomingArsenal.league_name,
          startTime,
          opponent,
          source: "api_upcoming",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 3: Check for RECENTLY FINISHED Arsenal match ---
    let finishedArsenal = null;
    const finishedData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "finished", page: "1" });
    const finishedMatches = finishedData?.matches || [];
    finishedArsenal = findArsenalMatch(finishedMatches);

    if (!finishedArsenal && finishedData?.pagination?.hasNext) {
      const totalPages = Math.min(finishedData.pagination.totalPages || 1, 3);
      for (let p = 2; p <= totalPages && !finishedArsenal; p++) {
        const pageData = await fetchMatches(rapidApiKey, rapidApiHost, { status: "finished", page: String(p) });
        finishedArsenal = findArsenalMatch(pageData?.matches || []);
      }
    }

    if (finishedArsenal) {
      const opponent = getOpponent(finishedArsenal);
      const score = `${finishedArsenal.homeTeamScore ?? "0"}-${finishedArsenal.awayTeamScore ?? "0"}`;

      // Update DB to not live
      await supabase.from("site_config").update({ is_live: false }).eq(
        "id",
        (await supabase.from("site_config").select("id").single()).data?.id
      );

      return new Response(
        JSON.stringify({
          live: false,
          finished: true,
          homeTeam: finishedArsenal.home_team_name,
          awayTeam: finishedArsenal.away_team_name,
          score,
          league: finishedArsenal.league_name,
          opponent,
          source: "api_finished",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 4: No Arsenal match found at all ---
    await supabase.from("site_config").update({ is_live: false }).eq(
      "id",
      (await supabase.from("site_config").select("id").single()).data?.id
    );

    return new Response(
      JSON.stringify({
        live: false,
        upcoming: false,
        finished: false,
        source: "api_none",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("arsenal-live error:", err);
    return new Response(
      JSON.stringify({ live: false, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
