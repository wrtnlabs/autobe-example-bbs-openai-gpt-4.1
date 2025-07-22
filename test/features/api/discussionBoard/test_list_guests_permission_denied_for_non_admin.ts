import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a regular member cannot list guest sessions (permission denied).
 *
 * This test ensures that the guest listing endpoint `/discussionBoard/guests` is protected and only accessible by administrative roles. It validates that a standard user (registered member but not admin) receives an error response when attempting to list guest sessions.
 *
 * Steps:
 * 1. Register a new standard member (non-admin).
 * 2. Attempt to access the guest listing endpoint using this member's session.
 * 3. Confirm that the API returns an error (e.g., forbidden, unauthorized, or similar) indicating insufficient permissions for listing guests.
 * 4. Ensure that the error occurs at runtime and does not violate TypeScript typing.
 * 5. Do not validate the response error message text or type, only that error is thrown.
 */
export async function test_api_discussionBoard_test_list_guests_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a regular (non-admin) member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const regularMember = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(regularMember);

  // (If authentication context is changed automatically, proceed. Otherwise, test as is.)

  // 2. Attempt to list guests as a non-admin
  await TestValidator.error("permission denied for non-admin member")(
    async () => {
      await api.functional.discussionBoard.guests.patch(connection, {
        body: {}, // minimal valid request with no filters
      });
    }
  );
}