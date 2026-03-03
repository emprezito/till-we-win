import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-recording-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Simple shared-secret auth for VPS → edge function calls
    const secret = req.headers.get("x-recording-secret");
    const expectedSecret = Deno.env.get("RECORDING_SECRET");

    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method === "POST") {
      const body = await req.json();
      const {
        match_title,
        home_team,
        away_team,
        score,
        league,
        match_date,
        recording_url,
        thumbnail_url,
        duration_seconds,
        file_size_mb,
        expires_days = 10,
      } = body;

      if (!match_title || !recording_url) {
        return new Response(
          JSON.stringify({ error: "match_title and recording_url are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expires_at = new Date(
        Date.now() + expires_days * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("match_recordings")
        .insert({
          match_title,
          home_team: home_team || "",
          away_team: away_team || "",
          score: score || "",
          league: league || "",
          match_date: match_date || null,
          recording_url,
          thumbnail_url: thumbnail_url || null,
          duration_seconds: duration_seconds || null,
          file_size_mb: file_size_mb || null,
          expires_at,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, recording: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE — cleanup expired recordings
    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("match_recordings")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("id, match_title");

      if (error) throw error;

      return new Response(
        JSON.stringify({ deleted: data?.length || 0, items: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
