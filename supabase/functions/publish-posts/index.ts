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

    // Get pending posts that are due
    const now = new Date().toISOString();
    const { data: posts, error: postErr } = await supabase
      .from("scheduled_posts")
      .select("*, channels!inner(*)")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (postErr) throw postErr;
    if (!posts?.length) {
      return new Response(JSON.stringify({ message: "No posts to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const post of posts) {
      const channel = (post as any).channels;
      if (!channel.telegram_bot_token || !channel.telegram_chat_id) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: "Missing bot token or chat ID" })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", reason: "missing config" });
        continue;
      }

      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${channel.telegram_bot_token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channel.telegram_chat_id,
              text: post.text,
              parse_mode: "HTML",
            }),
          }
        );

        const tgData = await tgRes.json();

        if (tgData.ok) {
          await supabase
            .from("scheduled_posts")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              telegram_message_id: String(tgData.result.message_id),
            })
            .eq("id", post.id);
          results.push({ id: post.id, status: "published" });
        } else {
          await supabase
            .from("scheduled_posts")
            .update({ status: "failed", error_message: tgData.description || "Unknown error" })
            .eq("id", post.id);
          results.push({ id: post.id, status: "failed", reason: tgData.description });
        }
      } catch (e) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: String(e) })
          .eq("id", post.id);
        results.push({ id: post.id, status: "failed", reason: String(e) });
      }
    }

    return new Response(JSON.stringify({ published: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Publish error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
