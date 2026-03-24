/**
 * 极空间 — 磁盘使用情况
 *
 * POST /system/diskusage3 (form-encoded)
 * POST /storagepool/info (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize } from './common.js';

cli({
  site: 'zconnect',
  name: 'disk',
  description: '查看极空间磁盘使用情况',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [],
  columns: ['disk', 'model', 'total', 'used', 'available', 'health', 'temp'],
  func: async (page: IPage | null, _kwargs) => {
    requirePage(page);

    const resp = await zosFetch(page, '/storagepool/info', {});
    const group = resp.data?.system?.group || [];
    const results: any[] = [];

    for (const g of group) {
      for (const disk of g.disks || []) {
        results.push({
          disk: `${disk.type} #${disk.position}`,
          model: disk.model_name || '-',
          total: formatSize(disk.size),
          used: formatSize(disk.usage_size),
          available: formatSize(disk.available_size),
          health: disk.health?.toUpperCase() || '-',
          temp: disk.temp ? `${disk.temp}°C` : '-',
        });
      }
    }

    return results;
  },
});
