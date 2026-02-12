import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert ArrayBuffer to URL-safe base64
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64 = arrayBufferToBase64Url(publicKeyRaw);
  // Private key d parameter in JWK is already base64url
  const privateKeyBase64 = privateKeyJwk.d!;

  return { publicKey: publicKeyBase64, privateKey: privateKeyBase64 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if VAPID keys already exist
    const { data: existing } = await supabaseAdmin
      .from("vapid_keys")
      .select("public_key")
      .limit(1)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ publicKey: existing.public_key }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate and store new VAPID keys
    const keys = await generateVapidKeys();
    await supabaseAdmin.from("vapid_keys").insert({
      public_key: keys.publicKey,
      private_key: keys.privateKey,
    });

    return new Response(
      JSON.stringify({ publicKey: keys.publicKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
