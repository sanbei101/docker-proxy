import { expect, test } from 'vitest';
function rewritePath(path: string): string {
  if (path.startsWith('/v2/library/')) {
    return path;
  }

  // 匹配 用户名/仓库名/... 的路径
  const userRepoMatch = path.match(/^\/v2\/([^/]+)\/([^/]+)\/(manifests|blobs)\/.+$/);
  if (userRepoMatch) {
    return path;
  }

  // 匹配官方镜像路径:/v2/镜像名/...
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
test('rewritePath function', () => {
  expect(rewritePath('/v2/library/nginx/manifests/latest')).toBe('/v2/library/nginx/manifests/latest');
  expect(rewritePath('/v2/nginx/manifests/latest')).toBe('/v2/library/nginx/manifests/latest');
  expect(rewritePath('/v2/someuser/somerepo/manifests/latest')).toBe('/v2/someuser/somerepo/manifests/latest');
  expect(rewritePath('/v2/redis/blobs/sha256:abcd1234')).toBe('/v2/library/redis/blobs/sha256:abcd1234');
});
test('rewritePathversion2 function', () => {
  expect(rewritePathversion2('/v2/library/nginx/manifests/latest')).toBe('/v2/library/nginx/manifests/latest');
  expect(rewritePathversion2('/v2/nginx/manifests/latest')).toBe('/v2/library/nginx/manifests/latest');
  expect(rewritePathversion2('/v2/someuser/somerepo/manifests/latest')).toBe('/v2/someuser/somerepo/manifests/latest');
  expect(rewritePathversion2('/v2/redis/blobs/sha256:abcd1234')).toBe('/v2/library/redis/blobs/sha256:abcd1234');
});
