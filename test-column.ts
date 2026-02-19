
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually read .env
const envPath = path.resolve(process.cwd(), ".env");
const envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
        // Basic splitting, handling potential multiple = signs by re-joining
        const parts = line.split("=");
        const key = parts[0]?.trim();
        let value = parts.slice(1).join("=").trim();

        // Remove wrapping quotes if present
        if (value && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && value) {
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig["VITE_SUPABASE_URL"];
const supabaseKey = envConfig["VITE_SUPABASE_PUBLISHABLE_KEY"]; // Changed from ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY", { supabaseUrl, supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    console.log("Checking if is_out_of_stock column exists...");

    // Try to select the column.
    const { data, error } = await supabase
        .from("order_items")
        .select("is_out_of_stock")
        .limit(1);

    if (error) {
        console.error("Error selecting is_out_of_stock:", error.message);
        // Supabase (PostgREST) usually returns code PGRST100 or 42703 for undefined column
        if (error.message.includes("does not exist") || error.code === "42703") {
            console.log("COLUMN MISSING CONFIRMED");
        }
    } else {
        console.log("Column exists.");
    }
}

checkColumn();
