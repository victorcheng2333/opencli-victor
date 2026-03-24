/**
 * 极空间 (ZConnect) common utilities — shared logic for all zconnect adapters.
 *
 * All ZOS APIs:
 * - Use POST with application/x-www-form-urlencoded body
 * - Require auth params: token, device_id, version, plat, _l, device
 * - Auth params come from cookies set by the web login session
 * - URL format: /{endpoint}?&rnd={timestamp}_{random}&webagent=v2
 */
import type { IPage } from '../../types.js';

// ── Constants ───────────────────────────────────────────────────────────────

export const ZCONNECT_DOMAIN = 'www.zconnect.cn';
const ZCONNECT_HOME = `https://${ZCONNECT_DOMAIN}/home/`;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ZosApiResponse {
  code: string;
  ts: number;
  msg: string;
  reason?: string;
  suggest?: string;
  data: any;
}

// ── Core helpers ────────────────────────────────────────────────────────────

export function requirePage(page: IPage | null): asserts page is IPage {
  if (!page) throw new Error('Browser page required');
}

/**
 * Ensure the page is on the zconnect domain before accessing cookies.
 * Re-navigates if needed (e.g. when navigateBefore silently failed).
 */
async function ensureOnDomain(page: IPage): Promise<void> {
  const url = await page.evaluate(`location.href`) as string;
  if (url.includes(ZCONNECT_DOMAIN)) return;
  // Not on zconnect domain — navigate explicitly
  await page.goto(`https://${ZCONNECT_DOMAIN}/home/`);
  await page.wait(3);
}

/**
 * Extract auth parameters from browser cookies.
 * These are set by the ZOS web login and required for all API calls.
 */
async function getAuthParams(page: IPage): Promise<Record<string, string>> {
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
  `) as Promise<Record<string, string>>;
}

/**
 * Make a form-encoded POST API call to ZOS backend via page.evaluate().
 *
 * @param page - Browser page instance
 * @param endpoint - API path (e.g. '/v2/file/list')
 * @param params - Additional request parameters (merged with auth params)
 * @returns Parsed API response
 */
export async function zosFetch(
  page: IPage,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<ZosApiResponse> {
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
  `) as ZosApiResponse;

  if (data.code !== '200') {
    throw new Error(`ZOS API 错误: ${data.msg || data.reason || 'Unknown'} (code=${data.code})`);
  }

  return data;
}

/**
 * Format file size to human-readable string.
 */
export function formatSize(bytes: number | string): string {
  const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!b || b === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = b;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format Unix timestamp to date string.
 */
export function formatTime(ts: number | string): string {
  const t = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (!t || t === 0) return '-';
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
export async function zosFetchRaw(
  page: IPage,
  endpoint: string,
  bodyStr: string,
): Promise<ZosApiResponse> {
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
  `) as ZosApiResponse;

  if (data.code !== '200') {
    throw new Error(`ZOS API 错误: ${data.msg || data.reason || 'Unknown'} (code=${data.code})`);
  }

  return data;
}

/**
 * Build paths[] query string for write operations.
 */
export function buildPathsBody(paths: string[], extra: Record<string, string> = {}): string {
  const parts = paths.map(p => `paths[]=${encodeURIComponent(p)}`);
  for (const [k, v] of Object.entries(extra)) {
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

/**
 * Verbose log helper.
 */
export function verbose(msg: string): void {
  if (process.env.OPENCLI_VERBOSE || process.env.DEBUG?.includes('opencli')) {
    console.error(`[opencli:zconnect] ${msg}`);
  }
}
