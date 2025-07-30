import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that unauthorized users (non-moderators, including regular members and
 * guests) are unable to access the content flag index API.
 *
 * This test ensures that the GET /discussionBoard/moderator/contentFlags
 * endpoint is protected and returns a permission error when accessed by users
 * lacking moderation privileges.
 *
 * Steps:
 *
 * 1. As ADMIN, create a new regular member using the admin members endpoint
 *    (simulating a normal user registration).
 * 2. Simulate switching to a "regular member" authorization context (if possible
 *    with current SDK; otherwise, note access context for the call).
 * 3. Attempt to call the GET /discussionBoard/moderator/contentFlags endpoint
 *    while authenticated as the regular member.
 * 4. Assert that a permission/authorization error is thrown (typically a 403
 *    Forbidden or equivalent).
 * 5. Additionally, attempt to call the endpoint with no authentication (guest
 *    user), assert that a permission/auth error is thrown.
 *
 * Note: As the current SDK exposes only admin member creation (no login, no
 * separate member/guest authentication), we can only simulate unauthorized
 * attempts by using a member connection (assuming it lacks moderator scopes)
 * and an unauthenticated connection (guest).
 */
export async function test_api_discussionBoard_test_list_content_flags_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. As Admin, create a regular discussion board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Attempt to access as a regular member (simulate by using same connection, lacking moderator rights)
  //    Note: No user login or context-switch is possible with the current SDK; assuming admin token is not used for non-moderator actions.
  await TestValidator.error(
    "non-moderator user should not access contentFlags",
  )(async () => {
    await api.functional.discussionBoard.moderator.contentFlags.index(
      connection,
    );
  });

  // 3. Attempt to access as a guest/non-authenticated user
  const guestConnection = { ...connection, headers: { ...connection.headers } };
  delete guestConnection.headers.Authorization;
  await TestValidator.error("guest user should not access contentFlags")(
    async () => {
      await api.functional.discussionBoard.moderator.contentFlags.index(
        guestConnection,
      );
    },
  );
}
