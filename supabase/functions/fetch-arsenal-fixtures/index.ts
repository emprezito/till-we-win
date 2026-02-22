import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Try multiple seasons to find fixture data
const SEASONS = ["2025-26", "2024-25"];

async function fetchFixturesForSeason(season: string) {
  const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/en.1.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let data = null;

    // Try each season until we find valid data
    for (const season of SEASONS) {
      data = await fetchFixturesForSeason(season);
      if (data?.rounds?.length) break;
    }

    if (!data?.rounds?.length) {
      return new Response(
        JSON.stringify({ message: "No fixture data available from API. Please set fixtures manually." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find next Arsenal match
    const now = new Date();
    let nextMatch: { date: string; opponent: string } | null = null;

    for (const round of data.rounds) {
      for (const match of round.matches || []) {
        const matchDate = new Date(match.date);
        if (matchDate <= now) continue;

        const team1 = match.team1?.name || "";
        const team2 = match.team2?.name || "";
        const isArsenal = team1.includes("Arsenal") || team2.includes("Arsenal");

        if (isArsenal) {
          const opponent = team1.includes("Arsenal") ? team2 : team1;

          if (!nextMatch || matchDate < new Date(nextMatch.date)) {
            nextMatch = {
              date: match.date + (match.time ? `T${match.time}Z` : "T15:00:00Z"),
              opponent: opponent || "TBD",
            };
          }
          break;
        }
      }
      if (nextMatch) break;
    }

    if (!nextMatch) {
      return new Response(
        JSON.stringify({ message: "No upcoming Arsenal matches found in available data." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update site_config in database
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
