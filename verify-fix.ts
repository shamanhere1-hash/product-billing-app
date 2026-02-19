
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

async function verifyFix() {
    console.log("Verifying fix...");

    // 1. Create a dummy order
    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        order_number: "TEST-" + Date.now(),
        customer_name: "Test User",
        total: 100,
        status: "pending"
    });

    if (orderError) {
        console.error("Failed to create test order:", orderError);
        return;
    }
    console.log("Created test order:", orderId);

    // 2. Call RPC to update items
    const items = [
        {
            product_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID, might fail FK if checking.
            // We need a valid product ID. Let's fetch one.
            product_name: "Test Product",
            product_price: 50,
            quantity: 2,
            is_out_of_stock: true
        }
    ];

    // Fetch a real product first
    const { data: products } = await supabase.from("products").select("id").limit(1);
    if (products && products.length > 0) {
        items[0].product_id = products[0].id;
    } else {
        console.log("No products found, using random UUID (might fail FK constraints)");
        items[0].product_id = crypto.randomUUID();
    }

    const { error: rpcError } = await supabase.rpc("update_order_items", {
        p_order_id: orderId,
        p_total: 100,
        p_items: items
    });

    if (rpcError) {
        console.error("RPC Failed:", rpcError);
    } else {
        console.log("RPC Succeeded.");

        // 3. Verify items
        const { data: fetchedItems } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", orderId);

        console.log("Fetched Items:", fetchedItems);

        if (fetchedItems && fetchedItems.length === 1 && fetchedItems[0].is_out_of_stock === true) {
            console.log("VERIFICATION PASSED: Item exists and is_out_of_stock is true.");
        } else {
            console.error("VERIFICATION FAILED: Items not correct.");
        }
    }

    // Cleanup
    await supabase.from("orders").delete().eq("id", orderId);
    console.log("Cleaned up.");
}

verifyFix();
