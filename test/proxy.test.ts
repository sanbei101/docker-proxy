import { execSync } from 'child_process';

import { serve, type ServerType } from '@hono/node-server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import app from '../src/index';

describe('Docker Proxy 真实 Docker Pull 终端集成测试', () => {
  let server: ServerType | undefined;
  const TEST_PORT = 8787;
  const PROXY_URL = `localhost:${TEST_PORT}`;

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      server = serve(
        {
          fetch: app.fetch,
          port: TEST_PORT,
        },
        (info) => {
          console.log(
            `\n🚀 测试中转服务器已在真实端口启动: http://localhost:${info.port}`,
          );
          resolve();
        },
      );
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
      console.log('\n🛑 测试中转服务器已关闭');
    }
  });

  it('应该能通过代理成功 pull 官方 Docker Hub 的 alpine 镜像', () => {
    console.log('正在执行: docker pull alpine...');

    execSync(`docker rmi ${PROXY_URL}/alpine:latest`, { stdio: 'ignore' });

    const output = execSync(`docker pull ${PROXY_URL}/alpine:latest`, {
      encoding: 'utf8',
    });

    expect(output).toContain('Downloaded newer image');
    console.log('✅ Docker Hub 镜像真实拉取成功！');
  });

  it('应该能通过代理成功 pull GHCR 的镜像', () => {
    console.log('正在执行: docker pull linuxcontainers/alpine...');

    execSync(`docker rmi ${PROXY_URL}/ghcr.io/linuxcontainers/alpine:latest`, {
      stdio: 'ignore',
    });

    const output = execSync(
      `docker pull ${PROXY_URL}/ghcr.io/linuxcontainers/alpine:latest`,
      { encoding: 'utf8' },
    );

    expect(output).toContain('Status: Downloaded');
    console.log('✅ GHCR 镜像真实拉取成功！');
  });
});
