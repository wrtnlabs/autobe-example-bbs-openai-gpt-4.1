import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that an admin can permanently delete a content flag by its ID.
 *
 * Business context:
 *
 * - Admins can create and permanently (hard) delete moderation flags for posts or
 *   comments.
 * - This ensures that moderation history is accurately reflected and content
 *   flags are not lingering when removed by authorized actors.
 *
 * Steps:
 *
 * 1. Create a content flag as admin so we have a valid contentFlagId.
 * 2. Permanently delete (hard delete) the content flag as admin.
 * 3. (If a fetch endpoint existed, verify that the deleted flag is gone. Here,
 *    only create and erase endpoints are available, so deletion success is
 *    implied if no error is thrown.)
 */
export async function test_api_discussionBoard_test_delete_content_flag_successfully_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new flag to ensure a valid contentFlagId exists (as admin)
  const createInput = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
    flagged_by_moderator_id: null,
    flagged_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    flag_type: "spam",
    flag_source: "manual",
    flag_details: "Test: flag scheduled for deletion by admin",
  } satisfies IDiscussionBoardContentFlag.ICreate;
  const flag = await api.functional.discussionBoard.admin.contentFlags.create(
    connection,
    {
      body: createInput,
    },
  );
  typia.assert(flag);

  // 2. Delete the content flag as admin
  await api.functional.discussionBoard.admin.contentFlags.erase(connection, {
    contentFlagId: flag.id,
  });

  // 3. (Verification: If fetch/read API existed, attempt to access deleted flag and assert not found. Not possible with current SDK.)
}
