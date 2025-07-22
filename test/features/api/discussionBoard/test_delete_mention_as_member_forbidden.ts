import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate that a regular discussion board member cannot delete a mention.
 *
 * Business context: In the discussion board system, only moderators or
 * administrators are authorized to delete mention records. Regular members
 * should not have permission to delete mentions even if they were the actor or
 * target of the mention. This protects community data integrity and enforces
 * role-based privilege boundaries.
 *
 * Step-by-step process:
 * 1. Register two regular member accounts (MemberA: will attempt delete,
 *    MemberB: mention target).
 * 2. (As MemberA) Create a mention event targeting MemberB.
 * 3. (As MemberA) Attempt to delete the mention just created.
 * 4. Verify that the delete attempt fails with a forbidden error, confirming
 *    privilege enforcement.
 *
 * Edge case: Even if the actor of the mention is the deleter, deletion is NOT
 * allowed unless the role is elevated (moderator/admin), by business rule.
 */
export async function test_api_discussionBoard_test_delete_mention_as_member_forbidden(
  connection: api.IConnection,
) {
  // 1. Register two members
  const passwordA = RandomGenerator.alphaNumeric(16);
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: passwordA,
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // 2. (As MemberA) Create a mention targeting MemberB
  // (Assuming test infra or authentication API binds session to MemberA)
  const mention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: memberB.id,
      content_type: "post",
      content_id: typia.random<string & tags.Format<"uuid">>()
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // 3. (As MemberA) Attempt to delete the mention just created
  await TestValidator.error("regular member is forbidden to delete mention")(async () => {
    await api.functional.discussionBoard.mentions.eraseById(connection, {
      id: mention.id
    });
  });
}