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
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost = Deno.env.get("RAPIDAPI_HOST") || "football-live-streaming-api.p.rapidapi.com";

    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "true";

    const response = await fetch(`https://${rapidApiHost}/matches`, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey!,
        "X-RapidAPI-Host": rapidApiHost,
      },
    });

    const data = await response.json();
    const matches = data?.matches || [];

    // Search for arsenal in any field
    const arsenalMatches = matches.filter((m: any) => {
      const str = JSON.stringify(m).toLowerCase();
      return str.includes("arsenal");
    });

    // Return debug info: total matches, arsenal matches, and sample of team names
    const teamNames = matches.slice(0, 30).map((m: any) => ({
      home: m.home_team_name,
      away: m.away_team_name,
      status: m.match_status,
      league: m.league_name || m.competition,
    }));

    return new Response(
      JSON.stringify({
        totalMatches: matches.length,
        arsenalFound: arsenalMatches.length,
        arsenalMatches,
        sampleTeams: teamNames,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
