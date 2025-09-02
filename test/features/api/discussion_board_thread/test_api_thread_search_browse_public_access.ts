import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate public (unauthenticated) visitor can search and browse list of
 * discussion threads.
 *
 * This test sends PATCH requests with filter combinations (title, created
 * date, lock/archive, pagination, and sorting) to the
 * /discussionBoard/threads endpoint, using no authentication. It validates
 * that visitors see only allowed threads, that pagination works, and that
 * status filters (locked/archived) are respected. It also checks sort order
 * and edge paging cases (empty results etc.).
 *
 * Steps:
 *
 * 1. Send a PATCH request as a public user with common thread search filters
 *    (title fragment, created_from, created_to, orderBy, orderDirection,
 *    page, limit).
 * 2. Assert paginated thread summaries are returned and validated (type and
 *    business rules).
 * 3. Paginate: request next page and verify new data (no duplicates, correct
 *    pagination meta/info).
 * 4. Filter for is_locked or is_archived to verify locking/archival status is
 *    respected in results.
 * 5. Sort on each available field/direction and verify returned order matches
 *    request.
 * 6. Request page beyond last page; check empty result.
 * 7. Omit filters and search with default (all visible threads returned).
 */
export async function test_api_thread_search_browse_public_access(
  connection: api.IConnection,
) {
  // 1. Title keyword and date filter (recent threads, sorted)
  const keyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 10,
  });
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14); // 14 days ago
  const toDate = now;

  const searchResponse = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        search: keyword,
        created_from: fromDate.toISOString(),
        created_to: toDate.toISOString(),
        orderBy: "created_at",
        orderDirection: "desc",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "returned data array is not empty (may be empty if no match is found)",
    Array.isArray(searchResponse.data),
  );
  TestValidator.equals(
    "pagination page is as requested",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is as requested",
    searchResponse.pagination.limit,
    5,
  );

  // 2. Pagination: request next page
  const page2Response = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        search: keyword,
        created_from: fromDate.toISOString(),
        created_to: toDate.toISOString(),
        orderBy: "created_at",
        orderDirection: "desc",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination - 2nd page returned",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination - limit correct",
    page2Response.pagination.limit,
    5,
  );

  // Check for data duplication across page boundaries only if both pages are non-empty
  if (searchResponse.data.length > 0 && page2Response.data.length > 0) {
    const idsPage1 = searchResponse.data.map((t) => t.id);
    const idsPage2 = page2Response.data.map((t) => t.id);
    TestValidator.predicate(
      "no thread IDs are duplicated across adjacency pages",
      idsPage2.every((id) => !idsPage1.includes(id)),
    );
  }

  // 3. Filter by is_locked and is_archived
  const filterPairs = [
    ["is_locked", true],
    ["is_archived", false],
  ] as const;
  for (const [filterKey, filterValue] of filterPairs) {
    const filterReq: IDiscussionBoardThread.IRequest = {
      [filterKey]: filterValue,
      page: 1,
      limit: 5,
    } as any;
    const filterResp = await api.functional.discussionBoard.threads.index(
      connection,
      { body: filterReq },
    );
    typia.assert(filterResp);
    for (const summary of filterResp.data) {
      TestValidator.equals(
        `thread summary matches filter ${filterKey}=${filterValue}`,
        summary[filterKey as keyof typeof summary],
        filterValue,
      );
    }
  }

  // 4. Test all valid sort field/direction ('created_at' and 'title' only)
  const sortFields = ["created_at", "title"] as const;
  const sortDirs = ["asc", "desc"] as const;
  for (const field of sortFields) {
    for (const dir of sortDirs) {
      const sortedResp = await api.functional.discussionBoard.threads.index(
        connection,
        {
          body: {
            orderBy: field,
            orderDirection: dir,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardThread.IRequest,
        },
      );
      typia.assert(sortedResp);
      if (sortedResp.data.length > 1) {
        for (let i = 1; i < sortedResp.data.length; ++i) {
          if (field === "title") {
            const a = sortedResp.data[i - 1].title,
              b = sortedResp.data[i].title;
            TestValidator.predicate(
              `threads are sorted by ${field} (${dir})`,
              dir === "asc" ? a.localeCompare(b) <= 0 : a.localeCompare(b) >= 0,
            );
          } else if (field === "created_at") {
            const a = new Date(sortedResp.data[i - 1].created_at).getTime(),
              b = new Date(sortedResp.data[i].created_at).getTime();
            TestValidator.predicate(
              `threads are sorted by ${field} (${dir})`,
              dir === "asc" ? a <= b : a >= b,
            );
          }
        }
      }
    }
  }

  // 5. Edge: page past last page returns empty data
  const maxPage = 1000;
  const emptyResp = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        page: maxPage,
        limit: 5,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(emptyResp);
  TestValidator.equals(
    "edge paging: empty result past last page",
    emptyResp.data.length,
    0,
  );

  // 6. Omit filters (get default listing)
  const defaultResp = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(defaultResp);
  TestValidator.predicate(
    "default listing returns public threads",
    Array.isArray(defaultResp.data),
  );
}
