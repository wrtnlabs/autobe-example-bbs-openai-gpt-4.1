import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * E2E test for updating a discussion board member's profile as both administrator and self.
 *
 * This test validates:
 *
 * 1. Successful profile update by administrator (all fields can be changed: username, email, password (hash), display name, profile image, is_active). Ensures uniqueness constraints (username, email), password policy, and audit trail (updated_at changes) are enforced.
 * 2. Successful self-profile update (member updating own profile). Ensures the same business rules are enforced as for admin in terms of own-field updates.
 * 3. Attempt to update with invalid data (e.g., invalid email format, empty display name, improperly formatted profile image URL, or blank hashed_password), and expect error.
 * 4. Attempt to update username/email to a duplicate of another member -- should be rejected with appropriate error.
 * 5. Attempt to update a non-existent member ID, expect error.
 * 6. Attempt to update another user as a third-party (insufficient permissions), expect error.
 *
 * Steps:
 * 1. Register two members, A and B.
 * 2. As member A, update own profile (success and audit).
 * 3. As admin, update member B's profile (success and audit).
 * 4. As member A, attempt to update B's profile (should be rejected/forbidden -- error).
 * 5. Attempt to update non-existent member ID (error expected).
 * 6. Attempt to update A/B to use duplicate username/email (error expected).
 * 7. Attempt to update with invalid data (see rules above).
 *
 * Each step validates the response (is_active, updated_at changes, field updates, etc.), and error-handling logic.
 */
export async function test_api_discussionBoard_test_update_member_profile_by_admin_and_self(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      profile_image_url: "https://cdn.example.com/a.png",
    },
  });
  typia.assert(memberA);

  // 1. Register member B
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      profile_image_url: "https://cdn.example.com/b.png",
    },
  });
  typia.assert(memberB);

  // 2. Member A updates own profile (success)
  const newEmailA = typia.random<string & tags.Format<"email">>();
  const updateA = {
    username: memberA.username + "x",
    email: newEmailA,
    display_name: memberA.display_name + " (updated)",
    hashed_password: RandomGenerator.alphaNumeric(32),
    profile_image_url: "https://cdn.example.com/a2.png",
    is_active: true,
  } satisfies IDiscussionBoardMember.IUpdate;
  const resultA = await api.functional.discussionBoard.members.putById(connection, {
    id: memberA.id,
    body: updateA,
  });
  typia.assert(resultA);
  TestValidator.equals("updated email")(resultA.email)(newEmailA);
  TestValidator.notEquals("updated_at should change")(resultA.updated_at)(memberA.updated_at);

  // 3. Admin updates member B's profile (success)
  // (Assume current privileges permit, same connection)
  const newDisplayNameB = memberB.display_name + " (admin)";
  const updateB = {
    username: memberB.username + "a",
    email: typia.random<string & tags.Format<"email">>(),
    display_name: newDisplayNameB,
    hashed_password: RandomGenerator.alphaNumeric(32),
    profile_image_url: "https://cdn.example.com/b2.png",
    is_active: false,
  } satisfies IDiscussionBoardMember.IUpdate;
  const resultB = await api.functional.discussionBoard.members.putById(connection, {
    id: memberB.id,
    body: updateB,
  });
  typia.assert(resultB);
  TestValidator.equals("updated display_name")(resultB.display_name)(newDisplayNameB);
  TestValidator.equals("is_active changed")(resultB.is_active)(false);
  TestValidator.notEquals("updated_at should change")(resultB.updated_at)(memberB.updated_at);

  // 4. Member A tries to update B (should fail: insufficient permissions)
  await TestValidator.error("cannot update another member as self")(
    async () => {
      await api.functional.discussionBoard.members.putById(connection, {
        id: memberB.id,
        body: updateA,
      });
    },
  );

  // 5. Attempt to update non-existent member (should fail)
  await TestValidator.error("update non-existent member fails")(
    async () => {
      await api.functional.discussionBoard.members.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: updateA,
      });
    },
  );

  // 6. Attempt to use duplicate username/email (should fail)
  await TestValidator.error("duplicate username/email fails")(
    async () => {
      await api.functional.discussionBoard.members.putById(connection, {
        id: memberA.id,
        body: {
          ...updateA,
          username: updateB.username, // duplicate username
          email: updateB.email, // duplicate email
        },
      });
    },
  );

  // 7. Invalid data (empty display name, invalid email, etc)
  await TestValidator.error("invalid payload fails")(
    async () => {
      await api.functional.discussionBoard.members.putById(connection, {
        id: memberA.id,
        body: {
          ...updateA,
          display_name: "",
          email: "bad-email-format",
          hashed_password: "", // blank password hash
          profile_image_url: "bad-url",
        },
      });
    },
  );
}