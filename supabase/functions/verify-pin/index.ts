import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin, pinType } = await req.json();
    // Get client IP for rate limiting - this header depends on the edge runtime/proxy
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    if (!pin || !pinType) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing pin or pinType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RATE LIMITING CHECK
    const { data: attempts } = await supabase
      .from("app_pin_attempts")
      .select("*")
      .eq("ip_address", clientIp)
      .single();

    if (attempts) {
      if (attempts.blocked_until && new Date(attempts.blocked_until) > new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many attempts. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reset count if last attempt was > 15 mins ago
      const timeSinceLast = new Date().getTime() - new Date(attempts.last_attempt_at).getTime();
      if (timeSinceLast > 15 * 60 * 1000) { // 15 mins
        await supabase.from("app_pin_attempts").update({ attempt_count: 0, blocked_until: null }).eq("id", attempts.id);
      }
    }

    // Fetch the stored PIN hash
    const { data: pinData, error } = await supabase
      .from("app_pins")
      .select("pin_hash")
      .eq("pin_type", pinType)
      .single();

    if (error || !pinData) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let isValid = false;
    let needsMigration = false;

    // Check if stored pin looks like a bcrypt hash (starts with $2a$, $2b$, or $2y$ and length 60)
    const isBcryptHash = /^\$2[aby]\$\d{2}\$.{53}$/.test(pinData.pin_hash);

    if (isBcryptHash) {
      isValid = await bcrypt.compare(pin, pinData.pin_hash);
    } else {
      // Legacy plaintext comparison
      isValid = pinData.pin_hash === pin;
      if (isValid) needsMigration = true;
    }

    if (!isValid) {
      // UPDATE RATE LIMIT
      if (attempts) {
        const newCount = (attempts.attempt_count || 0) + 1;
        const updates: any = { attempt_count: newCount, last_attempt_at: new Date() };
        if (newCount >= 5) {
          const blockTime = new Date();
          blockTime.setMinutes(blockTime.getMinutes() + 15); // Block for 15 mins
          updates.blocked_until = blockTime;
        }
        await supabase.from("app_pin_attempts").update(updates).eq("id", attempts.id);
      } else {
        await supabase.from("app_pin_attempts").insert({ ip_address: clientIp, attempt_count: 1 });
      }

      return new Response(
        JSON.stringify({ success: false, error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUCCESS - Clear rate limit
    if (attempts) {
      await supabase.from("app_pin_attempts").delete().eq("id", attempts.id);
    }

    // AUTO-MIGRATE TO BCRYPT
    if (needsMigration) {
      const newHash = await bcrypt.hash(pin, 10);
      await supabase
        .from("app_pins")
        .update({ pin_hash: newHash })
        .eq("pin_type", pinType);
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    // Admin session shorter? 10 mins as per req
    const sessionDuration = pinType === 'admin' ? 10 : 120; // 10 mins for admin, 2 hours for others
    expiresAt.setMinutes(expiresAt.getMinutes() + sessionDuration);

    // Store session
    const { error: sessionError } = await supabase
      .from("app_sessions")
      .insert({
        session_token: sessionToken,
        session_type: pinType,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-pin:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
