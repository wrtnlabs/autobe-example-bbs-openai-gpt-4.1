import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for edge-case filtering and pagination on the thread search
 * endpoint.
 *
 * This test verifies the discussion board thread listing (PATCH
 * /discussionBoard/threads) handles unusual and invalid filter/pagination
 * client requests robustly. Scenarios covered:
 *
 * 1. Search by nonsense keyword should return no data.
 * 2. Request page far past available data (page=9999) yields empty or safe
 *    result.
 * 3. Supplying invalid filter/sort (e.g. bad orderBy, negative page/limit)
 *    triggers backend validation error.
 *
 * Steps:
 *
 * 1. Query threads with impossible search word, check for empty result and
 *    correct pagination
 * 2. Query a huge page number, expect consistent empty data and correct
 *    pagination fields
 * 3. Attempt to use bad filter/sort params and confirm error handling
 */
export async function test_api_thread_search_filters_and_pagination_edge_cases(
  connection: api.IConnection,
) {
  // 1. Search for threads with a nonsense keyword, expect empty data set
  const impossibleKeyword = "zxqvbnmpltrj"; // extremely unlikely to be found in any dataset
  const resultImpossible = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        search: impossibleKeyword,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(resultImpossible);
  TestValidator.equals(
    "search with impossible keyword yields empty",
    resultImpossible.data.length,
    0,
  );

  // 2. Request a huge page (beyond range), expecting empty data and consistent pagination
  const resultHugePage = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: { page: 9999, limit: 10 } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(resultHugePage);
  TestValidator.equals(
    "huge page returns empty data",
    resultHugePage.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination reports current page as requested",
    resultHugePage.pagination.current === 9999,
  );

  // 3. Pass invalid params (bad orderBy, negative page/limit, illogical type values, etc) -- should get validation error
  await TestValidator.error(
    "invalid orderBy triggers validation error",
    async () => {
      await api.functional.discussionBoard.threads.index(connection, {
        // purposely invalid string for orderBy
        body: {
          orderBy: "not_a_valid_field" as any,
        } satisfies IDiscussionBoardThread.IRequest,
      });
    },
  );

  await TestValidator.error(
    "negative page triggers validation error",
    async () => {
      await api.functional.discussionBoard.threads.index(connection, {
        body: { page: -1 } satisfies IDiscussionBoardThread.IRequest,
      });
    },
  );

  await TestValidator.error(
    "negative limit triggers validation error",
    async () => {
      await api.functional.discussionBoard.threads.index(connection, {
        body: { limit: -10 } satisfies IDiscussionBoardThread.IRequest,
      });
    },
  );
}
