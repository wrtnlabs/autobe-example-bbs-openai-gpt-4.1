import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate mention privacy: unrelated user cannot access another's mention detail
 *
 * This test verifies RBAC and privacy by ensuring that only the sender (actor) or mentioned user can view a given mention record.
 * The test ensures that access as a third-party (not sender or mentioned) is strictly forbidden (HTTP 403), according to business requirements.
 *
 * Workflow:
 * 1. Create three member accounts (sender, mentioned, unrelated), each with unique usernames/emails.
 * 2. As sender (actor), create a mention targeting the mentioned user (with random content_type/id).
 * 3. Confirm the mention is created and capture its ID.
 * 4. Switch to the unrelated user (simulating new user context; see note below).
 * 5. Attempt to fetch the mention by ID as the unrelated user and validate that this request fails with a forbidden error.
 *
 * Note: As no authentication/login API is provided, this test assumes the connection context can act as each member in sequence, or that the test harness provides such isolation. Replace context switch with real authentication if login API is exposed in the future.
 */
export async function test_api_discussionBoard_test_get_mention_detail_for_other_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Create sender (actor) member
  const sender = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(sender);

  // 2. Create mentioned member
  const mentioned = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(mentioned);

  // 3. Create unrelated (third-party) member
  const unrelated = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(unrelated);

  // 4. As sender (actor), create a mention targeting mentioned member
  const mention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: mentioned.id,
      content_type: "post",
      content_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // ---
  // 5. Switch context to unrelated user for forbidden access (see note above)
  //    Here we reuse the connection and assume the test harness can simulate user context switching.
  //    The key is that unrelated.id is not mention.actor_member_id nor mention.mentioned_member_id.
  // ---
  TestValidator.error(
    "Unrelated member cannot access mention detail",
  )(async () => {
    await api.functional.discussionBoard.mentions.getById(connection, {
      id: mention.id,
    });
  });
}