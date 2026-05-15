/**
 * TapTap webapiv2 helpers.
 *
 * The taptap.cn web app talks to public JSON endpoints under
 * https://www.taptap.cn/webapiv2/*. Most endpoints accept a minimal
 * X-UA query string identifying the WebApp client.
 */
import { CliError } from '@jackwener/opencli/errors';

export const TAPTAP_BASE = 'https://www.taptap.cn';

const TAPTAP_X_UA = [
    'V=1',
    'PN=WebApp',
    'LANG=zh_CN',
    'VN_CODE=102',
    'LOC=CN',
    'PLT=PC',
    'DS=Android',
    'DT=PC',
].join('&');

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': `${TAPTAP_BASE}/`,
};

function buildQuery(params = {}) {
    const search = new URLSearchParams();
    search.set('X-UA', TAPTAP_X_UA);
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        search.set(key, String(value));
    }
    return search.toString();
}

export async function taptapFetch(endpoint, params = {}) {
    const url = `${TAPTAP_BASE}${endpoint}?${buildQuery(params)}`;
    const resp = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!resp.ok) {
        throw new CliError('FETCH_ERROR', `TapTap API HTTP ${resp.status}`, `Endpoint: ${endpoint}`);
    }
    const json = await resp.json();
    if (json && json.success === false) {
        const msg = json.data?.msg || json.data?.error_description || 'TapTap API error';
        throw new CliError('API_ERROR', msg, `Endpoint: ${endpoint}`);
    }
    return json?.data ?? {};
}

export function clampLimit(value, fallback, max) {
    const n = Number(value ?? fallback);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(Math.trunc(n), max);
}

export function pickRating(stat) {
    return stat?.rating?.score || '-';
}

export function shortText(value, max = 120) {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function tagsText(tags) {
    if (!Array.isArray(tags)) return '';
    return tags.map(t => t?.value).filter(Boolean).join(' / ');
}

export function appWebUrl(id) {
    return id ? `${TAPTAP_BASE}/app/${id}` : '';
}

export function momentWebUrl(id) {
    return id ? `${TAPTAP_BASE}/moment/${id}` : '';
}

export function formatDate(unixSec) {
    const ts = Number(unixSec || 0);
    if (!Number.isFinite(ts) || ts <= 0) return '';
    const d = new Date(ts * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayShanghaiDayCode(now = new Date()) {
    // TapTap calendar uses YYYYMMDD in Shanghai time (UTC+8).
    const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

export function normalizeDay(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return todayShanghaiDayCode();
    const compact = raw.replace(/[-/.]/g, '');
    if (!/^\d{8}$/.test(compact)) {
        throw new CliError('INVALID_ARGUMENT', `Invalid date "${value}"`, 'Use YYYY-MM-DD or YYYYMMDD');
    }
    return compact;
}
