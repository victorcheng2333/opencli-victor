/**
 * 极空间 — 移动文件或目录
 *
 * POST /v2/file/move (form-encoded)
 * Params: paths[]=... (sources), to=... (destination dir)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetchRaw, buildPathsBody } from './common.js';

cli({
  site: 'zconnect',
  name: 'mv',
  description: '移动极空间文件或目录',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'src', required: true, positional: true, help: '源文件/目录路径 (支持多个，逗号分隔)' },
    { name: 'to', required: true, help: '目标目录路径' },
  ],
  columns: ['src', 'to', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const srcInput: string = kwargs.src;
    const destDir: string = kwargs.to;
    const paths = srcInput.split(',').map((p: string) => p.trim()).filter(Boolean);

    if (paths.length === 0) throw new Error('请指定至少一个源路径');

    const body = buildPathsBody(paths, { to: destDir });
    const resp = await zosFetchRaw(page, '/v2/file/move', body);

    const taskId = resp.data?.task?.id;
    return paths.map(p => ({
      src: p,
      to: destDir,
      status: `移动中${taskId ? ` (任务 #${taskId})` : ''}`,
    }));
  },
});
