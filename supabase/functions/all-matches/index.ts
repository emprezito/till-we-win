const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchMatches(
  rapidApiKey: string,
  rapidApiHost: string,
  params: Record<string, string> = {}
) {
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

async function fetchMatchLink(
  rapidApiKey: string,
  rapidApiHost: string,
  slug: string
) {
  const url = `https://${rapidApiHost}/link/${slug}`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": rapidApiHost,
    },
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    const rapidApiHost =
      Deno.env.get("RAPIDAPI_HOST") ||
      "football-live-streaming-api.p.rapidapi.com";

    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ error: "RAPIDAPI_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list"; // "list" or "link"

    // Action: get stream links for a specific match
    if (action === "link" && body.slug) {
      const linkData = await fetchMatchLink(rapidApiKey, rapidApiHost, body.slug);
      return new Response(JSON.stringify(linkData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list all matches across statuses
    const status = body.status || "all"; // "live", "vs", "finished", "all"
    const page = body.page || "1";

    if (status === "all") {
      // Fetch live, upcoming, and finished in parallel
      const [liveData, upcomingData, finishedData] = await Promise.all([
        fetchMatches(rapidApiKey, rapidApiHost, { status: "live", page: "1" }),
        fetchMatches(rapidApiKey, rapidApiHost, { status: "vs", page: "1" }),
        fetchMatches(rapidApiKey, rapidApiHost, { status: "finished", page: "1" }),
      ]);

      return new Response(
        JSON.stringify({
          live: liveData?.matches || [],
          upcoming: upcomingData?.matches || [],
          finished: finishedData?.matches || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single status fetch
    const data = await fetchMatches(rapidApiKey, rapidApiHost, { status, page });
    return new Response(
      JSON.stringify({
        matches: data?.matches || [],
        pagination: data?.pagination || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("all-matches error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
