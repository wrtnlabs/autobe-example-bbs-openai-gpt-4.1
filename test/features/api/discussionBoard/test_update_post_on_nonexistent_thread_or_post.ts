import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test updating a discussion board post using non-existent threadId or postId.
 *
 * This test verifies that the discussion board API properly rejects update
 * attempts when either the specified thread or the post does not exist. This is
 * crucial for preventing ID spoofing and for ensuring the API enforces
 * resource-level integrity in the face of race conditions or malicious actors.
 *
 * Steps:
 *
 * 1. Generate random, valid-format UUIDs for both threadId and postId that do NOT
 *    correspond to any real records in the database.
 * 2. Attempt to update a discussion board post using these non-existent IDs and a
 *    valid update payload (body and is_edited fields).
 * 3. Confirm that the API responds with a not-found (404) or resource error,
 *    verifying that non-existent resources cannot be updated, and that proper
 *    error boundaries are enforced.
 *
 * Notes:
 *
 * - Only valid UUID formats are used to avoid schema validation (400) errors; the
 *   desired failure is a semantic resource-not-found (404) error.
 * - This test does NOT assume existence of any posts or threads—it strictly tests
 *   the negative path.
 */
export async function test_api_discussionBoard_test_update_post_on_nonexistent_thread_or_post(
  connection: api.IConnection,
) {
  // 1. Generate random, valid UUIDs presumed not to exist in the database
  const nonExistentThreadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid minimal update payload per DTO requirements
  const payload: IDiscussionBoardPost.IUpdate = {
    body: "This update should fail due to non-existent resource.",
    is_edited: true,
  };

  // 3. Attempt to update a post with both thread and post IDs non-existent
  await TestValidator.error(
    "Should reject update for non-existent threadId/postId",
  )(async () => {
    await api.functional.discussionBoard.member.threads.posts.update(
      connection,
      {
        threadId: nonExistentThreadId,
        postId: nonExistentPostId,
        body: payload,
      },
    );
  });
}
