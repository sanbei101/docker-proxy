import { Hono } from 'hono';
import { env } from 'hono/adapter';

export type RegistryConfig = {
  backend: string;
  auth: string;
};
export type ParsePathResult = {
  registry: string; // registry-1.docker.io, ghcr.io, gcr.io, etc.
  repository: string; // library/nginx, namespace/<name>, etc.
  operation: 'manifests' | 'blobs';
  reference: string; // tag or digest
  registryConfig: RegistryConfig;
};

export const REGISTRY_CONFIG = new Map<string, RegistryConfig>([
  [
    'registry-1.docker.io',
    {
      backend: 'https://registry-1.docker.io',
      auth: 'https://auth.docker.io/token'
    }
  ],
  [
    'ghcr.io',
    {
      backend: 'https://ghcr.io',
      auth: 'https://ghcr.io/token'
    }
  ]
]);
const app = new Hono();
const KNOWN_REGISTRIES = new Set(['ghcr.io', 'gcr.io', 'quay.io', 'registry-1.docker.io', 'docker.io']);

export function ParsePath(path: string): ParsePathResult | null {
  if (!path.startsWith('/v2/')) return null;

  const parts = path.split('/').filter(Boolean); //去除第一个''
  if (parts.length < 4 || parts[0] !== 'v2') return null;

  const operationIndex = parts.length - 2;
  const operation = parts[operationIndex];
  if (operation !== 'manifests' && operation !== 'blobs') return null;

  const reference = parts[parts.length - 1];

  const firstSegment = parts[1];
  let registryKey: string;
  let repoStartIndex: number;

  if (KNOWN_REGISTRIES.has(firstSegment)) {
    // 标准化 docker.io → registry-1.docker.io
    registryKey = firstSegment === 'docker.io' ? 'registry-1.docker.io' : firstSegment;
    repoStartIndex = 2;
  } else {
    // 默认为 Docker Hub
    registryKey = 'registry-1.docker.io';
    repoStartIndex = 1;
  }

  const config = REGISTRY_CONFIG.get(registryKey);
  if (!config) return null;

  const repoParts = parts.slice(repoStartIndex, operationIndex);
  let repository: string;
  if (registryKey === 'registry-1.docker.io' && repoParts.length === 1) {
    repository = `library/${repoParts[0]}`;
  } else {
    repository = repoParts.join('/');
  }

  return {
    registry: registryKey,
    repository,
    operation,
    reference,
    registryConfig: config
  };
}

app.get('/v2/*', async (c) => {
  const { DOCKER_USERNAME } = env<{ DOCKER_USERNAME: string }>(c);
  if (!DOCKER_USERNAME) {
    console.warn('DOCKER_USERNAME is not set');
  }
  const { DOCKER_TOKEN } = env<{ DOCKER_TOKEN: string }>(c);
  if (!DOCKER_TOKEN) {
    console.warn('DOCKER_TOKEN is not set');
  }
  const { GITHUB_USERNAME } = env<{ GITHUB_USERNAME: string }>(c);

  const { GITHUB_TOKEN } = env<{ GITHUB_TOKEN: string }>(c);

  const path = new URL(c.req.url).pathname;
  let header = c.req.header();
  const config = ParsePath(path);

  if (!config) {
    return new Response('Invalid path', { status: 400 });
  }

  const { registry, repository, operation, reference, registryConfig } = config;

  // 构造后端请求路径和 URL
  const backendPath = `/v2/${repository}/${operation}/${reference}`;
  const backendUrl = `${registryConfig.backend}${backendPath}`;

  console.log(`Proxying: ${path} → ${backendUrl}`);

  let res = await fetch(backendUrl, { method: 'GET', headers: header });

  // 处理 401 认证挑战
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
    const scope = params.get('scope');
    if (!service || !scope) {
      return new Response('Bad Gateway: missing service or scope', { status: 502 });
    }

    let authHeader: string;
    switch (registry) {
      case 'registry-1.docker.io':
        authHeader = 'Basic ' + btoa(`${DOCKER_USERNAME}:${DOCKER_TOKEN}`);
        break;
      case 'ghcr.io':
        authHeader = 'Basic ' + btoa(`${GITHUB_USERNAME}:${GITHUB_TOKEN}`);
        break;
      default:
        return new Response('Registry not supported for auth', { status: 501 });
    }
    const queryParams = new URLSearchParams({
      service: service,
      scope: scope
    });
    const tokenUrl = `${registryConfig.auth}?${queryParams.toString()}`;
    console.log('Token URL:', tokenUrl);

    const tokenRes = await fetch(tokenUrl, {
      headers: { Authorization: authHeader }
    });

    if (!tokenRes.ok) {
      console.error('Token fetch failed:', await tokenRes.text());
      return new Response('Auth failed', { status: tokenRes.status });
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token || tokenData.access_token;
    if (!token) {
      return new Response('Invalid token response', { status: 502 });
    }
    header['Authorization'] = `Bearer ${token}`;
    res = await fetch(backendUrl, {
      headers: header
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
