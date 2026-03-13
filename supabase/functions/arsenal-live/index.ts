import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Key Rotation ---
function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const key = Deno.env.get(`RAPIDAPI_KEY_${i}`);
    if (key) keys.push(key);
  }
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
  if (name === "arsenal" || name === "arsenal fc") return true;
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
      .select("id, is_live, manual_override_stream_url, enable_auto_stream, opponent, next_match_date, match_status")
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ live: false, error: "No site_config found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Manual override always takes priority ---
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

    // --- If auto stream disabled, return cached state ---
    if (!config.enable_auto_stream) {
      return new Response(
        JSON.stringify({ live: config.is_live || false, opponent: config.opponent || "TBD", source: "manual" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper to log API usage
    async function logApiUsage(endpoint: string, keyIndex: number, status: string, skipped = false, skipReason?: string) {
      try {
        await supabase.from("api_usage_logs").insert({
          function_name: "arsenal-live",
          endpoint,
          key_index: keyIndex,
          status,
          skipped,
          skip_reason: skipReason || null,
        });
      } catch (e) {
        console.warn("Failed to log API usage:", e);
      }
    }

    // =========================================================
    // SMART TIME GATE: Only call RapidAPI during match windows
    // - 30 min before kickoff → 4 hours after kickoff
    // - If currently marked live, always check (to detect match end)
    // - Outside window: return cached data, zero API calls
    // =========================================================
    const now = Date.now();
    const nextMatch = config.next_match_date ? new Date(config.next_match_date).getTime() : null;

    if (nextMatch) {
      const minsBefore = (nextMatch - now) / (1000 * 60);
      const hoursAfter = (now - nextMatch) / (1000 * 60 * 60);

      const inMatchWindow = minsBefore <= 30 || (hoursAfter >= 0 && hoursAfter <= 4);

      if (!config.is_live && !inMatchWindow) {
        console.log(`Outside match window. Next match in ${Math.round(minsBefore)} min. Skipping API calls.`);
        await logApiUsage("skipped", 0, "skipped", true, `Next match in ${Math.round(minsBefore)} min`);
        return new Response(
          JSON.stringify({
            live: false,
            source: "cached_skip",
            message: `Next match in ${Math.round(minsBefore / 60)} hours. Polling starts 30 min before kickoff.`,
            next_match_date: config.next_match_date,
            opponent: config.opponent || "TBD",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // If next_match_date is null, we still check (fetch-arsenal-fixtures sets this)

    // --- MATCH WINDOW ACTIVE: Check LIVE first (1 API call) ---
    let arsenalMatch = null;
    try {
      const { data: liveData, usedKeyIndex } = await fetchMatchesWithRotation(apiKeys, rapidApiHost, { status: "live", page: "1" });
      arsenalMatch = findArsenalMatch(liveData?.matches || []);
      await logApiUsage("matches?status=live", usedKeyIndex, "success");
    } catch (err) {
      console.error("All keys failed for live check:", err);
      await logApiUsage("matches?status=live", -1, "all_keys_failed");
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

    // --- Not live. Check FINISHED (1 more API call) to detect match end ---
    // Only check finished if we were previously live or in post-match window
    if (config.is_live || (nextMatch && (now - nextMatch) / (1000 * 60 * 60) >= 1.5)) {
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
    }

    // --- Pre-match window (30 min before, not yet live) — just confirm upcoming ---
    // No need for extra API call, we already know it's upcoming from next_match_date
    if (nextMatch && (nextMatch - now) > 0) {
      return new Response(
        JSON.stringify({
          live: false, upcoming: true,
          next_match_date: config.next_match_date,
          opponent: config.opponent || "TBD",
          source: "pre_match_window",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- No match context ---
    if (config.is_live) {
      // Was live but can't find match anymore — mark as finished
      await supabase.from("site_config").update({
        is_live: false,
        match_status: "finished",
        cached_servers: [],
      }).eq("id", config.id);
    }

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
