import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually read .env
const envPath = path.resolve(process.cwd(), ".env");
const envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
        const parts = line.split("=");
        const key = parts[0]?.trim();
        let value = parts.slice(1).join("=").trim();
        if (value && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key && value) {
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig["VITE_SUPABASE_URL"];
const supabaseKey = envConfig["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchHashes() {
    console.log("Fetching PIN hashes from app_pins table...\n");

    const { data, error } = await supabase.functions.invoke("fetch-pin-hashes");

    if (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }

    if (data?.pins) {
        console.log("=== PIN HASHES ===\n");
        for (const pin of data.pins) {
            const envKey = `VITE_PIN_HASH_${pin.pin_type.toUpperCase()}`;
            console.log(`${envKey}="${pin.pin_hash}"`);
        }
        console.log("\n=== Copy the above into your .env file ===");
    } else {
        console.log("No pins found:", data);
    }
}

fetchHashes();
