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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const candidates: { date: string; opponent: string; league: string; home: string; away: string; status: string }[] = [];

    // Helper to log API usage
    async function logApiUsage(endpoint: string, keyIndex: number, status: string, skipped = false, skipReason?: string) {
      try {
        await supabase.from("api_usage_logs").insert({
          function_name: "fetch-arsenal-fixtures",
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

    // ==========================================
    // SOURCE 1: EPL fixtures (free, no API key)
    // ==========================================
    try {
      const res = await fetch(FIXTURE_URL);
      if (res.ok) {
        const matches = await res.json();
        for (const match of matches) {
          const matchDate = new Date(match.DateUtc);
          // Include matches from now up to 7 days ahead, AND recently finished (last 24h)
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if (matchDate > sevenDaysFromNow) continue;
          if (matchDate < oneDayAgo) continue;

          const dateStr = match.DateUtc.replace(" ", "T").replace(/Z$/, "") + "Z";
          const isUpcoming = matchDate > now;
          const opponent = match.HomeTeam === "Arsenal" ? match.AwayTeam : match.HomeTeam;

          candidates.push({
            date: dateStr,
            opponent,
            league: "Premier League",
            home: match.HomeTeam,
            away: match.AwayTeam,
            status: isUpcoming ? "upcoming" : "finished",
          });
        }
        console.log(`EPL: Found ${candidates.length} matches in 7-day window`);
      }
    } catch (err) {
      console.warn("EPL fixture fetch failed:", err);
    }

    // ==========================================
    // SOURCE 2: RapidAPI upcoming (ALL competitions)
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

        if (data?.message && typeof data.message === "string" && data.message.includes("exceeded")) {
          console.warn("RapidAPI quota exceeded for fixture check, skipping");
          await logApiUsage("matches?status=vs", 0, "quota_exceeded", true, "Quota exceeded");
        } else {
          await logApiUsage("matches?status=vs", 0, "success");
          const allMatches = data?.matches || [];
          const arsenalMatches = allMatches.filter((m: any) =>
            isArsenalFC(m.home_team_name || "") || isArsenalFC(m.away_team_name || "")
          );

          for (const arsenalMatch of arsenalMatches) {
            const opponent = isArsenalFC(arsenalMatch.home_team_name || "")
              ? arsenalMatch.away_team_name || "Unknown"
              : arsenalMatch.home_team_name || "Unknown";
            const startTime = arsenalMatch.match_time
              ? new Date(Number(arsenalMatch.match_time) * 1000).toISOString()
              : null;

            if (startTime) {
              const matchDate = new Date(startTime);
              if (matchDate <= sevenDaysFromNow) {
                // Check if this fixture already exists (dedup by date proximity)
                const isDuplicate = candidates.some(c => {
                  const diff = Math.abs(new Date(c.date).getTime() - matchDate.getTime());
                  return diff < 3 * 60 * 60 * 1000 && c.opponent.toLowerCase() === opponent.toLowerCase();
                });

                if (!isDuplicate) {
                  candidates.push({
                    date: startTime,
                    opponent,
                    league: arsenalMatch.league_name || "Cup",
                    home: arsenalMatch.home_team_name || "Arsenal",
                    away: arsenalMatch.away_team_name || "Unknown",
                    status: matchDate > now ? "upcoming" : "finished",
                  });
                  console.log(`RapidAPI: Found ${arsenalMatch.league_name} match vs ${opponent} at ${startTime}`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("RapidAPI upcoming check failed:", err);
    }

    // Sort by date
    candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Pick the earliest upcoming match for the countdown
    const nextUpcoming = candidates.find(c => c.status === "upcoming");

    // Update site_config
    const { data: configs } = await supabase
      .from("site_config")
      .select("id")
      .limit(1);

    if (configs && configs.length > 0) {
      const updatePayload: any = {
        upcoming_fixtures: candidates,
      };
      if (nextUpcoming) {
        updatePayload.next_match_date = nextUpcoming.date;
        updatePayload.opponent = nextUpcoming.opponent;
      }
      await supabase
        .from("site_config")
        .update(updatePayload)
        .eq("id", configs[0].id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixtures: candidates,
        nextMatch: nextUpcoming || null,
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
