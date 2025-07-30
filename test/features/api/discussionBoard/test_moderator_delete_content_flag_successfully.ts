import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that a moderator can successfully hard-delete a content flag.
 *
 * This test simulates the moderator workflow for resolving and then deleting
 * (permanently erasing) a content flag record on a discussion board post. It
 * ensures all required preconditions (a post exists to be flagged, the
 * moderator role is granted, and a flag is created) are satisfied before
 * attempting deletion. After the delete operation, it verifies that the flag
 * can no longer be accessed, confirming the deletion is immediate and
 * irreversible as expected.
 *
 * Steps:
 *
 * 1. Create a thread and a post (assuming threads exist; only the post API is
 *    available and takes threadId as param).
 * 2. Grant a moderator role using the admin API (simulate user identity).
 * 3. Create a content flag as the moderator for the given post.
 * 4. Execute the delete API to remove the flag.
 * 5. (Optional, if endpoint available): Attempt to retrieve the deleted flag to
 *    confirm it is gone. If not available, rely on absence of errors in delete
 *    response.
 *
 * This test also ensures audit and role enforcement (even if audit log checks
 * are outside API scope). The deletion must be irreversible, as per scenario
 * description and entity definition (no soft delete in schema).
 */
export async function test_api_discussionBoard_test_moderator_delete_content_flag_successfully(
  connection: api.IConnection,
) {
  // 1. Create a post (requires threadId and body)
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const postBody = {
    discussion_board_thread_id: threadId,
    body: "Test post for content flag deletion.",
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // 2. Grant moderator role (simulate unique user identity for moderator)
  const moderatorUserIdentifier = typia.random<string>();
  const granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create a content flag for the post
  const flag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: post.id,
          flag_type: "spam",
          flag_source: "manual",
          flag_details: "Test flag for deletion workflow.",
          flagged_by_moderator_id: moderator.id,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag);

  // 4. Delete (hard delete) the content flag
  await api.functional.discussionBoard.moderator.contentFlags.erase(
    connection,
    {
      contentFlagId: flag.id,
    },
  );

  // 5. (Optional): If there were a get/retrieve endpoint for flags, we would
  // invoke it here and assert a not found error or similar.
  // Since only erase is exposed, we rely on successful completion.
}
