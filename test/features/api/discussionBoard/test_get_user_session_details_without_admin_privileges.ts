import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Ensure non-admin actors cannot access admin-only session details endpoint.
 *
 * This test verifies that attempting to access
 * `/discussionBoard/admin/userSessions/{userSessionId}` as a member (not an
 * admin) results in a permission error, confirming security and role gating
 * controls are working as intended.
 *
 * 1. Create a session record as a MEMBER (non-admin).
 * 2. Attempt to fetch the session via the ADMIN endpoint while using a MEMBER or
 *    guest role.
 * 3. Confirm that an error is thrown (access denied).
 */
export async function test_api_discussionBoard_test_get_user_session_details_without_admin_privileges(
  connection: api.IConnection,
) {
  // 1. Simulate a MEMBER session creation (non-admin)
  const now = new Date();
  const sessionCreateInput: IDiscussionBoardUserSession.ICreate = {
    actor_type: "member",
    actor_identifier: RandomGenerator.alphaNumeric(10),
    session_token: RandomGenerator.alphaNumeric(36),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
  };
  const memberSession: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: sessionCreateInput,
    });
  typia.assert(memberSession);

  // 2. Attempt to access admin-only session endpoint using member credentials
  await TestValidator.error("member should not access admin session details")(
    async () => {
      await api.functional.discussionBoard.admin.userSessions.at(connection, {
        userSessionId: memberSession.id,
      });
    },
  );

  // 3. Optionally repeat for guest
  const guestSessionCreateInput: IDiscussionBoardUserSession.ICreate = {
    actor_type: "guest",
    actor_identifier: RandomGenerator.alphaNumeric(10),
    session_token: RandomGenerator.alphaNumeric(36),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
  };
  const guestSession: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: guestSessionCreateInput,
    });
  typia.assert(guestSession);

  await TestValidator.error("guest should not access admin session details")(
    async () => {
      await api.functional.discussionBoard.admin.userSessions.at(connection, {
        userSessionId: guestSession.id,
      });
    },
  );
}
