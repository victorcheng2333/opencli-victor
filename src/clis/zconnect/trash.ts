/**
 * 极空间 — 清空回收站
 *
 * POST /v2/file/rclean (form-encoded)
 * Params: pool (e.g. 'sata1')
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch } from './common.js';

cli({
  site: 'zconnect',
  name: 'trash-clean',
  description: '清空极空间回收站',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'pool', default: 'sata1', help: '存储池名称 (默认 sata1)' },
  ],
  columns: ['pool', 'status'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const pool: string = kwargs.pool || 'sata1';
    const resp = await zosFetch(page, '/v2/file/rclean', { pool });

    const taskId = resp.data?.task?.id;
    return [{
      pool,
      status: `回收站清空中${taskId ? ` (任务 #${taskId})` : ''}`,
    }];
  },
});
