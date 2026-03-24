/**
 * 极空间 — 下载文件到本地
 *
 * GET /v2/file/download?path={path}&webagent=v2&request_purpose=5
 * Uses cookie authentication for streaming binary download.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { httpDownload, sanitizeFilename } from '../../download/index.js';
import { DownloadProgressTracker } from '../../download/progress.js';
import { ZCONNECT_DOMAIN, requirePage, formatSize } from './common.js';

cli({
  site: 'zconnect',
  name: 'download',
  description: '从极空间下载文件到本地',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', required: true, positional: true, help: '极空间文件路径 (如 /sata1/my/data/test.mp4)' },
    { name: 'output', default: '.', help: '本地输出目录 (默认当前目录)' },
    { name: 'name', default: '', help: '自定义文件名 (默认使用原文件名)' },
  ],
  columns: ['file', 'size', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const remotePath: string = kwargs.path;
    const outputDir: string = kwargs.output || '.';
    const customName: string = kwargs.name || '';

    // Get file info first
    const fileInfo = await page.evaluate(`
      (async () => {
        const cookies = {};
        document.cookie.split('; ').forEach(c => {
          const i = c.indexOf('=');
          if (i > 0) cookies[c.slice(0, i)] = c.slice(i + 1);
        });
        const params = new URLSearchParams({
          path: ${JSON.stringify(remotePath)},
          token: cookies.zenithtoken || '',
          device_id: cookies.device_id || '',
          version: cookies.version || '',
          plat: 'web',
          _l: cookies._l || 'zh_cn',
          device: decodeURIComponent(cookies.device || 'Mac'),
        });
        const rnd = Date.now() + '_' + Math.floor(Math.random() * 10000);
        const res = await fetch('/v2/file/info?&rnd=' + rnd + '&webagent=v2', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        return res.json();
      })()
    `) as any;

    if (fileInfo.code !== '200') {
      throw new Error(`文件不存在或无权访问: ${fileInfo.msg || remotePath}`);
    }

    const info = fileInfo.data;
    if (info.is_dir === '1') {
      throw new Error('暂不支持下载整个目录，请指定具体文件路径');
    }

    // Determine output file name
    const originalName = info.name || path.basename(remotePath);
    const fileName = customName || sanitizeFilename(originalName);
    fs.mkdirSync(outputDir, { recursive: true });
    const destPath = path.join(outputDir, fileName);

    // Get cookies from document.cookie (page.getCookies returns empty for zconnect)
    const cookieString = await page.evaluate(`document.cookie`) as string;

    // Construct download URL
    const downloadParams = new URLSearchParams({
      path: remotePath,
      webagent: 'v2',
      request_purpose: '5',
    });
    const downloadUrl = `https://${ZCONNECT_DOMAIN}/v2/file/download?${downloadParams.toString()}`;

    const fileSize = parseInt(info.size || '0', 10);
    const tracker = new DownloadProgressTracker(1, true);
    const progressBar = tracker.onFileStart(fileName, 0);

    const result = await httpDownload(downloadUrl, destPath, {
      cookies: cookieString,
      timeout: 600000, // 10 minutes for large files
      onProgress: (received, total) => {
        if (progressBar) progressBar.update(received, total);
      },
    });

    if (progressBar) progressBar.complete(result.success);
    tracker.onFileComplete(result.success);

    return [{
      file: fileName,
      size: formatSize(result.size),
      status: result.success ? '下载完成' : `失败: ${result.error}`,
      path: result.success ? path.resolve(destPath) : '-',
    }];
  },
});
