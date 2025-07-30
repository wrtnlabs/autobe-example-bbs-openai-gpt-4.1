import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that duplicate content flags by a moderator on the same post (with the
 * same type and source) are prevented.
 *
 * This test confirms enforcement of unique constraints in moderation workflow:
 * a moderator cannot create multiple identical flags for the same post and
 * reason.
 *
 * Steps:
 *
 * 1. Create a post under a new thread (prerequisite for flagging)
 * 2. Assign moderator privileges to a test user
 * 3. Create a content flag for a specific type and source on the post (should
 *    succeed)
 * 4. Attempt to create the identical content flag again for the same
 *    post/type/source (should fail)
 * 5. Assert a duplicate constraint error occurs on the second flag creation
 */
export async function test_api_discussionBoard_test_prevent_duplicate_flag_creation_on_same_target_and_type(
  connection: api.IConnection,
) {
  // 1. Create a post (requires a parent thread id)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(post);

  // 2. Assign moderator role to a test user (simulate user account)
  const userIdentifier = typia.random<string>();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Create first content flag (should succeed)
  const flagType = "spam";
  const flagSource = "manual";
  const contentFlagBody = {
    post_id: post.id,
    flag_type: flagType,
    flag_source: flagSource,
    flagged_by_moderator_id: moderator.id,
    flag_details: "Flagged for spam content.",
  } satisfies IDiscussionBoardContentFlag.ICreate;
  const flag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: contentFlagBody,
      },
    );
  typia.assert(flag);

  // 4. Attempt to create an identical content flag for the same post/type/source/moderator (should trigger duplicate constraint)
  await TestValidator.error(
    "Duplicate flag creation on the same target/type by the same moderator must fail",
  )(() =>
    api.functional.discussionBoard.moderator.contentFlags.create(connection, {
      body: contentFlagBody,
    }),
  );
}
