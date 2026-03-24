/**
 * 极空间 — 删除文件或目录
 *
 * POST /v2/file/remove (form-encoded)
 * Params: paths[]=... (supports multiple)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetchRaw, buildPathsBody } from './common.js';

cli({
  site: 'zconnect',
  name: 'rm',
  description: '删除极空间文件或目录（移入回收站）',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', required: true, positional: true, help: '要删除的文件/目录路径 (支持多个，逗号分隔)' },
  ],
  columns: ['path', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const pathInput: string = kwargs.path;
    const paths = pathInput.split(',').map((p: string) => p.trim()).filter(Boolean);

    if (paths.length === 0) throw new Error('请指定至少一个路径');

    const body = buildPathsBody(paths);
    const resp = await zosFetchRaw(page, '/v2/file/remove', body);

    const taskId = resp.data?.task?.id;
    return paths.map(p => ({
      path: p,
      status: `已删除${taskId ? ` (任务 #${taskId})` : ''}`,
    }));
  },
});
