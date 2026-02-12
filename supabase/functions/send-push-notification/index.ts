import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const publicKeyRaw = base64UrlToUint8Array(publicKeyB64);
  
  // Reconstruct JWK for private key
  const privateKeyJwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyB64,
    // Extract x and y from the raw public key (skip the 0x04 prefix byte)
    x: btoa(String.fromCharCode(...publicKeyRaw.slice(1, 33)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...publicKeyRaw.slice(33, 65)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { privateKey, publicKeyRaw };
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJwt(endpoint: string, privateKey: CryptoKey): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:notifications@conector.app",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const signInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    signInput
  );

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature);
  let rawSig: Uint8Array;
  
  if (sigArray[0] === 0x30) {
    // DER encoded, need to extract r and s
    const rLen = sigArray[3];
    const rStart = 4;
    const sLenPos = rStart + rLen + 1;
    const sLen = sigArray[sLenPos];
    const sStart = sLenPos + 1;
    
    const r = sigArray.slice(rStart, rStart + rLen);
    const s = sigArray.slice(sStart, sStart + sLen);
    
    rawSig = new Uint8Array(64);
    rawSig.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    rawSig.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  } else {
    rawSig = sigArray;
  }

  const sigB64 = uint8ArrayToBase64Url(rawSig);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function encryptPayload(
  payload: string,
  subscriptionPubKey: string,
  subscriptionAuth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const subscriberPubKeyBytes = base64UrlToUint8Array(subscriptionPubKey);
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  const authBytes = base64UrlToUint8Array(subscriptionAuth);
  const encoder = new TextEncoder();

  // PRK = HKDF-Extract(salt=auth, IKM=sharedSecret)
  const authKey = await crypto.subtle.importKey("raw", authBytes, { name: "HKDF" }, false, ["deriveBits"]);
  // We need a different approach - use HMAC for HKDF
  const prkKey = await crypto.subtle.importKey("raw", authBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // Info for content encryption key
  const contentInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: aes128gcm\0"),
  ]);
  
  const nonceInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: nonce\0"),
  ]);

  // Derive CEK using HKDF with salt
  const prkImport = await crypto.subtle.importKey("raw", prk, { name: "HKDF" }, false, ["deriveBits"]);
  
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: contentInfo },
    prkImport,
    128
  );
  const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);

  const nonceBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      prkImport,
      96
    )
  );

  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits },
      cek,
      paddedPayload
    )
  );

  // Build aes128gcm header + encrypted content
  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, encrypted.length + 86);
  
  const header = new Uint8Array(86 + encrypted.length);
  header.set(salt, 0); // 16 bytes salt
  header.set(new Uint8Array(recordSize.buffer), 16); // 4 bytes record size
  header[20] = 65; // key id length (65 bytes for uncompressed P-256)
  header.set(localPublicKeyRaw, 21); // 65 bytes local public key
  header.set(encrypted, 86); // encrypted payload

  return { encrypted: header, salt, localPublicKey: localPublicKeyRaw };
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

    const { professional_id, title, body, url, notification_type } = await req.json();

    if (!professional_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPID keys
    const { data: vapidData } = await supabaseAdmin
      .from("vapid_keys")
      .select("*")
      .limit(1)
      .single();

    if (!vapidData) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("professional_id", professional_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { privateKey, publicKeyRaw } = await importVapidKeys(
      vapidData.public_key,
      vapidData.private_key
    );

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const jwt = await createJwt(sub.endpoint, privateKey);
        const payloadJson = JSON.stringify({ title, body, url: url || "/dashboard", icon: "/pwa-192x192.png" });
        
        const { encrypted } = await encryptPayload(payloadJson, sub.p256dh, sub.auth);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `vapid t=${jwt}, k=${uint8ArrayToBase64Url(publicKeyRaw)}`,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          failed++;
        } else {
          console.error(`Push failed for ${sub.id}: ${response.status} ${await response.text()}`);
          failed++;
        }
      } catch (err) {
        console.error(`Error sending to ${sub.id}:`, err);
        failed++;
      }
    }

    // Log the notification
    await supabaseAdmin.from("push_notification_log").insert({
      professional_id,
      title,
      body,
      notification_type: notification_type || "engagement",
      url,
    });

    return new Response(
      JSON.stringify({ sent, failed }),
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
