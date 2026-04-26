/**
 * 极空间 — 已安装应用列表
 *
 * POST /AppStore/v1/list (form-encoded)
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetch } from './common.js';
cli({
    site: 'zconnect',
    name: 'apps',
    description: '查看极空间已安装的应用',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [],
    columns: ['name', 'status', 'type'],
    func: async (page, _kwargs) => {
        requirePage(page);
        const resp = await zosFetch(page, '/AppStore/v1/list', {});
        const list = resp.data?.list || [];
        return list.map((app) => {
            // Find localized name
            const i18n = app.local_info?.i18n?.find((l) => l.lang === 'zh_cn') || {};
            const name = i18n.name || app.app_name;
            return {
                name,
                status: app.status || '-',
                type: app.local_info?.app_type || '-',
                app_name: app.app_name,
                is_docker: app.local_info?.is_docker ? '是' : '否',
            };
        });
    },
});
