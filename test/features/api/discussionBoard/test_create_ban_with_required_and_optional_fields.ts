import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

/**
 * Test ban creation workflows and ensure correct enforcement of business/validation rules.
 *
 * This test verifies both successful and failure scenarios for banning members.
 * Ban records must be created properly (permanent and temporary), with required audit metadata,
 * and error handling must work for duplicate bans, non-existent targets, badly formed bans,
 * and privilege checks. Assumes all role information is referenced by member_id/moderator_id fields.
 *
 * **Workflow:**
 * 1. Register target member (ban subject)
 * 2. Register moderator/admin (ban authority)
 * 3. (Success) Moderator issues permanent ban on target; check data returned
 * 4. (Success) Issue a temporary ban (with expires_at in future) on a new target
 * 5. (Failure) Try to issue perm ban again (duplicate) – expect error
 * 6. (Failure) Ban a non-existent member – expect error
 * 7. (Failure) Temporary ban with past expires_at – validation error
 * 8. (Failure) Ban by unprivileged user (basic member as moderator) – forbidden
 */
export async function test_api_discussionBoard_test_create_ban_with_required_and_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register a member to be the ban target
  const targetMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      // optional profile_image_url omitted
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(targetMember);

  // 2. Register a member to act as moderator/admin
  const moderatorMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderatorMember);

  // 3. (Success) Issue a permanent ban
  const banReason = "Test permanent ban: automated e2e scenario";
  const permBan = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id: targetMember.id,
      moderator_id: moderatorMember.id,
      ban_reason: banReason,
      permanent: true,
      // expires_at omitted for permanent ban
    } satisfies IDiscussionBoardBan.ICreate,
  });
  typia.assert(permBan);
  // Structure validation
  TestValidator.equals("ban is permanent")(permBan.permanent)(true);
  TestValidator.equals("correct member")(permBan.member_id)(targetMember.id);
  TestValidator.equals("correct moderator")(permBan.moderator_id)(moderatorMember.id);
  TestValidator.equals("ban reason matches")(permBan.ban_reason)(banReason);
  TestValidator.equals("expires_at null for permanent")(permBan.expires_at)(null);
  TestValidator.predicate("created_at is ISO 8601")(!!Date.parse(permBan.created_at));

  // 4. (Success) Issue a temporary ban (future expires_at) on new member
  const tempBanTarget = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(tempBanTarget);
  const tempBanReason = "Test temporary ban - will expire soon";
  const futureDate = new Date(Date.now() + 86400 * 1000).toISOString(); // +1 day
  const tempBan = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id: tempBanTarget.id,
      moderator_id: moderatorMember.id,
      ban_reason: tempBanReason,
      permanent: false,
      expires_at: futureDate,
    } satisfies IDiscussionBoardBan.ICreate,
  });
  typia.assert(tempBan);
  TestValidator.equals("ban is temporary")(tempBan.permanent)(false);
  TestValidator.equals("expires_at set")(tempBan.expires_at)(futureDate);
  TestValidator.equals("ban reason")(tempBan.ban_reason)(tempBanReason);

  // 5. (Failure) Try to re-ban with a permanent ban on an already-permanently-banned member
  await TestValidator.error("permanent re-ban should fail")(async () => {
    await api.functional.discussionBoard.bans.post(connection, {
      body: {
        member_id: targetMember.id,
        moderator_id: moderatorMember.id,
        ban_reason: "Second attempt permanent ban - must error",
        permanent: true,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  });

  // 6. (Failure) Try to ban a totally non-existent member
  await TestValidator.error("ban on non-existent member fails")(async () => {
    await api.functional.discussionBoard.bans.post(connection, {
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(), // random uuid (nonexistent)
        moderator_id: moderatorMember.id,
        ban_reason: "Should fail - fake member",
        permanent: true,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  });

  // 7. (Failure) Try to issue a temporary ban with an expires_at in the past
  const pastDate = new Date(Date.now() - 86400 * 1000).toISOString(); // yesterday
  await TestValidator.error("temp ban with past expires_at fails")(async () => {
    await api.functional.discussionBoard.bans.post(connection, {
      body: {
        member_id: tempBanTarget.id,
        moderator_id: moderatorMember.id,
        ban_reason: "Past expiry - should fail",
        permanent: false,
        expires_at: pastDate,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  });

  // 8. (Failure) Attempt ban by unprivileged user (using new member as moderator_id)
  const ordinaryMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(ordinaryMember);
  await TestValidator.error("ban attempt by basic user should fail")(async () => {
    await api.functional.discussionBoard.bans.post(connection, {
      body: {
        member_id: tempBanTarget.id,
        moderator_id: ordinaryMember.id, // not a moderator/admin
        ban_reason: "Should fail: non-privilege member as moderator_id",
        permanent: true,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  });
}