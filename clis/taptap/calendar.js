/**
 * TapTap event calendar — `/webapiv2/calendar/v1/top-events`.
 *
 * Powers https://www.taptap.cn/app-calendar. Returns highlighted launch /
 * test events for the requested day (Shanghai time, YYYYMMDD).
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { appWebUrl, formatDate, normalizeDay, shortText, tagsText, taptapFetch } from './utils.js';

cli({
    site: 'taptap',
    name: 'calendar',
    access: 'read',
    description: 'TapTap 游戏发售/测试日历（默认今日）',
    domain: 'www.taptap.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        {
            name: 'day',
            type: 'string',
            default: '',
            help: '日期 YYYY-MM-DD 或 YYYYMMDD（默认上海时区今日）',
        },
    ],
    columns: ['game_id', 'title', 'event', 'released', 'tags'],
    func: async (_page, args) => {
        const day = normalizeDay(args.day);
        const data = await taptapFetch('/webapiv2/calendar/v1/top-events', { day });
        const list = Array.isArray(data?.list) ? data.list : [];
        if (!list.length) {
            throw new EmptyResultError('taptap calendar', `No events on ${day}`);
        }
        return list.map((event) => {
            const card = event.app_card_info || {};
            return {
                game_id: card.id ?? event.game_id ?? '',
                title: card.title ?? '',
                event: event.sub_event_type_title || event.event_type_title || '',
                released: formatDate(card.released_time),
                rating: card.stat?.rating?.score || '-',
                tags: tagsText(card.tags),
                summary: shortText(card.description?.text || card.summary, 160),
                url: appWebUrl(card.id ?? event.game_id),
            };
        });
    },
});
