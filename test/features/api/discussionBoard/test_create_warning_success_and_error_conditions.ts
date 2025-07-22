import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

/**
 * Test creation of discussion board warnings by a moderator, verifying both successful and error conditions.
 *
 * This end-to-end test covers legitimate warning creation (by moderator to member), audit validation, and a range of error scenarios including non-existent members, unprivileged issuers, and input validation for type/format errors.
 *
 * Steps:
 * 1. Create a regular member as the warning recipient
 * 2. Create a second member and assign them as a moderator
 * 3. Issue a valid warning as the moderator to the member (specify warning_type, message, and expires_at)
 * 4. Validate that returned warning record has correct member/moderator, message, type, and expiration
 * 5. Error: Try to warn a non-existent member (random UUID)
 * 6. Error: Try to warn as a random user without moderator role
 * 7. Error: Invalid warning_type given (empty string)
 * 8. Error: Invalid expires_at (malformed date)
 */
export async function test_api_discussionBoard_test_create_warning_success_and_error_conditions(
  connection: api.IConnection,
) {
  // 1. Create a regular member (target of warning)
  const member: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a moderator candidate, then assign moderator role
  const moderatorMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(moderatorMember);

  const moderator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderators.post(connection, {
      body: {
        member_id: moderatorMember.id,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Issue a valid warning from moderator to member
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 24h from now
  const warningType = "harassment";
  const warningMessage = "Inappropriate content posted.";

  const warning: IDiscussionBoardWarning =
    await api.functional.discussionBoard.warnings.post(connection, {
      body: {
        member_id: member.id,
        moderator_id: moderatorMember.id,
        warning_type: warningType,
        message: warningMessage,
        expires_at: expires,
      } satisfies IDiscussionBoardWarning.ICreate,
    });
  typia.assert(warning);
  TestValidator.equals("member_id matches")(warning.member_id)(member.id);
  TestValidator.equals("moderator_id matches")(warning.moderator_id)(moderatorMember.id);
  TestValidator.equals("type matches")(warning.warning_type)(warningType);
  TestValidator.equals("message matches")(warning.message)(warningMessage);
  TestValidator.equals("expires_at matches")(warning.expires_at)(expires);

  // 5. Error: Non-existent member
  await TestValidator.error("warns non-existent member fails")(
    () =>
      api.functional.discussionBoard.warnings.post(connection, {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          moderator_id: moderatorMember.id,
          warning_type: warningType,
          message: warningMessage,
          expires_at: expires,
        } satisfies IDiscussionBoardWarning.ICreate,
      }),
  );

  // 6. Error: Unauthorized (user without moderator role)
  // Create a new member (not moderator)
  const randomMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(randomMember);

  await TestValidator.error("user without moderator role forbidden")(
    () =>
      api.functional.discussionBoard.warnings.post(connection, {
        body: {
          member_id: member.id,
          moderator_id: randomMember.id,
          warning_type: warningType,
          message: warningMessage,
          expires_at: expires,
        } satisfies IDiscussionBoardWarning.ICreate,
      }),
  );

  // 7. Error: Invalid warning_type (empty string)
  await TestValidator.error("invalid warning_type")(
    () =>
      api.functional.discussionBoard.warnings.post(connection, {
        body: {
          member_id: member.id,
          moderator_id: moderatorMember.id,
          warning_type: "",
          message: warningMessage,
          expires_at: expires,
        } satisfies IDiscussionBoardWarning.ICreate,
      }),
  );

  // 8. Error: Invalid expires_at (malformed date)
  await TestValidator.error("invalid expires_at format")(
    () =>
      api.functional.discussionBoard.warnings.post(connection, {
        body: {
          member_id: member.id,
          moderator_id: moderatorMember.id,
          warning_type: warningType,
          message: warningMessage,
          expires_at: "not-a-date",
        } satisfies IDiscussionBoardWarning.ICreate,
      }),
  );
}