import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// EPL fixtures from fixturedownload.com (free, no API key needed)
const FIXTURE_URL = "https://fixturedownload.com/feed/json/epl-2025/arsenal";

function isArsenalFC(teamName: string): boolean {
  const name = teamName.toLowerCase().trim();
  if (name === "arsenal" || name === "arsenal fc") return true;
  if (name.startsWith("arsenal") && name.length > 10) return false;
  return name === "arsenal";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const candidates: { date: string; opponent: string; league: string }[] = [];

    // ==========================================
    // SOURCE 1: EPL fixtures (free, no API key)
    // ==========================================
    try {
      const res = await fetch(FIXTURE_URL);
      if (res.ok) {
        const matches = await res.json();
        for (const match of matches) {
          const matchDate = new Date(match.DateUtc);
          if (matchDate <= now) continue;
          const opponent = match.HomeTeam === "Arsenal" ? match.AwayTeam : match.HomeTeam;
          candidates.push({
            date: match.DateUtc.replace(" ", "T").replace(/Z$/, "") + "Z",
            opponent,
            league: "Premier League",
          });
        }
        console.log(`EPL: Found ${candidates.length} upcoming matches`);
      }
    } catch (err) {
      console.warn("EPL fixture fetch failed:", err);
    }

    // ==========================================
    // SOURCE 2: RapidAPI upcoming (ALL competitions)
    // Uses only 1 API call to cover FA Cup, CL, League Cup, etc.
    // ==========================================
    try {
      const rapidApiKey = Deno.env.get("RAPIDAPI_KEY_1") || Deno.env.get("RAPIDAPI_KEY");
      const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

      if (rapidApiKey) {
        const url = `https://${rapidApiHost}/matches?status=vs&page=1`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": rapidApiHost,
          },
        });
        const data = await res.json();

        // Check for quota error
        if (data?.message && typeof data.message === "string" && data.message.includes("exceeded")) {
          console.warn("RapidAPI quota exceeded for fixture check, skipping");
        } else {
          const allMatches = data?.matches || [];
          const arsenalMatch = allMatches.find((m: any) =>
            isArsenalFC(m.home_team_name || "") || isArsenalFC(m.away_team_name || "")
          );

          if (arsenalMatch) {
            const opponent = isArsenalFC(arsenalMatch.home_team_name || "")
              ? arsenalMatch.away_team_name || "Unknown"
              : arsenalMatch.home_team_name || "Unknown";
            const startTime = arsenalMatch.match_time
              ? new Date(Number(arsenalMatch.match_time) * 1000).toISOString()
              : null;

            if (startTime && new Date(startTime) > now) {
              candidates.push({
                date: startTime,
                opponent,
                league: arsenalMatch.league_name || "Cup",
              });
              console.log(`RapidAPI: Found upcoming ${arsenalMatch.league_name} match vs ${opponent} at ${startTime}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn("RapidAPI upcoming check failed:", err);
    }

    // ==========================================
    // Pick the EARLIEST upcoming match across all sources
    // ==========================================
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming Arsenal matches found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextMatch = candidates[0];

    // Update site_config with the earliest match
    const { data: configs } = await supabase
      .from("site_config")
      .select("id")
      .limit(1);

    if (configs && configs.length > 0) {
      await supabase
        .from("site_config")
        .update({
          next_match_date: nextMatch.date,
          opponent: nextMatch.opponent,
        })
        .eq("id", configs[0].id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        nextMatch,
        allUpcoming: candidates.slice(0, 5), // Return next 5 for visibility
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
