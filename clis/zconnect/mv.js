/**
 * 极空间 — 移动文件或目录
 *
 * POST /v2/file/move (form-encoded)
 * Params: paths[]=... (sources), to=... (destination dir)
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetchRaw, buildPathsBody, resolvePath } from './common.js';
cli({
    site: 'zconnect',
    name: 'mv',
    description: '移动极空间文件或目录',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [
        { name: 'src', required: true, positional: true, help: '源路径，支持相对路径和逗号分隔多个' },
        { name: 'to', required: true, help: '目标目录，支持相对路径' },
    ],
    columns: ['src', 'to', 'status'],
    func: async (page, kwargs) => {
        requirePage(page);
        const srcInput = kwargs.src;
        const destDir = resolvePath(kwargs.to);
        const paths = srcInput.split(',').map((p) => resolvePath(p.trim())).filter(Boolean);
        if (paths.length === 0)
            throw new Error('请指定至少一个源路径');
        const body = buildPathsBody(paths, { to: destDir });
        const resp = await zosFetchRaw(page, '/v2/file/move', body);
        const taskId = resp.data?.task?.id;
        return paths.map(p => ({
            src: p,
            to: destDir,
            status: `移动中${taskId ? ` (任务 #${taskId})` : ''}`,
        }));
    },
});
