export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Parses and validates `page`/`pageSize` query params.
 * Non-numeric, non-integer, or non-positive values fall back to
 * sane defaults; `pageSize` is capped at MAX_PAGE_SIZE to prevent
 * unbounded queries against SQLite.
 *
 * Shared by all routes that need pagination (currently `books.ts`
 * and `members.ts`) so there is a single implementation.
 */
export function parsePagination(rawPage: unknown, rawPageSize: unknown): { page: number; pageSize: number } {
  try {
    const pageNum = Number(rawPage);
    const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : DEFAULT_PAGE;

    const pageSizeNum = Number(rawPageSize);
    const requestedPageSize = Number.isInteger(pageSizeNum) && pageSizeNum > 0 ? pageSizeNum : DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    return { page, pageSize };
  } catch (err) {
    // Defensive: should be unreachable, but never let parsing crash the request
    return { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };
  }
}
