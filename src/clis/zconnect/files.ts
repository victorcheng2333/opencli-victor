/**
 * 极空间 — 列出文件和目录
 *
 * POST /v2/file/list (form-encoded)
 * Params: path, show_hidden, sortby + auth params
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize, formatTime, resolvePath } from './common.js';

cli({
  site: 'zconnect',
  name: 'files',
  description: '列出极空间文件和目录',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', default: '', positional: true, help: '目录路径，支持相对路径如 test (默认 /sata1/my/data)' },
    { name: 'sort', default: 'mtime', help: '排序方式: mtime/name/size', choices: ['mtime', 'name', 'size'] },
    { name: 'hidden', type: 'boolean', default: false, help: '显示隐藏文件' },
    { name: 'limit', type: 'int', default: 0, help: '返回数量上限 (0=不限)' },
  ],
  columns: ['type', 'name', 'size', 'modified'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const path = resolvePath(kwargs.path);
    const sortby = kwargs.sort || 'mtime';
    const showHidden = kwargs.hidden ? '1' : '0';
    const limit = kwargs.limit || 0;

    const resp = await zosFetch(page, '/v2/file/list', {
      path,
      show_hidden: showHidden,
      sortby,
    });

    const list = resp.data?.list || [];
    const items = list.map((f: any) => ({
      type: f.is_dir === '1' ? '📁' : '📄',
      name: f.name,
      size: f.is_dir === '1' ? '-' : formatSize(f.size),
      modified: formatTime(f.modify_time),
      path: f.path,
      is_dir: f.is_dir === '1',
      ftype: f.ftype,
      ext: f.ext,
    }));

    return limit > 0 ? items.slice(0, limit) : items;
  },
});
