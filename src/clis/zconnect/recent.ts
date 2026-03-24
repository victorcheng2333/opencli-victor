/**
 * 极空间 — 最近访问的文件
 *
 * POST /v2/recent/list (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize, formatTime } from './common.js';

cli({
  site: 'zconnect',
  name: 'recent',
  description: '查看极空间最近访问的文件',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'limit', type: 'int', default: 20, help: '返回数量 (默认20)' },
  ],
  columns: ['name', 'size', 'type', 'accessed'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const limit = kwargs.limit || 20;
    const resp = await zosFetch(page, '/v2/recent/list', { show_hidden: '0' });
    const list = resp.data?.list || [];

    const FTYPE_MAP: Record<string, string> = {
      '101': '图片', '102': '视频', '103': '音频',
      '104': '种子', '105': '应用', '106': '压缩文件', '107': '文档',
    };

    return list.slice(0, limit).map((f: any) => ({
      name: f.name,
      size: formatSize(f.size),
      type: FTYPE_MAP[f.ftype] || (f.is_dir === '1' ? '目录' : '文件'),
      accessed: formatTime(f.access_time),
      path: f.path,
    }));
  },
});
