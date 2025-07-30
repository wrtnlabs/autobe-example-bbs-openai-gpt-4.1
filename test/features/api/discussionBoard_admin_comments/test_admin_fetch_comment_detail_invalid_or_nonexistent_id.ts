import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate admin comment retrieval with invalid or nonexistent ids.
 *
 * Ensures that error cases for the admin detail comment lookup endpoint are
 * handled gracefully:
 *
 * - Requesting a comment with an invalid UUID (malformed id not matching the uuid
 *   format) yields a validation error
 * - Requesting a comment with a well-formed but non-existent id yields a not
 *   found error, not a server crash
 *
 * Business rationale: Admins or moderators may input invalid or old ids, and
 * the API must respond clearly, without exposing server internals or failing
 * ungracefully.
 *
 * Steps:
 *
 * 1. Attempt to fetch with a clearly invalid uuid (e.g., "not-a-uuid"); expect an
 *    error
 * 2. Attempt to fetch with a well-formed but random uuid; expect an error (not
 *    found)
 */
export async function test_api_discussionBoard_admin_comments_test_admin_fetch_comment_detail_invalid_or_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch with an invalid (malformed) UUID
  await TestValidator.error(
    "invalid 'commentId' format should produce validation error",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.at(connection, {
      commentId: "not-a-uuid" as string & tags.Format<"uuid">,
    });
  });

  // 2. Attempt to fetch with a random (well-formed but nonexistent) UUID
  await TestValidator.error(
    "nonexistent 'commentId' should produce not found error",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.at(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
