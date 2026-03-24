/**
 * 极空间 — 创建分享链接
 *
 * POST /v2/share/create (form-encoded)
 * Params: paths[]=..., expire=seconds, pass=password(optional)
 */
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { ZCONNECT_DOMAIN, requirePage, zosFetchRaw, buildPathsBody } from './common.js';

cli({
  site: 'zconnect',
  name: 'share-create',
  description: '创建极空间分享链接',
  domain: ZCONNECT_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
  args: [
    { name: 'path', required: true, positional: true, help: '要分享的文件/目录路径' },
    { name: 'expire', type: 'int', default: 86400, help: '有效期(秒)，默认86400(1天)。0=永久' },
    { name: 'pass', default: '', help: '提取密码（留空则无密码）' },
  ],
  columns: ['file', 'url', 'expire', 'pass'],
  func: async (page: IPage | null, kwargs) => {
    requirePage(page);

    const filePath: string = kwargs.path;
    const expire: string = String(kwargs.expire || 86400);
    const pass: string = kwargs.pass || '';

    const extra: Record<string, string> = { expire };
    if (pass) extra.pass = pass;

    const body = buildPathsBody([filePath], extra);
    const resp = await zosFetchRaw(page, '/v2/share/create', body);

    const share = resp.data?.share || {};
    const tplUrl = resp.data?.tpl_url || 'https://znas.cn/AppH5/share/';
    const shareUrl = share.code ? `${tplUrl}${share.code}` : '-';

    const expireHours = Math.floor(parseInt(expire, 10) / 3600);
    const expireStr = parseInt(expire, 10) === 0 ? '永久' : `${expireHours}小时`;

    return [{
      file: filePath.split('/').pop() || filePath,
      url: shareUrl,
      expire: expireStr,
      pass: pass || '无',
    }];
  },
});
