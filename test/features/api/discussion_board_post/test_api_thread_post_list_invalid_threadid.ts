import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Returns error when listing posts of a non-existent threadId via
 * PATCH /discussionBoard/threads/{threadId}/posts
 *
 * This test verifies that attempting to list posts for a non-existent
 * thread (using a random valid UUID that does not correspond to any
 * existing thread) results in a handled API error, such as 404 Not Found or
 * a business logic error indicating absence of the thread. The request body
 * is valid in all cases. Malformed threadId values are not tested for type
 * safety reasons and are skipped as per policy.
 */
export async function test_api_thread_post_list_invalid_threadid(
  connection: api.IConnection,
) {
  // Non-existent threadId (random valid UUID)
  await TestValidator.error(
    "listing posts with non-existent threadId should return error",
    async () => {
      await api.functional.discussionBoard.threads.posts.index(connection, {
        threadId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardPost.IRequest,
      });
    },
  );
}
