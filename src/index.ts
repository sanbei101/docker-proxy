import { Hono } from 'hono';
const DOCKER_REGISTRY = 'https://registry-1.docker.io';
const DOCKER_AUTH = 'https://auth.docker.io/token';
type Bindings = {
  DOCKER_USERNAME: string;
  DOCKER_TOKEN: string;
};
const app = new Hono<{ Bindings: Bindings }>();
// 工具函数:将裸镜像名(如 nginx)重写为 library/nginx
export function rewritePath(path: string): string {
  if (!path.startsWith('/v2/')) return path;

  const parts = path.split('/').filter((p) => p !== '');
  // 至少需要: v2, ..., manifests|blobs, <ref>
  if (parts.length < 4 || parts[0] !== 'v2') return path;

  const operationIndex = parts.length - 2;
  const operation = parts[operationIndex];
  if (operation !== 'manifests' && operation !== 'blobs') return path;

  // 检查是否以已知 registry 域名开头（第1个路径段）
  const knownRegistries = new Set(['ghcr.io', 'gcr.io', 'quay.io', 'registry-1.docker.io', 'docker.io']);

  const firstSegment = parts[1];
  if (knownRegistries.has(firstSegment)) {
    const repoAndRest = parts.slice(2).join('/');
    return `/v2/${repoAndRest}`;
  }

  const repoParts = parts.slice(1, operationIndex);
  const repoName = repoParts.join('/');
  if (repoParts.length === 1) {
    const ref = parts[parts.length - 1];
    return `/v2/library/${repoName}/${operation}/${ref}`;
  }
  return path;
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
