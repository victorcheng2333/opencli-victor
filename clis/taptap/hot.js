/**
 * TapTap rankings — `/webapiv2/app-top/v2/hits`.
 *
 * Lists top games by category (hot/reserve/sell/new/exclusive/pop).
 * Mirrors what powers https://www.taptap.cn/top/download tabs.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError, EmptyResultError } from '@jackwener/opencli/errors';
import { appWebUrl, clampLimit, pickRating, tagsText, taptapFetch } from './utils.js';

const TYPE_CHOICES = [
    'hot',
    'reserve',
    'sell',
    'new',
    'exclusive',
    'pop',
    'in_app_event_reserve',
];

cli({
    site: 'taptap',
    name: 'hot',
    access: 'read',
    description: 'TapTap 应用排行榜（热门/预约/付费/新品等）',
    domain: 'www.taptap.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        {
            name: 'type',
            type: 'string',
            default: 'hot',
            choices: TYPE_CHOICES,
            help: `榜单类型: ${TYPE_CHOICES.join(', ')}`,
        },
        { name: 'platform', type: 'string', default: '', help: '平台过滤，例如 android (留空表示全部)' },
        { name: 'from', type: 'int', default: 0, help: '分页偏移' },
        { name: 'limit', type: 'int', default: 20, help: '返回条数 (最多 50)' },
    ],
    columns: ['rank', 'id', 'title', 'rating', 'tags'],
    func: async (_page, args) => {
        const type = String(args.type ?? 'hot');
        if (!TYPE_CHOICES.includes(type)) {
            throw new CliError('INVALID_ARGUMENT', `Unknown type "${type}"`, `Valid: ${TYPE_CHOICES.join(', ')}`);
        }
        const limit = clampLimit(args.limit, 20, 50);
        const from = Math.max(0, Number(args.from) || 0);
        const params = { type_name: type, from, limit };
        if (args.platform) params.platform = args.platform;
        const data = await taptapFetch('/webapiv2/app-top/v2/hits', params);
        const list = Array.isArray(data?.list) ? data.list : [];
        if (!list.length) {
            throw new EmptyResultError('taptap hot', `No items returned for type=${type}`);
        }
        return list.slice(0, limit).map((entry, index) => {
            const app = entry?.app || {};
            return {
                rank: from + index + 1,
                id: app.id ?? '',
                title: app.title ?? '',
                rating: pickRating(app.stat),
                tags: tagsText(app.tags),
                hints: Array.isArray(app.hints) ? app.hints.join(' / ') : '',
                url: appWebUrl(app.id),
            };
        });
    },
});
