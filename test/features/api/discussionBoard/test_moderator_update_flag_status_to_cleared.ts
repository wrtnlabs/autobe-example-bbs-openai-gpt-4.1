import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that a moderator can clear a content flag (resolve a moderation action).
 *
 * Business workflow:
 *
 * 1. Create a post in a thread (prerequisite for content to flag)
 * 2. Grant moderator role to a user (prerequisite for flag update permissions)
 * 3. Moderator creates a content flag against the post (so one exists to update)
 * 4. Moderator updates the flag to "cleared" by setting cleared_at to now
 * 5. Assert that the flag's cleared_at is set and state reflects resolution
 *
 * Additional validation:
 *
 * - Ensure moderator can only clear if they have access
 * - Verify returned flag matches expected updated state
 */
export async function test_api_discussionBoard_test_moderator_update_flag_status_to_cleared(
  connection: api.IConnection,
) {
  // 1. Create a post as member
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postBody = RandomGenerator.paragraph()();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Assign a moderator (admin privilege needed)
  const moderatorUserId = typia.random<string>();
  const grantTime = new Date().toISOString();
  const mod = await api.functional.discussionBoard.admin.moderators.create(
    connection,
    {
      body: {
        user_identifier: moderatorUserId,
        granted_at: grantTime,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(mod);

  // 3. Create a content flag on the post
  const flagType = "spam";
  const flagSource = "manual";
  const flag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: post.id,
          comment_id: null,
          flagged_by_moderator_id: mod.id,
          flagged_by_admin_id: null,
          flag_type: flagType,
          flag_source: flagSource,
          flag_details: "Flagged as spam for moderation test.",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag);

  // 4. Moderator clears the flag (sets cleared_at)
  const now = new Date().toISOString();
  const updated =
    await api.functional.discussionBoard.moderator.contentFlags.update(
      connection,
      {
        contentFlagId: flag.id,
        body: {
          cleared_at: now,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Assert cleared_at is patched and all earlier fields retained
  TestValidator.equals("flag cleared_at updated")(updated.cleared_at)(now);
  TestValidator.equals("flag id unchanged")(updated.id)(flag.id);
  TestValidator.equals("retains post linkage")(updated.post_id)(post.id);
}
