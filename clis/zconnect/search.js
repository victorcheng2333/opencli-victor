/**
 * 极空间 — 文件搜索
 *
 * POST /file_search/file_search (form-encoded)
 * Params: keyword, path, page, page_size, show_hidden
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatSize, formatTime, resolvePath } from './common.js';
cli({
    site: 'zconnect',
    name: 'search',
    description: '搜索极空间文件',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [
        { name: 'keyword', required: true, positional: true, help: '搜索关键词' },
        { name: 'path', default: '', help: '搜索目录，支持相对路径 (默认 /sata1/my/data)' },
        { name: 'limit', type: 'int', default: 30, help: '返回数量上限 (默认30)' },
    ],
    columns: ['type', 'name', 'size', 'modified', 'path'],
    func: async (page, kwargs) => {
        requirePage(page);
        const keyword = kwargs.keyword;
        const searchPath = resolvePath(kwargs.path);
        const limit = kwargs.limit || 30;
        const resp = await zosFetch(page, '/file_search/file_search', {
            keyword,
            path: searchPath,
            page: '1',
            page_size: String(limit),
            show_hidden: '0',
        });
        const list = resp.data?.list || [];
        return list.map((f) => ({
            type: f.is_dir === '1' ? '📁' : '📄',
            name: f.name,
            size: f.is_dir === '1' ? '-' : formatSize(f.size),
            modified: formatTime(f.modify_time),
            path: f.path,
        }));
    },
});
