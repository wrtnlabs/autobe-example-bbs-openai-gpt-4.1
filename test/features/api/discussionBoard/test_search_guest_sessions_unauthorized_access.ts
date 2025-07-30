import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that only admin users are authorized to perform advanced guest
 * analytics search.
 *
 * This test attempts to use the discussionBoard admin guest session search
 * PATCH endpoint with a non-admin role. It verifies that an unauthenticated
 * guest is forbidden from performing advanced analytics searches and that the
 * API correctly returns an authentication/authorization error. The test
 * intentionally omits member and moderator flows due to absence of relevant
 * authentication API definitions.
 *
 * Steps:
 *
 * 1. Using guest (unauthenticated) connection, attempt PATCH search and check for
 *    error
 * 2. (Commented) Would attempt as member/moderator if auth APIs were present
 */
export async function test_api_discussionBoard_test_search_guest_sessions_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Guest (unauthenticated) connection attempt
  await TestValidator.error("guest cannot search guest analytics")(async () => {
    await api.functional.discussionBoard.admin.guests.search(connection, {
      body: {}, // minimal search request, all fields optional
    });
  });

  // 2. Member/Moderator flows would go here if authentication APIs existed.
  // Skipped due to lack of sign-up/login APIs in provided DTO/functions.
}
