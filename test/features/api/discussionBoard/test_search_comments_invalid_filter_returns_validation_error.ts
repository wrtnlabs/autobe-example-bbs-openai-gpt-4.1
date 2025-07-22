import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling for invalid filters when searching discussion board comments.
 *
 * This test ensures the PATCH /discussionBoard/comments endpoint robustly handles invalid input filters.
 * It checks three key invalid input scenarios:
 *
 * 1. Using a non-existent post_id (should return an empty page/result, not an error)
 * 2. Supplying an illogical date range (created_after > created_before),
 *    which should result in a validation error rather than returning data or crashing
 * 3. Using invalid pagination values (negative page, zero limit),
 *    which should also result in input validation errors
 *
 * Each scenario is validated: business rule errors are checked via TestValidator.error(),
 * and valid but non-matching-filter returns are checked via result assertions.
 */
export async function test_api_discussionBoard_test_search_comments_invalid_filter_returns_validation_error(
  connection: api.IConnection,
) {
  // 1. Search comments with non-existent post_id: should return empty data
  const output1 = await api.functional.discussionBoard.comments.patch(connection, {
    body: {
      post_id: typia.random<string & tags.Format<"uuid">>(),
    },
  });
  typia.assert(output1);
  TestValidator.equals("no data for non-existent post")(output1.data.length)(0);

  // 2. Search with invalid date range (created_after later than created_before): should throw validation error
  const after = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days in the future
  const before = new Date().toISOString(); // now
  await TestValidator.error("invalid date range should raise validation error")(
    async () => {
      await api.functional.discussionBoard.comments.patch(connection, {
        body: {
          created_after: after,
          created_before: before,
        },
      });
    },
  );

  // 3. Search with negative page number (should throw validation error)
  await TestValidator.error("negative page number should raise validation error")(
    async () => {
      await api.functional.discussionBoard.comments.patch(connection, {
        body: {
          page: -1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      });
    },
  );

  // 4. Search with invalid limit (zero, which is below minimum): should throw validation error
  await TestValidator.error("zero limit should raise validation error")(
    async () => {
      await api.functional.discussionBoard.comments.patch(connection, {
        body: {
          limit: 0 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      });
    },
  );
}