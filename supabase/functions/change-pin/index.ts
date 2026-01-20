import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://esm.sh/bcryptjs@2.4.3";

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
    const { ownerSessionToken, pinType, newPin } = await req.json();

    if (!ownerSessionToken || !pinType || !newPin) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session (Owner OR Admin)
    const { data: sessionData, error: sessionError } = await supabase
      .from("app_sessions")
      .select("*")
      .eq("session_token", ownerSessionToken)
      .single();

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check permissions: Owner can change all. Admin can change all (as per req "Admin Dashboard features: Change Main Access Pincode, Change Admin Code").
    // IMPORTANT: Requirements say "Change Main Access Pincode, Change Admin Code, change history / summary code" for Admin Dashboard.
    // Ideally Admin should represent the "Owner" capabilities in this context, or we allow both 'owner' and 'admin' session types.
    const allowedTypes = ["owner", "admin"];
    if (!allowedTypes.includes(sessionData.session_type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if session is expired
    if (new Date(sessionData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Session expired" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate PIN (must be 4-6 digits)
    if (!/^\d{4,6}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN must be 4-6 digits" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update the PIN
    const { error: updateError } = await supabase
      .from("app_pins")
      .update({ pin_hash: hashedPin })
      .eq("pin_type", pinType);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update PIN" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in change-pin:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
