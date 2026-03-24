/**
 * 极空间 — 操作日志
 *
 * POST /action/list (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatTime } from './common.js';

cli({
  site: 'zconnect',
  name: 'logs',
  description: '查看极空间操作日志',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'limit', type: 'int', default: 20, help: '返回数量 (默认20)' },
  ],
  columns: ['time', 'group', 'title', 'content', 'device'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const limit = kwargs.limit || 20;
    const resp = await zosFetch(page, '/action/list', {});
    const list = resp.data?.list || [];

    return list.slice(0, limit).map((a: any) => ({
      time: formatTime(a.created_at_tt),
      group: a.group_name || a.group || '-',
      title: a.title || '-',
      content: a.content || '-',
      device: a.device || '-',
    }));
  },
});
