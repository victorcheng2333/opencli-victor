/**
 * 极空间 — 下载文件或文件夹到本地
 *
 * GET /v2/file/download?path={path}&webagent=v2&request_purpose=5
 * Uses cookie authentication for streaming binary download.
 * For directories, recursively lists and downloads all files.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { httpDownload, sanitizeFilename } from '../../download/index.js';
import { DownloadProgressTracker } from '../../download/progress.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize, resolvePath } from './common.js';

/** Get file/dir info via API */
async function getInfo(page: IPage, remotePath: string): Promise<any> {
  const resp = await zosFetch(page, '/v2/file/info', { path: remotePath });
  return resp.data;
}

/** Recursively collect all files in a directory */
async function listAllFiles(page: IPage, dirPath: string): Promise<Array<{ path: string; name: string; size: string }>> {
  const resp = await zosFetch(page, '/v2/file/list', { path: dirPath, show_hidden: '0' });
  const list = resp.data?.list || [];
  const files: Array<{ path: string; name: string; size: string }> = [];

  for (const item of list) {
    if (item.is_dir === '1') {
      const subFiles = await listAllFiles(page, item.path);
      files.push(...subFiles);
    } else {
      files.push({ path: item.path, name: item.name, size: item.size });
    }
  }
  return files;
}

cli({
  site: 'zconnect',
  name: 'download',
  description: '从极空间下载文件或文件夹到本地',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', required: true, positional: true, help: '文件/目录路径，支持相对路径如 test/a.mp4' },
    { name: 'output', default: '', help: '本地输出目录 (默认 ~/Downloads/zspace)' },
    { name: 'name', default: '', help: '自定义文件名 (仅单文件时有效)' },
  ],
  columns: ['file', 'size', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const remotePath = resolvePath(kwargs.path);
    const outputDir: string = kwargs.output || path.join(os.homedir(), 'Downloads', 'zspace');
    const customName: string = kwargs.name || '';

    const info = await getInfo(page, remotePath);

    // Get cookies for HTTP download
    const cookieString = await page.evaluate(`document.cookie`) as string;

    // Single file download
    if (info.is_dir !== '1') {
      const originalName = info.name || path.basename(remotePath);
      const fileName = customName || sanitizeFilename(originalName);
      fs.mkdirSync(outputDir, { recursive: true });
      const destPath = path.join(outputDir, fileName);

      const downloadParams = new URLSearchParams({ path: remotePath, webagent: 'v2', request_purpose: '5' });
      const downloadUrl = `https://${ZCONNECT_DOMAIN}/v2/file/download?${downloadParams.toString()}`;

      const tracker = new DownloadProgressTracker(1, true);
      const progressBar = tracker.onFileStart(fileName, 0);

      const result = await httpDownload(downloadUrl, destPath, {
        cookies: cookieString,
        timeout: 600000,
        onProgress: (received, total) => { if (progressBar) progressBar.update(received, total); },
      });

      if (progressBar) progressBar.complete(result.success);
      tracker.onFileComplete(result.success);

      return [{
        file: fileName,
        size: formatSize(result.size),
        status: result.success ? '下载完成' : `失败: ${result.error}`,
      }];
    }

    // Directory download — recursively list all files
    const dirName = info.name || path.basename(remotePath);
    console.error(`正在扫描目录: ${dirName} ...`);
    const allFiles = await listAllFiles(page, remotePath);

    if (allFiles.length === 0) {
      return [{ file: dirName, size: '-', status: '空目录，无文件可下载' }];
    }

    console.error(`共 ${allFiles.length} 个文件，开始下载...`);
    const tracker = new DownloadProgressTracker(allFiles.length, true);
    const results: Array<{ file: string; size: string; status: string }> = [];
    const baseDir = remotePath; // strip this prefix to get relative paths

    for (let i = 0; i < allFiles.length; i++) {
      const f = allFiles[i];
      // Preserve directory structure: /sata1/.../dir/sub/file.txt → dir/sub/file.txt
      const relativePath = f.path.startsWith(baseDir)
        ? f.path.slice(baseDir.length + 1)
        : f.name;
      const localDir = path.join(outputDir, dirName, path.dirname(relativePath));
      fs.mkdirSync(localDir, { recursive: true });
      const destPath = path.join(outputDir, dirName, relativePath);
      const displayName = relativePath;

      const downloadParams = new URLSearchParams({ path: f.path, webagent: 'v2', request_purpose: '5' });
      const downloadUrl = `https://${ZCONNECT_DOMAIN}/v2/file/download?${downloadParams.toString()}`;

      const progressBar = tracker.onFileStart(displayName, i);
      const result = await httpDownload(downloadUrl, destPath, {
        cookies: cookieString,
        timeout: 600000,
        onProgress: (received, total) => { if (progressBar) progressBar.update(received, total); },
      });

      if (progressBar) progressBar.complete(result.success);
      tracker.onFileComplete(result.success);

      results.push({
        file: displayName,
        size: formatSize(result.size),
        status: result.success ? '下载完成' : `失败: ${result.error}`,
      });
    }

    return results;
  },
});
