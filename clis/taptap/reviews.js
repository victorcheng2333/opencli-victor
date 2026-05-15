/**
 * TapTap app reviews — `/webapiv2/review/v2/list-by-app`.
 *
 * Sort options: hot (热门), new (最新), spent (按游戏时长).
 * The endpoint caps each request at limit=10, so this adapter pages through
 * the API internally up to the requested --limit (or until exhaustion when
 * --all is set).
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError, EmptyResultError } from '@jackwener/opencli/errors';
import { formatDate, momentWebUrl, shortText, taptapFetch } from './utils.js';
import { normalizeNumericId } from '../_shared/common.js';

const SORT_CHOICES = ['hot', 'new', 'spent'];
const PAGE_SIZE = 10;
const ABSOLUTE_CAP = 2000;

cli({
    site: 'taptap',
    name: 'reviews',
    access: 'read',
    description: 'TapTap 应用评测列表（默认按热度排序，自动分页）',
    domain: 'www.taptap.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        {
            name: 'id',
            type: 'string',
            required: true,
            positional: true,
            help: 'TapTap 应用 ID（例如 165287）',
        },
        {
            name: 'sort',
            type: 'string',
            default: 'hot',
            choices: SORT_CHOICES,
            help: `排序: ${SORT_CHOICES.join(', ')}`,
        },
        { name: 'from', type: 'int', default: 0, help: '起始偏移' },
        { name: 'limit', type: 'int', default: 10, help: `返回总条数（自动分页，单页 API 上限 ${PAGE_SIZE}）` },
        { name: 'all', type: 'boolean', default: false, help: '抓取该应用全部评测（覆盖 --limit）' },
    ],
    columns: ['rank', 'author', 'score', 'time', 'content'],
    func: async (_page, args) => {
        const appId = normalizeNumericId(args.id, 'TapTap app id', '165287');
        const sort = String(args.sort ?? 'hot');
        if (!SORT_CHOICES.includes(sort)) {
            throw new CliError('INVALID_ARGUMENT', `Unknown sort "${sort}"`, `Valid: ${SORT_CHOICES.join(', ')}`);
        }
        const startFrom = Math.max(0, Number(args.from) || 0);
        const fetchAll = Boolean(args.all);
        const requestedLimit = fetchAll ? ABSOLUTE_CAP : Math.max(1, Math.trunc(Number(args.limit) || 10));
        const target = Math.min(requestedLimit, ABSOLUTE_CAP);

        const collected = [];
        let offset = startFrom;
        while (collected.length < target) {
            const remaining = target - collected.length;
            const pageLimit = Math.min(PAGE_SIZE, remaining);
            const data = await taptapFetch('/webapiv2/review/v2/list-by-app', {
                app_id: appId,
                from: offset,
                limit: pageLimit,
                sort,
            });
            const list = Array.isArray(data?.list) ? data.list : [];
            if (!list.length) break;
            collected.push(...list);
            const nextPage = data?.next_page;
            const hasMore = (typeof nextPage === 'string' && nextPage.length > 0)
                || list.length === pageLimit;
            offset += list.length;
            if (!hasMore) break;
        }

        if (!collected.length) {
            throw new EmptyResultError('taptap reviews', `No reviews returned for app ${appId}`);
        }

        return collected.slice(0, target).map((entry, index) => {
            const moment = entry?.moment || {};
            const review = moment.review || {};
            const author = moment.author?.user?.name || '';
            const stat = moment.stat || {};
            const text = review.contents?.text
                || review.summary
                || moment.summary
                || moment.title
                || '';
            return {
                rank: startFrom + index + 1,
                author,
                score: review.score ?? '-',
                time: formatDate(moment.created_time || moment.edited_time),
                spent: review.played_spent ?? '',
                ups: stat.ups ?? 0,
                comments: stat.comments ?? 0,
                content: shortText(text, 200),
                url: momentWebUrl(moment.id_str || moment.id),
            };
        });
    },
});
