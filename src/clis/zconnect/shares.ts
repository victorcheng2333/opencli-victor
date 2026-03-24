/**
 * 极空间 — 查看分享链接
 *
 * POST /v2/share/list (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatTime } from './common.js';

cli({
  site: 'zconnect',
  name: 'shares',
  description: '查看极空间分享链接列表',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'limit', type: 'int', default: 20, help: '返回数量 (默认20)' },
  ],
  columns: ['id', 'file', 'type', 'status', 'created'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const limit = kwargs.limit || 20;
    const resp = await zosFetch(page, '/v2/share/list', {});
    const list = resp.data?.list || [];

    const TYPE_MAP: Record<string, string> = { '1': '目录', '2': '文件' };
    const STATE_MAP: Record<string, string> = { '1': '有效', '2': '过期', '3': '已过期' };

    return list.slice(0, limit).map((s: any) => ({
      id: s.id,
      file: s.fname || s.name || '-',
      type: TYPE_MAP[s.type] || s.type,
      status: s.expired === '1' ? '已过期' : (STATE_MAP[s.state] || s.state),
      created: formatTime(s.created_at),
      code: s.code,
      path: s.real_path,
    }));
  },
});
