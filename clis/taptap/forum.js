/**
 * TapTap forum hot feed — `/webapiv2/discover-categories/v2/feed-list`.
 *
 * Powers https://www.taptap.cn/forum/hot — discovery feed of moments / posts.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { clampLimit, formatDate, momentWebUrl, shortText, taptapFetch } from './utils.js';

const CATEGORY_CHOICES = ['hot', 'follow', 'recommend'];

cli({
    site: 'taptap',
    name: 'forum',
    access: 'read',
    description: 'TapTap 论坛热门动态（moment feed）',
    domain: 'www.taptap.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        {
            name: 'category',
            type: 'string',
            default: 'hot',
            choices: CATEGORY_CHOICES,
            help: `分类: ${CATEGORY_CHOICES.join(', ')}`,
        },
        { name: 'from', type: 'int', default: 0, help: '分页偏移' },
        { name: 'limit', type: 'int', default: 20, help: '返回条数 (最多 30)' },
    ],
    columns: ['rank', 'title', 'author', 'group', 'time', 'comments'],
    func: async (_page, args) => {
        const category = String(args.category ?? 'hot');
        const limit = clampLimit(args.limit, 20, 30);
        const from = Math.max(0, Number(args.from) || 0);
        const data = await taptapFetch('/webapiv2/discover-categories/v2/feed-list', {
            category,
            from,
            limit,
        });
        const list = Array.isArray(data?.list) ? data.list : [];
        if (!list.length) {
            throw new EmptyResultError('taptap forum', `No items returned for category=${category}`);
        }
        return list.slice(0, limit).map((entry, index) => {
            const moment = entry?.moment || {};
            const stat = moment.stat || {};
            const author = moment.author?.user?.name || '';
            const title = moment.title || shortText(moment.summary, 60);
            return {
                rank: from + index + 1,
                title,
                author,
                group: moment.group?.title || '',
                time: formatDate(moment.edited_time || moment.created_time),
                ups: stat.ups ?? 0,
                comments: stat.comments ?? 0,
                pv: stat.pv_total ?? 0,
                summary: shortText(moment.summary, 160),
                url: momentWebUrl(moment.id_str || moment.id),
            };
        });
    },
});
