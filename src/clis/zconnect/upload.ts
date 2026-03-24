/**
 * 极空间 — 上传本地文件到极空间
 *
 * POST /v2/file/create (application/octet-stream)
 * Header 'path' = destination file path on NAS
 * Body = raw file content
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, formatSize } from './common.js';

cli({
  site: 'zconnect',
  name: 'upload',
  description: '上传本地文件到极空间',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'file', required: true, positional: true, help: '本地文件路径' },
    { name: 'dest', default: '/sata1/my/data', help: '极空间目标目录 (默认 /sata1/my/data)' },
    { name: 'name', default: '', help: '自定义目标文件名 (默认使用原文件名)' },
  ],
  columns: ['file', 'size', 'status', 'dest'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const localPath: string = kwargs.file;
    const destDir: string = kwargs.dest || '/sata1/my/data';
    const customName: string = kwargs.name || '';

    // Validate local file exists
    if (!fs.existsSync(localPath)) {
      throw new Error(`本地文件不存在: ${localPath}`);
    }
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      throw new Error('暂不支持上传整个目录，请指定具体文件');
    }

    const fileName = customName || path.basename(localPath);
    const destPath = destDir.endsWith('/') ? `${destDir}${fileName}` : `${destDir}/${fileName}`;
    const fileSize = stat.size;

    // Get cookies from document.cookie (page.getCookies returns empty for zconnect)
    const cookieString = await page.evaluate(`document.cookie`) as string;

    // Read file content
    const fileBuffer = fs.readFileSync(localPath);

    // Upload via HTTPS POST
    const result = await new Promise<{ success: boolean; size: number; data?: any; error?: string }>((resolve) => {
      const rnd = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const url = `/v2/file/create?&rnd=${rnd}&webagent=v2`;

      const req = https.request({
        hostname: ZCONNECT_DOMAIN,
        path: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize,
          'Cookie': cookieString,
          'path': destPath,
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.code === '200') {
              resolve({ success: true, size: fileSize, data: json.data });
            } else {
              resolve({ success: false, size: 0, error: json.msg || 'Unknown error' });
            }
          } catch {
            resolve({ success: false, size: 0, error: `Unexpected response: ${body.slice(0, 200)}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, size: 0, error: err.message });
      });

      req.write(fileBuffer);
      req.end();
    });

    return [{
      file: fileName,
      size: formatSize(result.size),
      status: result.success ? '上传成功' : `失败: ${result.error}`,
      dest: result.success ? destPath : '-',
    }];
  },
});
