import { Hono } from 'hono';
const DOCKER_REGISTRY = 'https://registry-1.docker.io';
const DOCKER_AUTH = 'https://auth.docker.io/token';
type Bindings = {
  DOCKER_USERNAME: string;
  DOCKER_TOKEN: string;
};
const app = new Hono<{ Bindings: Bindings }>();
// 工具函数:将裸镜像名(如 nginx)重写为 library/nginx
function rewritePath(path: string): string {
  if (path.startsWith('/v2/library/')) return path;

  const parts = path.split('/');
  if (parts.length !== 5) return path;
  if (parts[3] !== 'manifests' && parts[3] !== 'blobs') return path;

  return `/v2/library/${parts[2]}/${parts[3]}/${parts[4]}`;
}
app.get('/v2/*', async (c) => {
  const path = new URL(c.req.url).pathname;
  const rewrittenPath = rewritePath(path);
  console.log(`origin path: ${path} -> rewrite path: ${rewrittenPath}`);
  const url = `${DOCKER_REGISTRY}${rewrittenPath}`;
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

    const authHeader = 'Basic ' + btoa(`${c.env.DOCKER_USERNAME}:${c.env.DOCKER_TOKEN}`);
    const tokenUrl = `${DOCKER_AUTH}?${queryParams.toString()}`;
    console.log('token url:', tokenUrl);
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        Authorization: authHeader
      }
    });

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
    statusText: res.statusText,
    headers: res.headers
  });
});
app.get('/', (c) => {
  return c.text('Hello Hono!');
});

export default app;
