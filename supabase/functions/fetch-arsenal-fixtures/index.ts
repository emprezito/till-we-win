import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Current EPL season
const SEASON = "2025-26";
const FIXTURES_URL = `https://raw.githubusercontent.com/openfootball/football.json/master/${SEASON}/en.1.json`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch fixtures from openfootball
    const res = await fetch(FIXTURES_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch fixtures: ${res.status}`);
    }

    const data = await res.json();

    // Find next Arsenal match
    const now = new Date();
    let nextMatch: { date: string; opponent: string } | null = null;

    for (const round of data.rounds || []) {
      for (const match of round.matches || []) {
        const matchDate = new Date(match.date);
        if (matchDate <= now) continue;

        const isArsenal =
          match.team1?.name?.includes("Arsenal") ||
          match.team2?.name?.includes("Arsenal");

        if (isArsenal) {
          const opponent = match.team1?.name?.includes("Arsenal")
            ? match.team2?.name
            : match.team1?.name;

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
        JSON.stringify({ message: "No upcoming Arsenal matches found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update site_config in Supabase
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
