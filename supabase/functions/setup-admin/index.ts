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
        const { newPin } = await req.json();

        if (!newPin || !/^\d{4,6}$/.test(newPin)) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid PIN format. Must be 4-6 digits." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // double check if it exists
        const { count } = await supabase
            .from("app_pins")
            .select("*", { count: "exact", head: true })
            .eq("pin_type", "admin");

        if (count && count > 0) {
            return new Response(
                JSON.stringify({ success: false, error: "Admin PIN already set" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const hashedPin = await bcrypt.hash(newPin, 10);

        const { error } = await supabase
            .from("app_pins")
            .insert({
                pin_type: 'admin',
                pin_hash: hashedPin
            });

        if (error) {
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Auto-login? Yes, let's create a session.
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await supabase
            .from("app_sessions")
            .insert({
                session_token: sessionToken,
                session_type: 'admin',
                expires_at: expiresAt.toISOString(),
            });

        return new Response(
            JSON.stringify({
                success: true,
                sessionToken,
                expiresAt: expiresAt.toISOString()
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ success: false, error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
