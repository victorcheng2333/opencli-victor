/**
 * 极空间 — 系统状态概览
 *
 * POST /system/polling2 (form-encoded)
 * POST /zspool/hardware/info (form-encoded)
 * POST /upgrade/info (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize } from './common.js';

cli({
  site: 'zconnect',
  name: 'status',
  description: '查看极空间系统状态',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [],
  columns: ['item', 'value'],
  func: async (page: IPage | null, _kwargs) => {
    requirePage(page);

    const [polling, hw, upgrade, storage] = await Promise.all([
      zosFetch(page, '/system/polling2', {}),
      zosFetch(page, '/zspool/hardware/info', {}),
      zosFetch(page, '/upgrade/info', {}),
      zosFetch(page, '/storagepool/info', {}),
    ]);

    const items: Array<{ item: string; value: string }> = [];

    // Version info
    items.push({ item: 'ZOS 版本', value: polling.data?.pcversion || '-' });

    // Uptime
    const uptimeTs = parseInt(polling.data?.uptime_abs || '0', 10);
    if (uptimeTs) {
      const days = Math.floor((Date.now() / 1000 - uptimeTs) / 86400);
      items.push({ item: '运行时间', value: `${days} 天` });
    }

    // System version
    for (const v of upgrade.data?.version || []) {
      items.push({ item: v.type === 'system' ? '系统固件' : '服务版本', value: v.app_version });
    }

    // Hardware
    const slot = hw.data?.slot || {};
    items.push({ item: '硬盘槽位', value: `SATA: ${slot.sata || 0}, NVMe: ${slot.nvme || 0}` });

    // Storage info
    const disks = storage.data?.system?.group?.[0]?.disks || [];
    for (const disk of disks) {
      items.push({
        item: `硬盘 #${disk.position}`,
        value: `${disk.model_name} | ${formatSize(disk.size)} | ${disk.temp}°C | ${disk.health}`,
      });
    }

    // Storage pool status
    items.push({ item: '存储池', value: `${storage.data?.system?.fs || '-'} (${storage.data?.system?.status})` });

    return items;
  },
});
