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
    const { url, headers: customHeaders } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing url parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the stream content with custom headers if provided
    const fetchHeaders: Record<string, string> = {};
    if (customHeaders) {
      Object.assign(fetchHeaders, customHeaders);
    }

    const response = await fetch(url, { headers: fetchHeaders });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    // For m3u8 playlists, rewrite relative URLs to absolute
    if (url.includes(".m3u8") || contentType.includes("mpegurl")) {
      const text = new TextDecoder().decode(body);
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      // Rewrite relative URLs in the playlist to absolute URLs
      const rewritten = text.replace(/^(?!#)(?!https?:\/\/)(.+\.(?:ts|m3u8|key).*)$/gm, (match) => {
        return baseUrl + match;
      });

      return new Response(rewritten, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
