/**
 * 极空间 — 删除分享链接
 *
 * POST /v2/share/delete (form-encoded)
 * Params: id=shareId
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetch } from './common.js';
cli({
    site: 'zconnect',
    name: 'share-delete',
    description: '删除极空间分享链接',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [
        { name: 'id', required: true, positional: true, help: '分享ID (可通过 zconnect shares 查看)' },
    ],
    columns: ['id', 'status'],
    func: async (page, kwargs) => {
        requirePage(page);
        const shareId = kwargs.id;
        await zosFetch(page, '/v2/share/delete', { id: shareId });
        return [{
                id: shareId,
                status: '已删除',
            }];
    },
});
