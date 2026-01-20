import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionToken, sessionType } = await req.json();

    if (!sessionToken || !sessionType) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Missing sessionToken or sessionType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check session
    const { data: sessionData, error } = await supabase
      .from("app_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("session_type", sessionType)
      .single();

    if (error || !sessionData) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    const isValid = new Date(sessionData.expires_at) > new Date();

    if (!isValid) {
      // Clean up expired session
      await supabase
        .from("app_sessions")
        .delete()
        .eq("session_token", sessionToken);
    }

    return new Response(
      JSON.stringify({
        valid: isValid,
        expiresAt: sessionData.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ valid: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
