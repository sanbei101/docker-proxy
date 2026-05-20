import { exec as cbExec } from 'node:child_process';
import { promisify } from 'node:util';

import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import app from '../src/index';

const exec = promisify(cbExec);

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

  it(
    '应该能通过代理成功 pull 官方 Docker Hub 的 alpine 镜像',
    async () => {
      console.log('正在执行: docker pull alpine...');

      try {
        await exec(`docker rmi -f ${PROXY_URL}/alpine:latest`);
      } catch {}

      const { stdout, stderr } = await exec(
        `docker pull ${PROXY_URL}/alpine:latest`,
      );
      console.log('Docker Pull 输出:', stdout);
      if (stderr) {
        console.error('Docker Pull 错误:', stderr);
      }
      expect(stdout).toContain('Status:');
      expect(stdout).toContain('Digest:');
      console.log('✅ Docker Hub 镜像真实拉取成功!');
    },
    10 * 1000,
  );

  it(
    '应该能通过代理成功 pull GHCR 的镜像',
    async () => {
      console.log('正在执行: docker pull linuxcontainers/alpine...');

      try {
        await exec(
          `docker rmi -f ${PROXY_URL}/ghcr.io/linuxcontainers/alpine:latest`,
        );
      } catch {}

      const { stdout, stderr } = await exec(
        `docker pull ${PROXY_URL}/ghcr.io/linuxcontainers/alpine:latest`,
      );

      if (stderr) {
        console.error('Docker Pull 错误:', stderr);
      }
      expect(stdout).toContain('Status:');
      expect(stdout).toContain('Digest:');
      console.log('✅ GHCR 镜像真实拉取成功!');
    },
    10 * 1000,
  );
});
