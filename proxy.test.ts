import { expect, test } from 'vitest';
import { REGISTRY_CONFIG, type ParsePathResult, ParsePath } from './src/index';

const parseCases: { input: string; expected: ParsePathResult }[] = [
  // ===== DockerHub:裸镜像 =====
  {
    input: '/v2/nginx/manifests/latest',
    expected: {
      registry: 'registry-1.docker.io',
      repository: 'library/nginx',
      operation: 'manifests',
      reference: 'latest',
      registryConfig: REGISTRY_CONFIG.get('registry-1.docker.io')!
    }
  },
  {
    input: '/v2/alpine/blobs/sha256:abc123',
    expected: {
      registry: 'registry-1.docker.io',
      repository: 'library/alpine',
      operation: 'blobs',
      reference: 'sha256:abc123',
      registryConfig: REGISTRY_CONFIG.get('registry-1.docker.io')!
    }
  },
  // ===== DockerHub =====
  {
    input: '/v2/library/ubuntu/manifests/22.04',
    expected: {
      registry: 'registry-1.docker.io',
      repository: 'library/ubuntu',
      operation: 'manifests',
      reference: '22.04',
      registryConfig: REGISTRY_CONFIG.get('registry-1.docker.io')!
    }
  },
  {
    input: '/v2/user/myapp/blobs/sha256:def456',
    expected: {
      registry: 'registry-1.docker.io',
      repository: 'user/myapp',
      operation: 'blobs',
      reference: 'sha256:def456',
      registryConfig: REGISTRY_CONFIG.get('registry-1.docker.io')!
    }
  },

  // ===== GHCR =====
  {
    input: '/v2/ghcr.io/linuxserver/nginx/manifests/latest',
    expected: {
      registry: 'ghcr.io',
      repository: 'linuxserver/nginx',
      operation: 'manifests',
      reference: 'latest',
      registryConfig: REGISTRY_CONFIG.get('ghcr.io')!
    }
  },
  {
    input: '/v2/ghcr.io/myusername/myapp/blobs/sha256:1234',
    expected: {
      registry: 'ghcr.io',
      repository: 'myusername/myapp',
      operation: 'blobs',
      reference: 'sha256:1234',
      registryConfig: REGISTRY_CONFIG.get('ghcr.io')!
    }
  }
];

test('ParsePath function', () => {
  for (const c of parseCases) {
    const result = ParsePath(c.input);
    expect(result).toEqual(c.expected);
  }
});
