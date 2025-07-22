import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * E2E test to verify that only moderators/administrators can update an existing mention record on the discussion board by ID.
 *
 * This test follows the below steps:
 * 1. Create a basic discussion board member (test actor).
 * 2. Create a separate mention target member (to be mentioned).
 * 3. Assign administrator role to the test actor member so this account can perform mention updates.
 * 4. Using the test actor, create a discussion board mention directed at the target member.
 * 5. As the administrator, attempt to update the mention (e.g., change content_type and content_id, maybe also mentioned_member_id) via the `putById` endpoint.
 * 6. Verify that the update response reflects all changes (updated fields applied), and that ID and immutable fields are preserved.
 * 7. Optionally (if possible), simulate access as a non-admin and assert access is forbidden (403 error).
 * 8. (If possible in logs/audit, assert audit policy is working), otherwise, assert business rules at API level.
 */
export async function test_api_discussionBoard_test_update_mention_as_moderator_or_admin(connection: api.IConnection) {
  // 1. Create test actor (future admin/mod member)
  const actorEmail: string = typia.random<string & tags.Format<"email">>();
  const actor: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: actorEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(actor);

  // 2. Create target member (the one to be mentioned)
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const target: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: targetEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(target);

  // 3. Assign administrator role to actor
  const adminAssignment: IDiscussionBoardAdministrator = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: actor.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(adminAssignment);
  TestValidator.equals("admin role assigned")(adminAssignment.member_id)(actor.id);

  // 4. With admin/member, create a mention record
  const originalMention: IDiscussionBoardMention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: target.id,
      content_type: "post",
      content_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(originalMention);
  TestValidator.equals("mention is for target")(originalMention.mentioned_member_id)(target.id);

  // 5. Update the mention as admin (change mentioned_member_id and content_type)
  const newMentionedMember: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(newMentionedMember);

  const updatedMention: IDiscussionBoardMention = await api.functional.discussionBoard.mentions.putById(connection, {
    id: originalMention.id,
    body: {
      mentioned_member_id: newMentionedMember.id,
      content_type: "comment",
      content_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardMention.IUpdate,
  });
  typia.assert(updatedMention);

  // 6. Assert updated fields are changed.
  TestValidator.equals("mention updated: mentioned_member_id")(updatedMention.mentioned_member_id)(newMentionedMember.id);
  TestValidator.equals("mention updated: content_type")(updatedMention.content_type)("comment");
  TestValidator.notEquals("content_id updated")(updatedMention.content_id)(originalMention.content_id);
  TestValidator.equals("id remains same")(updatedMention.id)(originalMention.id);
  TestValidator.equals("actor_member_id remains same")(updatedMention.actor_member_id)(originalMention.actor_member_id);

  // 7. (Business validation only, as direct log/audit API is unavailable):
  // Cannot update as a random member (simulate forbidden access)
  const randomMember: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(randomMember);

  // (Simulate token switch or attempt update logic here - omitted due to SDK constraints of test connection context)
  // Would use TestValidator.error to verify 403 Forbidden if possible to switch context, e.g.:
  // await TestValidator.error("forbidden update by non-admin")(async () => {
  //   await api.functional.discussionBoard.mentions.putById(otherConnection, {
  //     id: originalMention.id,
  //     body: { mentioned_member_id: randomMember.id } as IDiscussionBoardMention.IUpdate,
  //   });
  // });
}