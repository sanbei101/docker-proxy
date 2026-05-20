export type RegistryConfig = {
  backend: string;
  auth: string;
};

export const REGISTRY_CONFIG = new Map<string, RegistryConfig>([
  [
    'registry-1.docker.io',
    {
      backend: 'https://registry-1.docker.io',
      auth: 'https://auth.docker.io/token',
    },
  ],
  [
    'ghcr.io',
    {
      backend: 'https://ghcr.io',
      auth: 'https://ghcr.io/token',
    },
  ],
]);

export const KNOWN_REGISTRIES = new Set([
  'ghcr.io',
  'registry-1.docker.io',
  'docker.io',
]);
