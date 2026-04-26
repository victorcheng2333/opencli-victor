// ── Constants ───────────────────────────────────────────────────────────────
export const ZCONNECT_DOMAIN = 'www.zconnect.cn';
export const DEFAULT_BASE = '/sata1/my/data';
const ZCONNECT_HOME = `https://${ZCONNECT_DOMAIN}/home/`;
/**
 * Resolve path: if it starts with '/' treat as absolute, otherwise prepend DEFAULT_BASE.
 */
export function resolvePath(p) {
    if (!p)
        return DEFAULT_BASE;
    return p.startsWith('/') ? p : `${DEFAULT_BASE}/${p}`;
}
// ── Core helpers ────────────────────────────────────────────────────────────
export function requirePage(page) {
    if (!page)
        throw new Error('Browser page required');
}
/**
 * Ensure the page is on the zconnect domain before accessing cookies.
 * Re-navigates if needed (e.g. when navigateBefore silently failed).
 */
async function ensureOnDomain(page) {
    const url = await page.evaluate(`location.href`);
    if (url.includes(ZCONNECT_DOMAIN))
        return;
    // Not on zconnect domain — navigate explicitly
    await page.goto(`https://${ZCONNECT_DOMAIN}/home/`);
    await page.wait(3);
}
/**
 * Extract auth parameters from browser cookies.
 * These are set by the ZOS web login and required for all API calls.
 */
async function getAuthParams(page) {
    await ensureOnDomain(page);
    return page.evaluate(`
    (() => {
      const c = {};
      document.cookie.split('; ').forEach(s => {
        const i = s.indexOf('=');
        if (i > 0) c[s.slice(0, i)] = s.slice(i + 1);
      });
      return {
        token: c.zenithtoken || '',
        device_id: c.device_id || '',
        version: c.version || '',
        plat: c.plat || 'web',
        _l: c._l || 'zh_cn',
        device: decodeURIComponent(c.device || 'Mac'),
      };
    })()
  `);
}
/**
 * Make a form-encoded POST API call to ZOS backend via page.evaluate().
 *
 * @param page - Browser page instance
 * @param endpoint - API path (e.g. '/v2/file/list')
 * @param params - Additional request parameters (merged with auth params)
 * @returns Parsed API response
 */
export async function zosFetch(page, endpoint, params = {}) {
    const auth = await getAuthParams(page);
    const allParams = { ...auth, ...params };
    const data = await page.evaluate(`
    (async () => {
      const params = ${JSON.stringify(allParams)};
      const body = new URLSearchParams(params).toString();
      const rnd = Date.now() + '_' + Math.floor(Math.random() * 10000);
      const res = await fetch(${JSON.stringify(endpoint)} + '?&rnd=' + rnd + '&webagent=v2', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      });
      return res.json();
    })()
  `);
    if (data.code !== '200') {
        throw new Error(`ZOS API 错误: ${data.msg || data.reason || 'Unknown'} (code=${data.code})`);
    }
    return data;
}
/**
 * Format file size to human-readable string.
 */
export function formatSize(bytes) {
    const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (!b || b === 0)
        return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = b;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
/**
 * Format Unix timestamp to date string.
 */
export function formatTime(ts) {
    const t = typeof ts === 'string' ? parseInt(ts, 10) : ts;
    if (!t || t === 0)
        return '-';
    return new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ');
}
/**
 * Make a form-encoded POST with array parameters (e.g. paths[]=...).
 *
 * ZOS write operations use `paths[]` format for source file lists.
 * This cannot be done with URLSearchParams alone, so we build the body manually.
 *
 * @param page - Browser page instance
 * @param endpoint - API path
 * @param bodyStr - Pre-built body string (appended after auth params)
 */
export async function zosFetchRaw(page, endpoint, bodyStr) {
    await ensureOnDomain(page);
    const data = await page.evaluate(`
    (async () => {
      const c = {};
      document.cookie.split('; ').forEach(s => {
        const i = s.indexOf('=');
        if (i > 0) c[s.slice(0, i)] = s.slice(i + 1);
      });
      const authStr = 'token=' + encodeURIComponent(c.zenithtoken || '') +
        '&device_id=' + encodeURIComponent(c.device_id || '') +
        '&version=' + encodeURIComponent(c.version || '') +
        '&plat=web&_l=' + encodeURIComponent(c._l || 'zh_cn') +
        '&device=' + encodeURIComponent(decodeURIComponent(c.device || 'Mac'));
      const body = authStr + '&' + ${JSON.stringify(bodyStr)};
      const rnd = Date.now() + '_' + Math.floor(Math.random() * 10000);
      const res = await fetch(${JSON.stringify(endpoint)} + '?&rnd=' + rnd + '&webagent=v2', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      });
      return res.json();
    })()
  `);
    if (data.code !== '200') {
        throw new Error(`ZOS API 错误: ${data.msg || data.reason || 'Unknown'} (code=${data.code})`);
    }
    return data;
}
/**
 * Build paths[] query string for write operations.
 */
export function buildPathsBody(paths, extra = {}) {
    const parts = paths.map(p => `paths[]=${encodeURIComponent(p)}`);
    for (const [k, v] of Object.entries(extra)) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
    return parts.join('&');
}
/**
 * Verbose log helper.
 */
export function verbose(msg) {
    if (process.env.OPENCLI_VERBOSE || process.env.DEBUG?.includes('opencli')) {
        console.error(`[opencli:zconnect] ${msg}`);
    }
}
