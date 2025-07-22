import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate input parameter error handling for the post listing API (PATCH /discussionBoard/posts).
 *
 * This test ensures that the API properly rejects invalid filter parameters and returns validation errors or formatted error responses, rather than succeeding or failing silently. It covers these error scenarios:
 *
 * 1. Supplying a malformed thread_id that violates UUID format
 * 2. Supplying a non-existent discussion_board_member_id (well-formed UUID but not present in the database)
 * 3. Supplying an invalid pagination limit (zero)
 * 4. Supplying an invalid negative page number
 *
 * For each case, we verify that an error is thrown, and no result is returned. Only business-implementable type errors are tested (no TypeScript-level errors or runtime schema violations, as those are impossible).
 */
export async function test_api_discussionBoard_test_list_posts_with_invalid_filter_parameters(
  connection: api.IConnection,
) {
  // 1. Malformed thread_id (not a UUID)
  await TestValidator.error("malformed thread_id should throw")(() =>
    api.functional.discussionBoard.posts.patch(connection, {
      body: { thread_id: "not-a-uuid" } as any, // Only here, to force runtime validation error
    }),
  );

  // 2. Non-existent member UUID (valid format, but not in system)
  await TestValidator.error("non-existent discussion_board_member_id should throw")(() =>
    api.functional.discussionBoard.posts.patch(connection, {
      body: { discussion_board_member_id: "123e4567-e89b-12d3-a456-426614174000" },
    }),
  );

  // 3. Invalid pagination limit (zero)
  await TestValidator.error("limit zero should throw")(() =>
    api.functional.discussionBoard.posts.patch(connection, {
      body: { limit: 0 },
    }),
  );

  // 4. Invalid negative page
  await TestValidator.error("page negative should throw")(() =>
    api.functional.discussionBoard.posts.patch(connection, {
      body: { page: -1 },
    }),
  );
}