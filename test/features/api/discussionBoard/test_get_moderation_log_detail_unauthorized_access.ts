import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate access control to moderation log details for unauthorized users (ordinary member or guest).
 *
 * This test verifies that only users with moderator or administrator roles are authorized to access a moderation log detail endpoint. Ordinary members and guests must be denied access (typically 403 Forbidden).
 *
 * Steps:
 * 1. Register a non-privileged member (not a moderator/admin) using the member registration endpoint.
 * 2. As any authorized user (or using direct API), create a valid moderation log entry and capture its ID for testing.
 * 3. Attempt to access the moderation log details using the non-privileged member account and verify the request fails (403/forbidden).
 * 4. Logout (clear authentication), and as guest (unauthenticated), attempt to access the moderation log details and verify denial (expected forbidden/unauthorized).
 *
 * This ensures access controls for moderation log details are strictly enforced against non-authorized users and guests.
 */
export async function test_api_discussionBoard_test_get_moderation_log_detail_unauthorized_access(connection: api.IConnection) {
  // 1. Register a non-privileged member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      hashed_password: memberPassword,
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a moderation log entry for testing (we use the just-created member as moderator, due to privilege simulation constraints)
  const logCreateInput = {
    moderator_id: member.id, // No explicit privilege simulation available
    action: "hide",
    action_reason: "E2E test moderation log (should be inaccessible)",
  } satisfies IDiscussionBoardModerationLog.ICreate;
  const log: IDiscussionBoardModerationLog = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: logCreateInput,
  });
  typia.assert(log);

  // 3. Attempt to access moderation log detail as ordinary member (expected to fail with 403/forbidden)
  await TestValidator.error("Ordinary member cannot access moderation log details")(
    async () => {
      await api.functional.discussionBoard.moderationLogs.getById(connection, {
        id: log.id,
      });
    }
  );

  // 4. Attempt as unauthenticated (guest) user
  const guestConnection: api.IConnection = { ...connection, headers: {} }; // Remove auth headers (simulate guest)
  await TestValidator.error("Guest cannot access moderation log details")(
    async () => {
      await api.functional.discussionBoard.moderationLogs.getById(guestConnection, {
        id: log.id,
      });
    }
  );
}