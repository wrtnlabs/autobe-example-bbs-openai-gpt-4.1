import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate successful creation of a discussion board member.
 *
 * This test ensures that when an administrator creates a new discussion board
 * member by providing a valid unique user_identifier (such as a UUID or
 * normalized SSO/email) and a valid join timestamp, the system creates and
 * persists the member record with all required fields populated correctly.
 *
 * Step-by-step process:
 *
 * 1. Generate a unique user_identifier (UUID format) and a current timestamp in
 *    ISO 8601 format for joined_at.
 * 2. Call the create API with the generated values to register the new member.
 * 3. Assert that the response contains a valid UUID id, user_identifier and
 *    joined_at match the input, and suspended_at is null or absent.
 */
export async function test_api_discussionBoard_admin_members_create(
  connection: api.IConnection,
) {
  // 1. Generate test input: unique user_identifier and current join timestamp
  const user_identifier: string = typia.random<string & tags.Format<"uuid">>();
  const joined_at: string = new Date().toISOString();

  // 2. Create the member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 3. Validate response fields against input
  TestValidator.equals("User identifier is set correctly")(
    member.user_identifier,
  )(user_identifier);
  TestValidator.equals("Joined at is set correctly")(member.joined_at)(
    joined_at,
  );
  TestValidator.predicate("Has a valid UUID id")(
    typeof member.id === "string" && member.id.length > 0,
  );
  TestValidator.equals("Member not suspended")(member.suspended_at ?? null)(
    null,
  );
}
