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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Get active channels
    const { data: channels, error: chErr } = await supabase
      .from("channels")
      .select("*")
      .eq("is_active", true);

    if (chErr) throw chErr;
    if (!channels?.length) {
      return new Response(JSON.stringify({ message: "No active channels" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const channel of channels) {
      // Get unused parsed content for this channel
      const { data: content } = await supabase
        .from("parsed_content")
        .select("*")
        .eq("channel_id", channel.id)
        .eq("is_used", false)
        .order("created_at", { ascending: true })
        .limit(5);

      if (!content?.length) {
        results.push({ channel: channel.name, scheduled: 0, reason: "no content" });
        continue;
      }

      // Get last scheduled post time for this channel
      const { data: lastPost } = await supabase
        .from("scheduled_posts")
        .select("scheduled_at")
        .eq("channel_id", channel.id)
        .order("scheduled_at", { ascending: false })
        .limit(1);

      let nextTime = new Date();
      if (lastPost?.length) {
        const last = new Date(lastPost[0].scheduled_at);
        if (last > nextTime) nextTime = last;
      }

      let scheduled = 0;
      for (const item of content) {
        nextTime = new Date(nextTime.getTime() + channel.publish_interval_minutes * 60 * 1000);

        // Optionally process with AI
        let processedText = item.original_text;
        if (lovableApiKey) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "Ты — редактор Telegram-канала. Перепиши текст для публикации: сделай его кратким, информативным, с эмоджи. Не добавляй хэштеги. Отвечай только переписанным текстом.",
                  },
                  { role: "user", content: item.original_text },
                ],
                max_tokens: 500,
              }),
            });
            const aiData = await aiRes.json();
            processedText = aiData.choices?.[0]?.message?.content || item.original_text;
          } catch (e) {
            console.error("AI processing error:", e);
          }
        }

        // Update parsed content
        await supabase
          .from("parsed_content")
          .update({ is_used: true, processed_text: processedText })
          .eq("id", item.id);

        // Create scheduled post
        await supabase.from("scheduled_posts").insert({
          channel_id: channel.id,
          user_id: channel.user_id,
          content_id: item.id,
          text: processedText,
          scheduled_at: nextTime.toISOString(),
        });

        scheduled++;
      }

      results.push({ channel: channel.name, scheduled });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Schedule error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
