import { expect, test } from 'vitest';
import { rewritePath } from './src/index';
type Case = {
  input: string;
  expected: string;
};
const cases: Case[] = [
  {
    input: '/v2/library/nginx/manifests/latest',
    expected: '/v2/library/nginx/manifests/latest'
  },
  {
    input: '/v2/nginx/manifests/latest',
    expected: '/v2/library/nginx/manifests/latest'
  },
  {
    input: '/v2/someuser/somerepo/manifests/latest',
    expected: '/v2/someuser/somerepo/manifests/latest'
  },
  {
    input: '/v2/redis/blobs/sha256:abcd1234',
    expected: '/v2/library/redis/blobs/sha256:abcd1234'
  },
  {
    input: '/v2/ghcr.io/linuxserver/nginx/manifests/latest',
    expected: '/v2/linuxserver/nginx/manifests/latest'
  },
  {
    input: '/v2/ghcr.io/myusername/myapp/manifests/latest',
    expected: '/v2/myusername/myapp/manifests/latest'
  },
  {
    input: '/v2/gcr.io/distroless/static-debian12/manifests/nonroot',
    expected: '/v2/distroless/static-debian12/manifests/nonroot'
  }
];

test('rewritePath function', () => {
  for (const c of cases) {
    const result = rewritePath(c.input);
    expect(result).toBe(c.expected);
  }
});
