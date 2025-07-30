import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate error handling when a moderator attempts to create a content flag
 * for a non-existent post or comment.
 *
 * This test ensures that the API enforces referential integrity and returns
 * proper error responses when asked to flag content that does not exist.
 *
 * Steps:
 *
 * 1. Create a valid user identifier (simulated string) to act as the moderator.
 * 2. As an admin, assign the moderator role to this user.
 * 3. As the moderator, attempt to create a content flag using a random
 *    (non-existent) post_id.
 *
 *    - Expect the API to reject with an error (entity not found).
 * 4. As the moderator, attempt to create a content flag using a random
 *    (non-existent) comment_id.
 *
 *    - Expect the API to reject with an error (entity not found).
 *
 * This test validates the API's referential integrity for both posts and
 * comments, and ensures proper error handling for invalid target IDs flagged by
 * moderators.
 */
export async function test_api_discussionBoard_test_create_content_flag_with_invalid_target_id(
  connection: api.IConnection,
) {
  // 1. Prepare a unique user identifier for moderator assignment
  const moderatorIdentifier: string = RandomGenerator.alphaNumeric(12);
  const grantAt: string = new Date().toISOString();

  // 2. Assign moderator privileges to this user as an admin
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorIdentifier,
        granted_at: grantAt,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // (Assume authentication context is sufficient for privilege, as only assignment API is given)

  // 3. Attempt to create a content flag for a non-existent post_id
  await TestValidator.error("flagging a non-existent post ID should fail")(
    async () => {
      await api.functional.discussionBoard.moderator.contentFlags.create(
        connection,
        {
          body: {
            post_id: typia.random<string & tags.Format<"uuid">>(),
            comment_id: null,
            flagged_by_moderator_id: moderator.id,
            flag_type: "abuse",
            flag_source: "manual",
            flag_details: "Attempt to flag an invalid post reference.",
          } satisfies IDiscussionBoardContentFlag.ICreate,
        },
      );
    },
  );

  // 4. Attempt to create a content flag for a non-existent comment_id
  await TestValidator.error("flagging a non-existent comment ID should fail")(
    async () => {
      await api.functional.discussionBoard.moderator.contentFlags.create(
        connection,
        {
          body: {
            post_id: null,
            comment_id: typia.random<string & tags.Format<"uuid">>(),
            flagged_by_moderator_id: moderator.id,
            flag_type: "spam",
            flag_source: "manual",
            flag_details: "Attempt to flag an invalid comment reference.",
          } satisfies IDiscussionBoardContentFlag.ICreate,
        },
      );
    },
  );
}
