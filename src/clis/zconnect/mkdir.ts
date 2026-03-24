/**
 * 极空间 — 创建目录
 *
 * POST /v2/file/newdir (form-encoded)
 * Params: path (parent dir), name (new dir name)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, resolvePath } from './common.js';

cli({
  site: 'zconnect',
  name: 'mkdir',
  description: '在极空间创建目录（需局域网访问）',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', required: true, positional: true, help: '父目录路径，支持相对路径' },
    { name: 'name', required: true, help: '新目录名称' },
  ],
  columns: ['name', 'path', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const parentPath = resolvePath(kwargs.path);
    const dirName: string = kwargs.name;

    const resp = await zosFetch(page, '/v2/file/newdir', {
      path: parentPath,
      name: dirName,
    });

    const fullPath = resp.data?.path || `${parentPath}/${dirName}`;
    return [{
      name: dirName,
      path: fullPath,
      status: '创建成功',
    }];
  },
});
