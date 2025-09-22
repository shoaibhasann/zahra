import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    "Missing Upstash env vars: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN"
  );
}

export const upstash = new Redis({
  url,
  token,
});