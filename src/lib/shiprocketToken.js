import { upstash } from "./upstashClient";

const TOKEN_KEY = "shiprocket:token";
const EXPIRY_KEY = "shiprocket:token_expiry";
const LOCK_KEY = "shiprocket:refresh_lock";

let inProcessRefresh = null; // dedupe in same lambda/process

async function fetchNewTokenFromShiprocket() {
  const res = await fetch(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shiprocket auth failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  
  const token = data.token;
  const expiresIn = data.expires_in ?? 7 * 24 * 3600; 

  if (!token) throw new Error("No token returned from Shiprocket");

  // safety buffer: subtract 2 minutes
  const expiryTimestamp = Date.now() + expiresIn * 1000 - 2 * 60 * 1000;
  return { token, expiry: expiryTimestamp, expiresIn };
}

async function saveTokenToUpstash(token, expiry) {
  
  await Promise.all([
    upstash.set(TOKEN_KEY, token),
    upstash.set(EXPIRY_KEY, String(expiry)),
  ]);
}

async function readTokenFromUpstash() {
  const [token, expiryStr] = await Promise.all([
    upstash.get(TOKEN_KEY),
    upstash.get(EXPIRY_KEY),
  ]);
  return { token, expiry: expiryStr ? Number(expiryStr) : 0 };
}

// Acquire simple lock using SET with NX and PX (ms)
async function acquireLock(ttlMs = 10000) {
  const res = await upstash.set(LOCK_KEY, "1", { nx: true, px: ttlMs });
  // upstash returns true on success, null on failure (older lib); adjust if needed
  return Boolean(res);
}
async function releaseLock() {
  await upstash.del(LOCK_KEY);
}

export async function getShiprocketToken() {
  // Fast read
  const { token, expiry } = await readTokenFromUpstash();
  if (token && Date.now() < expiry) return token;

  // If there's already an in-process refresh, wait for it
  if (inProcessRefresh) return inProcessRefresh;

  // Create refresh promise to dedupe concurrent calls in same process
  inProcessRefresh = (async () => {
    try {
      const gotLock = await acquireLock(15000); // 15s lock
      if (!gotLock) {
        // someone else is refreshing (other instance) — wait briefly then read again
        await new Promise((r) => setTimeout(r, 700));
        const again = await readTokenFromUpstash();
        if (again.token && Date.now() < again.expiry) return again.token;
        // if still not available, fall through to try fetching (rare)
      }

      // fetch new token from Shiprocket
      const { token: newToken, expiry: newExpiry } =
        await fetchNewTokenFromShiprocket();
      await saveTokenToUpstash(newToken, newExpiry);
      return newToken;
    } finally {
      inProcessRefresh = null;
      try {
        await releaseLock();
      } catch (e) {
        /* ignore lock release errors */
      }
    }
  })();

  return inProcessRefresh;
}
