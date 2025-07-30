import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate the moderator's error handling when updating a comment version with
 * nonexistent IDs.
 *
 * This test ensures that when a moderator attempts to update a comment version
 * by providing either a non-existent commentId or versionId, the API properly
 * responds with an error (typically a not-found response). This is critical for
 * system integrity, preventing silent failures or data corruption.
 *
 * Scenario Steps:
 *
 * 1. Attempt to update a comment version using a random, nonexistent commentId
 *    (with a random versionId).
 *
 *    - Expect the API call to fail with a 'not found' error (exception thrown).
 * 2. Attempt to update a comment version using a random, valid-like commentId but
 *    a random, nonexistent versionId.
 *
 *    - Expect the API call to fail with a 'not found' error.
 * 3. Use a valid update payload in both cases, focusing on error thrown due to
 *    not-found logic.
 *
 * No dependencies or setup required, as the IDs are intentionally invalid and
 * do not reference any actual resource.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_moderator_with_invalid_commentId_or_versionId(
  connection: api.IConnection,
) {
  // 1. Attempt to update with a non-existent commentId and versionId
  await TestValidator.error("should throw not found for invalid commentId")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.versions.update(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          versionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            content: "Attempt moderation update for invalid commentId",
          } satisfies IDiscussionBoardCommentVersion.IUpdate,
        },
      );
    },
  );

  // 2. Attempt to update with a valid-like commentId but invalid versionId
  await TestValidator.error("should throw not found for invalid versionId")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.versions.update(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          versionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            content: "Attempt moderation update for invalid versionId",
          } satisfies IDiscussionBoardCommentVersion.IUpdate,
        },
      );
    },
  );
}
