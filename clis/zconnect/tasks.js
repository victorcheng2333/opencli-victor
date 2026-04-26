/**
 * 极空间 — 文件操作任务列表
 *
 * POST /v2/file/tasks (form-encoded)
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ZCONNECT_DOMAIN, requirePage, zosFetch, formatTime } from './common.js';
cli({
    site: 'zconnect',
    name: 'tasks',
    description: '查看极空间文件操作任务',
    domain: ZCONNECT_DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: `https://${ZCONNECT_DOMAIN}/home/`,
    args: [
        { name: 'limit', type: 'int', default: 20, help: '返回数量 (默认20)' },
    ],
    columns: ['id', 'operation', 'state', 'progress', 'src', 'created'],
    func: async (page, kwargs) => {
        requirePage(page);
        const limit = kwargs.limit || 20;
        const resp = await zosFetch(page, '/v2/file/tasks', {});
        const OPT_MAP = {
            copy: '复制', move: '移动', remove: '删除', rclean: '清空回收站',
            restore: '恢复', decompress: '解压', compress: '压缩',
        };
        const STATE_MAP = {
            done: '完成', doing: '进行中', fail: '失败', pause: '暂停', wait: '等待',
        };
        const list = resp.data?.list || [];
        return list.slice(0, limit).map((t) => ({
            id: t.id,
            operation: OPT_MAP[t.opt] || t.opt,
            state: STATE_MAP[t.state] || t.state,
            progress: t.state === 'done' ? '100%' : `${t.progress || 0}%`,
            src: (t.src || []).join(', ').slice(0, 60),
            created: formatTime(t.created_at),
        }));
    },
});
