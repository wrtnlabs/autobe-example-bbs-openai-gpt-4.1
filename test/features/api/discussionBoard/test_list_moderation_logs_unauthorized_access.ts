import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an ordinary discussion board member (non-moderator) cannot access moderation logs.
 *
 * This test verifies strict enforcement of role-based access control for moderation log viewing. Only users with moderator or administrator privileges should be able to access the moderation logs endpoint.
 *
 * Steps:
 * 1. Register a new test member (ordinary user, not a moderator or admin)
 * 2. Attempt to call the moderation logs listing endpoint using this member's context
 * 3. Confirm that a 403 Forbidden or other role-based access error is thrown, and no data is leaked
 */
export async function test_api_discussionBoard_test_list_moderation_logs_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a new test member (ordinary user)
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Attempt to retrieve moderation logs as ordinary member
  await TestValidator.error("Non-moderator cannot read moderation logs")(
    async () => {
      await api.functional.discussionBoard.moderationLogs.patch(connection, {
        body: {}, // No filters, default access attempt
      });
    },
  );
}