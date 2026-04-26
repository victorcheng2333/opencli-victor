/**
 * 极空间 — 文件分类统计
 *
 * POST /v2/file/categories (form-encoded)
 * Params: path
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, resolvePath } from './common.js';
cli({
    site: 'zconnect',
    name: 'categories',
    description: '查看极空间文件类型分类',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [
        { name: 'path', default: '', positional: true, help: '目录路径，支持相对路径 (默认 /sata1/my/data)' },
    ],
    columns: ['type', 'ftype'],
    func: async (page, kwargs) => {
        requirePage(page);
        const dirPath = resolvePath(kwargs.path);
        const resp = await zosFetch(page, '/v2/file/categories', { path: dirPath });
        const categories = resp.data?.categories || [];
        return categories.map((c) => ({
            type: c.name,
            ftype: c.ftype,
        }));
    },
});
