import { Hono } from 'hono';
const DOCKER_REGISTRY = 'https://registry-1.docker.io';
const DOCKER_AUTH = 'https://auth.docker.io/token';

const app = new Hono();
app.get('/v2/*', async (c) => {
  const path = new URL(c.req.url).pathname;
  console.log('Proxying path:', path);
  const url = `${DOCKER_REGISTRY}${path}`;
  console.log('Target URL:', url);
  let res = await fetch(url, {
    method: 'GET'
  });
  if (res.status === 401) {
    const wwwAuth = res.headers.get('www-authenticate');
    if (!wwwAuth || !wwwAuth.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    const params = new Map<string, string>();
    for (const part of wwwAuth.substring(7).split(',')) {
      const [key, value] = part.split('=');
      params.set(key.trim(), value?.replace(/"/g, '').trim() || '');
    }
    const service = params.get('service');
    let scope = params.get('scope');
    if (!service || !scope) {
      return new Response('Bad Gateway', { status: 502 });
    }

    const queryParams = new URLSearchParams({
      service: service,
      scope: scope
    });

    const tokenUrl = `${DOCKER_AUTH}?${queryParams.toString()}`;
    const tokenRes = await fetch(tokenUrl);

    if (!tokenRes.ok) {
      return new Response('Auth failed', { status: tokenRes.status });
    }
    const { token } = await tokenRes.json();

    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText
  });
});
app.get('/', (c) => {
  return c.text('Hello Hono!');
});

export default app;
