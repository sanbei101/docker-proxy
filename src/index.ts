import { Hono } from "hono";

const app = new Hono();

export function MakeTargetUrl(workerUrl: string): string {
  const { pathname, search } = new URL(workerUrl);
  const targetUrl = decodeURIComponent((pathname + search).slice(1));
  console.log("Target URL:", targetUrl);
  return targetUrl;
}

app.get("*", async (c) => {
  const targetUrl = MakeTargetUrl(c.req.url);
  if (!targetUrl) {
    return c.text("Invalid Target URL", 400);
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    return c.text("Invalid Target URL", 400);
  }

  const newReq = new Request(targetUrl, {
    method: c.req.method,
    headers: c.req.raw.headers,
  });

  const resp = await fetch(newReq);

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers,
  });
});

export default app;
