import { bench, describe } from 'vitest';
function rewritePath(path: string): string {
  if (path.startsWith('/v2/library/')) {
    return path;
  }

  const userRepoMatch = path.match(/^\/v2\/([^/]+)\/([^/]+)\/(manifests|blobs)\/.+$/);
  if (userRepoMatch) {
    return path;
  }

  const officialMatch = path.match(/^\/v2\/([^/]+)\/(.*)$/);
  if (officialMatch) {
    const [_, name, rest] = officialMatch;
    return `/v2/library/${name}/${rest}`;
  }

  return path;
}
function rewritePathversion2(path: string): string {
  if (path.startsWith('/v2/library/')) return path;

  const parts = path.split('/');
  if (parts.length !== 5) return path;
  if (parts[3] !== 'manifests' && parts[3] !== 'blobs') return path;

  return `/v2/library/${parts[2]}/${parts[3]}/${parts[4]}`;
}

const cases = [
  '/v2/library/nginx/manifests/latest',
  '/v2/nginx/manifests/latest',
  '/v2/someuser/somerepo/manifests/latest',
  '/v2/redis/blobs/sha256:abcd1234'
];

describe('rewritePath vs rewritePathversion2', () => {
  bench('regex 版', () => {
    for (const p of cases) rewritePath(p);
  });

  bench('split 版', () => {
    for (const p of cases) rewritePathversion2(p);
  });
});
