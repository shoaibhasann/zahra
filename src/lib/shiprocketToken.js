import { upstash } from "./upstashClient";
import { randomUUID } from "crypto";
import axios from "axios";

const TOKEN_KEY = "shiprocket:token";
const EXPIRY_KEY = "shiprocket:token_expiry";
const LOCK_KEY = "shiprocket:refresh_lock";

let inProcessRefresh = null; // in-process dedupe

// --- helpers to normalize Upstash REST client responses ---
// Some versions return true/null, some return object like { result: "OK" }, sometimes string.
// This helper returns true when SET with NX succeeded.
function isSetSuccess(res) {
  if (res === true) return true;
  if (res === "OK") return true;
  if (res && typeof res === "object") {
    if (res.result === "OK" || res.result === true) return true;
    if (res.hasOwnProperty("result") && res.result != null) return true;
  }
  return false;
}


function normalizeGetResponse(res) {
  if (res === null || res === undefined) return null;
  if (typeof res === "object" && "result" in res) return res.result;
  return res;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


function jitter(value) {
  return Math.floor(value * (0.5 + Math.random() * 1.0)); // 0.5x - 1.5x
}


async function fetchNewTokenFromShiprocket() {
  try {
    const res = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
        validateStatus: () => true,
      }
    );

    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        `Shiprocket auth failed: ${res.status} ${JSON.stringify(res.data)}`
      );
    }

    const data = res.data;
    const token = data.token;
    const expiresIn = data.expires_in ?? 7 * 24 * 3600;

    if (!token) {
      throw new Error("No token returned from Shiprocket");
    }

    // safety buffer: subtract 2 minutes
    const expiryTimestamp = Date.now() + expiresIn * 1000 - 2 * 60 * 1000;

    return { token, expiry: expiryTimestamp, expiresIn };
  } catch (err) {
    console.error("Shiprocket auth error:", err);
    throw err;
  }
}


async function saveTokenToUpstash(token, expiry) {
  await Promise.all([
    upstash.set(TOKEN_KEY, token),
    upstash.set(EXPIRY_KEY, String(expiry)),
  ]);
}

async function readTokenFromUpstash() {

  const [rawToken, rawExpiry] = await Promise.all([
    upstash.get(TOKEN_KEY),
    upstash.get(EXPIRY_KEY),
  ]);

  const token = normalizeGetResponse(rawToken);
  const expiryStr = normalizeGetResponse(rawExpiry);
  
  return { token, expiry: expiryStr ? Number(expiryStr) : 0 };
}

/**
 * Acquire a lock with an ownerId (value). Returns ownerId if lock acquired, else null.
 * Uses SET with NX and PX via upstash.set(key, value, { nx: true, px: ttlMs })
 */
async function acquireLock(ttlMs = 30000) {
  const ownerId = randomUUID();
  // call set NX PX
  const res = await upstash.set(LOCK_KEY, ownerId, { nx: true, px: ttlMs });
  if (isSetSuccess(res)) return ownerId;
  return null;
}

/**
 * Release lock only if ownerId matches.
 * This implementation uses GET + DEL. It's not strictly atomic, but with owner-check it's safer than blind DEL.
 * If you need perfect atomicity, Upstash supports EVAL / Lua scripts in some environments — replace this with an EVAL that checks & deletes atomically.
 */
async function releaseLock(ownerId) {
  if (!ownerId) return;
  try {
    const raw = await upstash.get(LOCK_KEY);
    const current = normalizeGetResponse(raw);
    if (current === ownerId) {
      await upstash.del(LOCK_KEY);
    }
  } catch (e) {
    // ignore but consider logging
    console.warn("releaseLock error", e);
  }
}

export async function getShiprocketToken() {
  // 1) fast read
  const { token, expiry } = await readTokenFromUpstash();
  if (token && Date.now() < expiry) {
    return token;
  }

  // 2) in-process dedupe
  if (inProcessRefresh) return inProcessRefresh;

  // 3) create refresh promise
  inProcessRefresh = (async () => {
    let ownerId = null;
    try {
      // Retry loop: attempt to acquire lock with backoff + jitter
      const maxAttempts = 5;
      let attempt = 0;
      const baseDelay = 200; // ms

      while (attempt < maxAttempts) {
        attempt++;
        ownerId = await acquireLock(30000); // 30s TTL
        if (ownerId) break; // acquired
        // not acquired -> wait with backoff + jitter and re-check token
        const delay = jitter(baseDelay * Math.pow(2, attempt - 1));
        await sleep(delay);

        // re-check token after waiting (maybe other instance finished)
        const again = await readTokenFromUpstash();
        if (again.token && Date.now() < again.expiry) {
          return again.token;
        }
        // else loop to try again
      }

      // If still no lock after attempts, do one final re-check and if still nothing, try to fetch anyway
      if (!ownerId) {
        const again = await readTokenFromUpstash();
        if (again.token && Date.now() < again.expiry) return again.token;
        // Fall through to fetching without lock (rare) — but we've waited/backed off a bit
      }

      // We either hold the lock (ownerId) or decided to fetch after retries
      const { token: newToken, expiry: newExpiry } =
        await fetchNewTokenFromShiprocket();
      await saveTokenToUpstash(newToken, newExpiry);
      return newToken;
    } catch (err) {
      // On error, try to return any valid token we can find (graceful fallback)
      try {
        const cached = await readTokenFromUpstash();
        if (cached.token && Date.now() < cached.expiry + 60_000) {
          // allow short 60s grace if token very recently expired
          return cached.token;
        }
      } catch (e) {
        // ignore
      }
      throw err;
    } finally {
      // cleanup
      const ownerToRelease = ownerId;
      inProcessRefresh = null;
      try {
        await releaseLock(ownerToRelease);
      } catch (e) {
        // ignore
      }
    }
  })();

  return inProcessRefresh;
}
