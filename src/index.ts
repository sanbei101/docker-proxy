import { Hono } from 'hono';
import { env } from 'hono/adapter';

import { parseRegistryPath, parseWwwAuthenticate, fetchRegistryToken } from './utils';

const app = new Hono();

app.get('/v2/*', async (c) => {
  const { DOCKER_USERNAME, DOCKER_TOKEN, GHCR_USERNAME, GHCR_TOKEN } = env<{
    DOCKER_USERNAME?: string;
    DOCKER_TOKEN?: string;
    GHCR_USERNAME?: string;
    GHCR_TOKEN?: string;
  }>(c);

  const path = new URL(c.req.url).pathname;
  const config = parseRegistryPath(path);

  if (!config) {
    return new Response('Invalid path', { status: 400 });
  }

  const { registry, repository, operation, reference, registryConfig } = config;
  const backendUrl = `${registryConfig.backend}/v2/${repository}/${operation}/${reference}`;

  console.log(`Proxying: ${path} → ${backendUrl}`);

  let reqHeaders = new Headers(c.req.header());
  let res = await fetch(backendUrl, { method: 'GET', headers: reqHeaders });

  if (res.status === 401) {
    const wwwAuth = res.headers.get('www-authenticate') || '';
    const authParams = parseWwwAuthenticate(wwwAuth);

    if (!authParams) {
      return new Response('Unauthorized - Invalid WWW-Authenticate', { status: 401 });
    }

    let targetUser = registry === 'ghcr.io' ? GHCR_USERNAME : DOCKER_USERNAME;
    let targetToken = registry === 'ghcr.io' ? GHCR_TOKEN : DOCKER_TOKEN;

    const token = await fetchRegistryToken(
      registryConfig.auth,
      authParams.service,
      authParams.scope,
      targetUser,
      targetToken,
    );

    if (!token) {
      return new Response('Auth failed to retrieve token', { status: 502 });
    }

    reqHeaders.set('Authorization', `Bearer ${token}`);
    res = await fetch(backendUrl, { method: 'GET', headers: reqHeaders });
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
});

app.get('/', (c) => c.text('hello hono'));

export default app;
