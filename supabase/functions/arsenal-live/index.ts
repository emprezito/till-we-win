import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Key Rotation ---
function getApiKeys(): string[] {
  const keys: string[] = [];
  // Try numbered keys first
  for (let i = 1; i <= 5; i++) {
    const key = Deno.env.get(`RAPIDAPI_KEY_${i}`);
    if (key) keys.push(key);
  }
  // Fallback to single key
  const singleKey = Deno.env.get("RAPIDAPI_KEY");
  if (singleKey && !keys.includes(singleKey)) keys.push(singleKey);
  return keys;
}

async function fetchMatchesWithRotation(
  keys: string[],
  host: string,
  params: Record<string, string>
): Promise<{ data: any; usedKeyIndex: number }> {
  const url = new URL(`https://${host}/matches`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let i = 0; i < keys.length; i++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { "X-RapidAPI-Key": keys[i], "X-RapidAPI-Host": host },
      });
      const data = await res.json();
      // Check for quota error
      if (data?.message && typeof data.message === "string" && data.message.includes("exceeded")) {
        console.warn(`Key ${i + 1} quota exceeded, trying next...`);
        continue;
      }
      return { data, usedKeyIndex: i };
    } catch (err) {
      console.warn(`Key ${i + 1} failed:`, err);
      continue;
    }
  }
  throw new Error("All API keys exhausted or failed");
}

/**
 * Match only Arsenal FC (England).
 * Excludes "Arsenal de Sarandí" and other clubs with "arsenal" in their name.
 */
function isArsenalFC(teamName: string): boolean {
  const name = teamName.toLowerCase().trim();
  // Exact matches or known English Arsenal patterns
  if (name === "arsenal" || name === "arsenal fc") return true;
  // Reject anything with extra words after "arsenal" (e.g. "Arsenal de Sarandí")
  if (name.startsWith("arsenal") && name.length > 10) return false;
  return name === "arsenal";
}

function findArsenalMatch(matches: any[]) {
  return matches.find((m: any) => {
    return isArsenalFC(m.home_team_name || "") || isArsenalFC(m.away_team_name || "");
  });
}

function getStreamUrl(match: any): string | null {
  if (!match.servers || !Array.isArray(match.servers) || match.servers.length === 0) return null;
  const direct = match.servers.find((s: any) => s.type === "direct");
  if (direct?.url) return direct.url;
  const first = match.servers.find((s: any) => s.url);
  return first?.url || null;
}

function getOpponent(match: any): string {
  if (isArsenalFC(match.home_team_name || "")) return match.away_team_name || "Unknown";
  return match.home_team_name || "Unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKeys = getApiKeys();
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ live: false, error: "No RAPIDAPI keys configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("site_config")
      .select("id, is_live, manual_override_stream_url, enable_auto_stream, opponent, next_match_date")
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ live: false, error: "No site_config found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If manual override is set, use it
    if (config.manual_override_stream_url) {
      await supabase.from("site_config").update({
        match_status: "live",
        is_live: true,
        livestream_url: config.manual_override_stream_url,
      }).eq("id", config.id);

      return new Response(
        JSON.stringify({ live: true, streamUrl: config.manual_override_stream_url, opponent: config.opponent || "TBD", source: "manual_override" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If auto stream is disabled, return current DB state
    if (!config.enable_auto_stream) {
      return new Response(
        JSON.stringify({ live: config.is_live || false, opponent: config.opponent || "TBD", source: "manual" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Smart polling: Only call API if we're near match time ---
    const now = Date.now();
    const nextMatch = config.next_match_date ? new Date(config.next_match_date).getTime() : null;
    const hoursBefore = nextMatch ? (nextMatch - now) / (1000 * 60 * 60) : null;
    // Also check hours AFTER match start (match could be ongoing up to ~3h after start)
    const hoursAfter = nextMatch ? (now - nextMatch) / (1000 * 60 * 60) : null;

    // Skip API call only if:
    // - Not currently live AND
    // - Match is >2h in the future OR >4h in the past (match definitely over)
    // - If next_match_date is null, still poll once every call (no gate)
    const matchWindowActive = nextMatch !== null && (
      (hoursBefore !== null && hoursBefore <= 2) || 
      (hoursAfter !== null && hoursAfter <= 4)
    );

    if (!config.is_live && nextMatch !== null && !matchWindowActive) {
      return new Response(
        JSON.stringify({ live: false, source: "cached_skip", message: "No match within window" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Check LIVE Arsenal match ---
    let arsenalMatch = null;
    try {
      const { data: liveData } = await fetchMatchesWithRotation(apiKeys, rapidApiHost, { status: "live", page: "1" });
      arsenalMatch = findArsenalMatch(liveData?.matches || []);
    } catch (err) {
      console.error("All keys failed for live check:", err);
      return new Response(
        JSON.stringify({ live: false, error: String(err), source: "api_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (arsenalMatch) {
      const streamUrl = getStreamUrl(arsenalMatch);
      const opponent = getOpponent(arsenalMatch);
      const score = `${arsenalMatch.homeTeamScore || "0"}-${arsenalMatch.awayTeamScore || "0"}`;

      await supabase.from("site_config").update({
        is_live: true,
        match_status: "live",
        match_home_team: arsenalMatch.home_team_name || "",
        match_away_team: arsenalMatch.away_team_name || "",
        match_score: score,
        match_league: arsenalMatch.league_name || "",
        cached_servers: arsenalMatch.servers || [],
        opponent,
        livestream_url: streamUrl || "",
      }).eq("id", config.id);

      return new Response(
        JSON.stringify({
          live: true, homeTeam: arsenalMatch.home_team_name, awayTeam: arsenalMatch.away_team_name,
          score, league: arsenalMatch.league_name, streamUrl, servers: arsenalMatch.servers || [],
          opponent, source: "api_live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Check UPCOMING ---
    try {
      const { data: upcomingData } = await fetchMatchesWithRotation(apiKeys, rapidApiHost, { status: "vs", page: "1" });
      const upcomingArsenal = findArsenalMatch(upcomingData?.matches || []);

      if (upcomingArsenal) {
        const opponent = getOpponent(upcomingArsenal);
        const startTime = upcomingArsenal.match_time
          ? new Date(Number(upcomingArsenal.match_time) * 1000).toISOString()
          : null;

        await supabase.from("site_config").update({
          is_live: false,
          match_status: "upcoming",
          match_home_team: upcomingArsenal.home_team_name || "",
          match_away_team: upcomingArsenal.away_team_name || "",
          match_score: "",
          match_league: upcomingArsenal.league_name || "",
          match_start_time: startTime,
          cached_servers: [],
          opponent,
        }).eq("id", config.id);

        return new Response(
          JSON.stringify({
            live: false, upcoming: true, homeTeam: upcomingArsenal.home_team_name,
            awayTeam: upcomingArsenal.away_team_name, league: upcomingArsenal.league_name,
            startTime, opponent, source: "api_upcoming",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      console.warn("Upcoming check failed:", err);
    }

    // --- Check FINISHED ---
    try {
      const { data: finishedData } = await fetchMatchesWithRotation(apiKeys, rapidApiHost, { status: "finished", page: "1" });
      const finishedArsenal = findArsenalMatch(finishedData?.matches || []);

      if (finishedArsenal) {
        const opponent = getOpponent(finishedArsenal);
        const score = `${finishedArsenal.homeTeamScore ?? "0"}-${finishedArsenal.awayTeamScore ?? "0"}`;

        await supabase.from("site_config").update({
          is_live: false,
          match_status: "finished",
          match_home_team: finishedArsenal.home_team_name || "",
          match_away_team: finishedArsenal.away_team_name || "",
          match_score: score,
          match_league: finishedArsenal.league_name || "",
          cached_servers: [],
          opponent,
        }).eq("id", config.id);

        return new Response(
          JSON.stringify({
            live: false, finished: true, homeTeam: finishedArsenal.home_team_name,
            awayTeam: finishedArsenal.away_team_name, score, league: finishedArsenal.league_name,
            opponent, source: "api_finished",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      console.warn("Finished check failed:", err);
    }

    // --- No match found ---
    await supabase.from("site_config").update({
      is_live: false,
      match_status: "none",
      cached_servers: [],
    }).eq("id", config.id);

    return new Response(
      JSON.stringify({ live: false, upcoming: false, finished: false, source: "api_none" }),
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
