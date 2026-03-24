/**
 * 极空间 — 系统设置查看
 *
 * POST /setting/load (form-encoded)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetch } from './common.js';

cli({
  site: 'zconnect',
  name: 'settings',
  description: '查看极空间系统设置',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [],
  columns: ['category', 'setting', 'value'],
  func: async (page: IPage | null, _kwargs) => {
    requirePage(page);

    const resp = await zosFetch(page, '/setting/load', {});
    const data = resp.data || {};
    const items: Array<{ category: string; setting: string; value: string }> = [];

    // File settings
    const file = data.file || {};
    items.push({ category: '文件', setting: '显示隐藏文件', value: file.show_hidden ? '是' : '否' });
    items.push({ category: '文件', setting: '排序方式', value: `${file.file_sort?.sort_by || '-'} (${file.file_sort?.order || '-'})` });

    // Share settings
    const share = file.share || {};
    items.push({ category: '分享', setting: '分享功能', value: share.disable ? '已禁用' : '已启用' });
    items.push({ category: '分享', setting: '默认有效期', value: `${Math.floor((share.expire || 0) / 3600)} 小时` });

    // Boot settings
    const boot = data.boot || {};
    items.push({ category: '系统', setting: '断电自动开机', value: boot.power_off === 'no' ? '否' : '是' });

    // SSH
    items.push({ category: '系统', setting: '文件系统监控', value: data.fs_evt_monitor ? '已启用' : '未启用' });

    return items;
  },
});
