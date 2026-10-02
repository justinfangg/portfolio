// All-time baskets made by every visitor, stored in Upstash Redis.
//
// Setup on Vercel: Project → Storage → add "Upstash for Redis" (free tier) and
// connect it to this project. That sets the env vars read below. Without them
// (e.g. local dev) the count is kept in memory and resets on server restart.

const KEY = "shots:made";
const COOLDOWN_MS = 700; // one basket per visitor per this window, to slow spam

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

let memoryCount = 0;
const memoryCooldowns = new Map<string, number>();

async function redis(...command: (string | number)[]) {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

function visitorId(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export async function GET() {
  try {
    const count = url && token ? Number((await redis("GET", KEY)) ?? 0) : memoryCount;
    return Response.json({ count });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const id = visitorId(request);
  try {
    if (url && token) {
      // SET NX only succeeds if this visitor's cooldown key doesn't exist yet.
      const allowed = await redis("SET", `shots:cooldown:${id}`, 1, "NX", "PX", COOLDOWN_MS);
      if (!allowed) return Response.json({ count: Number(await redis("GET", KEY)) }, { status: 429 });
      return Response.json({ count: await redis("INCR", KEY) });
    }

    const now = Date.now();
    if (now - (memoryCooldowns.get(id) ?? 0) < COOLDOWN_MS) {
      return Response.json({ count: memoryCount }, { status: 429 });
    }
    memoryCooldowns.set(id, now);
    return Response.json({ count: ++memoryCount });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
