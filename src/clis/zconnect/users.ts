/**
 * 极空间 — 用户列表
 *
 * POST /auth/user/list (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatTime } from './common.js';

cli({
  site: 'zconnect',
  name: 'users',
  description: '查看极空间用户列表',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [],
  columns: ['username', 'nickname', 'role', 'perm', 'created'],
  func: async (page: IPage | null, _kwargs) => {
    requirePage(page);

    const resp = await zosFetch(page, '/auth/user/list', {});
    const list = resp.data?.list || [];

    return list.map((u: any) => ({
      username: u.username,
      nickname: u.nickname || u.remark || '-',
      role: u.is_master ? '管理员' : '普通用户',
      perm: u.perm || '-',
      created: formatTime(u.created_at_tt),
    }));
  },
});
