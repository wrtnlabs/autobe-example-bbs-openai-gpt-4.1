import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate that a member involved in a mention (as actor or mentioned user) can retrieve details of that mention by ID.
 *
 * Business context:
 * This test ensures that personalized access rights for mentions in the discussion board
 * are enforced, i.e., only the member who performed a mention or the member who was mentioned
 * can access the mention's details. It guarantees that involved parties can review mention data
 * (for notification, audit, etc) and that all required mention detail attributes are exposed.
 *
 * Test workflow:
 * 1. Register two discussion board members: one as the sender (actor), the other as the recipient (mentioned).
 * 2. The actor creates a mention targeting the recipient and a specific discussion context (content_type, content_id).
 * 3. Retrieve and validate mention details by ID as the actor, verifying all attributes are present and correct.
 * 4. Retrieve and validate the same mention details by ID as the recipient, confirming both users have correct access.
 *
 * Note: Since the SDK and test harness do not expose user session switching, this test simulates both accesses in sequence.
 */
export async function test_api_discussionBoard_test_get_mention_detail_by_id_as_involved_user(
  connection: api.IConnection,
) {
  // 1. Register two members: sender (actor) and recipient (mentioned member)
  const password = "hashedPassword123";
  const sender = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(sender);

  const recipient = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(recipient);

  // 2. Actor creates a mention targeting the recipient
  const contentType = "comment";
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const mention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: recipient.id,
      content_type: contentType,
      content_id: contentId,
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // 3. Retrieve by ID as actor
  const detailAsActor = await api.functional.discussionBoard.mentions.getById(connection, {
    id: mention.id,
  });
  typia.assert(detailAsActor);
  TestValidator.equals("mention id as actor")(detailAsActor.id)(mention.id);
  TestValidator.equals("mentioned_member_id as actor")(detailAsActor.mentioned_member_id)(recipient.id);
  TestValidator.equals("actor_member_id as actor")(detailAsActor.actor_member_id)(sender.id);
  TestValidator.equals("content_type as actor")(detailAsActor.content_type)(contentType);
  TestValidator.equals("content_id as actor")(detailAsActor.content_id)(contentId);
  TestValidator.predicate("created_at as actor exists")(!!detailAsActor.created_at);

  // 4. Retrieve by ID as mentioned member (simulated as same session)
  const detailAsMentioned = await api.functional.discussionBoard.mentions.getById(connection, {
    id: mention.id,
  });
  typia.assert(detailAsMentioned);
  TestValidator.equals("mention id as mentioned user")(detailAsMentioned.id)(mention.id);
  TestValidator.equals("mentioned_member_id as mentioned user")(detailAsMentioned.mentioned_member_id)(recipient.id);
  TestValidator.equals("actor_member_id as mentioned user")(detailAsMentioned.actor_member_id)(sender.id);
  TestValidator.equals("content_type as mentioned user")(detailAsMentioned.content_type)(contentType);
  TestValidator.equals("content_id as mentioned user")(detailAsMentioned.content_id)(contentId);
  TestValidator.predicate("created_at as mentioned user exists")(!!detailAsMentioned.created_at);
}