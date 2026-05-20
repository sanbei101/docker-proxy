import { REGISTRY_CONFIG, KNOWN_REGISTRIES, RegistryConfig } from './config';

export type ParsePathResult = {
  registry: string;
  repository: string;
  operation: 'manifests' | 'blobs';
  reference: string;
  registryConfig: RegistryConfig;
};

export type DockerProxyRequest = {
  registryHost: string; // 例如: 'registry-1.docker.io'
  repository: string; // 例如: 'library/ubuntu' 或 'owner/repo'
  resourceType: 'manifests' | 'blobs';
  tagOrDigest: string; // 标签或哈希值
  upstreamConfig: RegistryConfig; // 上游配置
};

export function parseRegistryPath(path: string): ParsePathResult | null {
  if (!path.startsWith('/v2/')) return null;

  const parts = path.split('/').filter(Boolean);
  if (parts.length < 4 || parts[0] !== 'v2') return null;

  const operationIndex = parts.length - 2;
  const operation = parts[operationIndex] as 'manifests' | 'blobs';
  if (operation !== 'manifests' && operation !== 'blobs') return null;

  const reference = parts[parts.length - 1];
  const firstSegment = parts[1];

  let registryKey = 'registry-1.docker.io';
  let repoStartIndex = 1;

  if (KNOWN_REGISTRIES.has(firstSegment)) {
    registryKey = firstSegment === 'docker.io' ? 'registry-1.docker.io' : firstSegment;
    repoStartIndex = 2;
  }

  const config = REGISTRY_CONFIG.get(registryKey);
  if (!config) return null;

  const repoParts = parts.slice(repoStartIndex, operationIndex);
  const repository =
    registryKey === 'registry-1.docker.io' && repoParts.length === 1
      ? `library/${repoParts[0]}`
      : repoParts.join('/');

  return { registry: registryKey, repository, operation, reference, registryConfig: config };
}

export function parseWwwAuthenticate(header: string): { service: string; scope: string } | null {
  if (!header || !header.startsWith('Bearer ')) return null;

  const params = new Map<string, string>();
  for (const part of header.substring(7).split(',')) {
    const [key, value] = part.split('=');
    params.set(key.trim(), value?.replace(/"/g, '').trim() || '');
  }

  const service = params.get('service');
  const scope = params.get('scope');

  if (!service || !scope) return null;
  return { service, scope };
}

export async function fetchRegistryToken(
  authUrl: string,
  service: string,
  scope: string,
  username?: string,
  token?: string,
): Promise<string | null> {
  const queryParams = new URLSearchParams({ service, scope });
  const tokenUrl = `${authUrl}?${queryParams.toString()}`;

  const fetchOptions: RequestInit = { method: 'GET', headers: new Headers() };

  if (username && token) {
    const basicAuth = 'Basic ' + btoa(`${username}:${token}`);
    (fetchOptions.headers as Headers).set('Authorization', basicAuth);
  }

  try {
    const tokenRes = await fetch(tokenUrl, fetchOptions);
    if (!tokenRes.ok) {
      console.error('Token fetch failed:', tokenRes.status, await tokenRes.text());
      return null;
    }

    const data = (await tokenRes.json()) as { token?: string; access_token?: string };
    return data.token || data.access_token || null;
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
}
