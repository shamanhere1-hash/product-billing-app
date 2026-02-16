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
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Default PINs from seed.sql
        const pins = [
            { pin_type: 'main_app', pin_hash: '1234' },
            { pin_type: 'history_summary', pin_hash: '5678' },
            { pin_type: 'owner', pin_hash: '9999' },
            { pin_type: 'admin', pin_hash: '123456' }
        ];

        const results = [];

        for (const pin of pins) {
            // Upsert: Insert if not exists, update if conflict (though pin_hash shouldn't change if we just want to ensure existence)
            // Using onConflict on pin_type
            const { data, error } = await supabase
                .from("app_pins")
                .upsert(pin, { onConflict: "pin_type" })
                .select();

            results.push({ pin: pin.pin_type, success: !error, error: error?.message });
        }

        return new Response(
            JSON.stringify({
                success: true,
                results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
