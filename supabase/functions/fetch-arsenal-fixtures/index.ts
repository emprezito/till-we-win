import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// fixturedownload.com has up-to-date EPL fixtures including 2025-26
const FIXTURE_URL = "https://fixturedownload.com/feed/json/epl-2025/arsenal";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetch(FIXTURE_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch fixtures: ${res.status}`);
    }

    const matches = await res.json();
    // matches is an array of { MatchNumber, RoundNumber, DateUtc, Location, HomeTeam, AwayTeam, HomeTeamScore, AwayTeamScore }

    const now = new Date();
    let nextMatch: { date: string; opponent: string; location: string } | null = null;

    for (const match of matches) {
      const matchDate = new Date(match.DateUtc);
      if (matchDate <= now) continue;

      // This feed is already filtered to Arsenal, but double-check
      const opponent = match.HomeTeam === "Arsenal" ? match.AwayTeam : match.HomeTeam;
      const location = match.Location || "";

      if (!nextMatch || matchDate < new Date(nextMatch.date)) {
        nextMatch = {
          date: match.DateUtc.replace(" ", "T").replace(/Z$/, "") + "Z",
          opponent,
          location,
        };
      }
    }

    if (!nextMatch) {
      return new Response(
        JSON.stringify({ message: "No upcoming Arsenal matches found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update site_config
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      JSON.stringify({ success: true, nextMatch }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
