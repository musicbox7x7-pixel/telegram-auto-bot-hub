import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active sources with their channels
    const { data: sources, error: srcErr } = await supabase
      .from("sources")
      .select("*, channels!inner(*)")
      .eq("is_active", true)
      .eq("channels.is_active", true);

    if (srcErr) throw srcErr;
    if (!sources?.length) {
      return new Response(JSON.stringify({ message: "No active sources" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const source of sources) {
      try {
        let content: string[] = [];

        if (source.source_type === "rss") {
          content = await parseRSS(source.url);
        } else if (source.source_type === "web") {
          // Use Firecrawl or simple fetch
          const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
          if (apiKey && source.url) {
            content = await parseWebFirecrawl(source.url, apiKey);
          } else if (source.url) {
            content = await parseWebSimple(source.url);
          }
        }
        // Telegram sources would be handled via webhook/bot updates

        // Store parsed content
        for (const text of content.slice(0, 10)) {
          const { error: insertErr } = await supabase.from("parsed_content").insert({
            source_id: source.id,
            channel_id: source.channel_id,
            user_id: (source as any).channels.user_id,
            original_text: text,
          });
          if (insertErr) console.error("Insert error:", insertErr);
        }

        // Update source stats
        await supabase
          .from("sources")
          .update({
            last_parsed_at: new Date().toISOString(),
            posts_collected: source.posts_collected + content.length,
          })
          .eq("id", source.id);

        results.push({ source: source.name, parsed: content.length });
      } catch (e) {
        console.error(`Error parsing ${source.name}:`, e);
        results.push({ source: source.name, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function parseRSS(url: string | null): Promise<string[]> {
  if (!url) return [];
  const res = await fetch(url);
  const xml = await res.text();
  const items: string[] = [];
  const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<description><!\[CDATA\[(.*?)\]\]><\/description>[\s\S]*?<\/item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(`${match[1]}\n\n${match[2].replace(/<[^>]+>/g, "")}`);
  }
  // Fallback simpler pattern
  if (items.length === 0) {
    const simpleRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g;
    while ((match = simpleRegex.exec(xml)) !== null) {
      items.push(`${match[1]}\n\n${match[2].replace(/<[^>]+>/g, "")}`);
    }
  }
  return items;
}

async function parseWebFirecrawl(url: string, apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await res.json();
  const markdown = data?.data?.markdown || data?.markdown || "";
  if (!markdown) return [];
  // Split into paragraphs
  return markdown.split(/\n{2,}/).filter((p: string) => p.trim().length > 50).slice(0, 10);
}

async function parseWebSimple(url: string): Promise<string[]> {
  const res = await fetch(url);
  const html = await res.text();
  // Extract text from paragraphs
  const paragraphs: string[] = [];
  const regex = /<p[^>]*>(.*?)<\/p>/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 50) paragraphs.push(text);
  }
  return paragraphs.slice(0, 10);
}
