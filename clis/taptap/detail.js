/**
 * TapTap app detail — `/webapiv2/app/v6/detail`.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { appWebUrl, formatDate, shortText, tagsText, taptapFetch } from './utils.js';
import { normalizeNumericId } from '../_shared/common.js';

cli({
    site: 'taptap',
    name: 'detail',
    access: 'read',
    description: 'TapTap 应用详情（评分、开发商、标签、描述、版本）',
    domain: 'www.taptap.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        {
            name: 'id',
            type: 'string',
            required: true,
            positional: true,
            help: 'TapTap 应用 ID（例如 165287，可从应用页面 URL 获取）',
        },
    ],
    columns: ['id', 'title', 'rating', 'developer', 'released', 'tags'],
    func: async (_page, args) => {
        const appId = normalizeNumericId(args.id, 'TapTap app id', '165287');
        const data = await taptapFetch('/webapiv2/app/v6/detail', { id: appId });
        const app = data?.app;
        if (!app) {
            throw new EmptyResultError('taptap detail', `App ${appId} not found`);
        }
        const stat = app.stat || {};
        const developer = app.developers?.[0]?.name
            || app.publisher?.name
            || app.developer
            || '';
        const description = shortText(app.description?.text || app.summary || '', 240);
        return [{
            id: app.id ?? appId,
            title: app.title ?? '',
            rating: stat.rating?.score || '-',
            developer,
            released: formatDate(app.released_time),
            updated: formatDate(app.update_time),
            tags: tagsText(app.tags),
            review_count: stat.review_count ?? 0,
            fans_count: stat.fans_count ?? 0,
            description,
            url: appWebUrl(app.id ?? appId),
        }];
    },
});
