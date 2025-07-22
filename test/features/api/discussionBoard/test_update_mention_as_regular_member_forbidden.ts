import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Test that a regular (non-admin, non-moderator) member is forbidden from updating a mention event.
 *
 * This validates that only privileged roles (admin, mod) can update mention records, as per API business logic.
 *
 * Test process:
 * 1. Register two ordinary member accounts: 'actor' (who will attempt the forbidden update) and 'target' (the member to be mentioned).
 * 2. As the actor, create a mention event targeting the target member.
 * 3. Attempt to update the mention record as the actor member (still a non-privileged role).
 * 4. Expect a forbidden (HTTP 403) error and verify that the update is not allowed for regular members.
 */
export async function test_api_discussionBoard_test_update_mention_as_regular_member_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the actor member (will attempt the forbidden action)
  const actorUsername = RandomGenerator.alphaNumeric(8);
  const actorEmail = typia.random<string & tags.Format<"email">>();
  const actorPasswordHash = RandomGenerator.alphaNumeric(16);
  const actorDisplayName = RandomGenerator.name();

  const actor = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: actorUsername,
      email: actorEmail,
      hashed_password: actorPasswordHash,
      display_name: actorDisplayName,
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(actor);

  // 2. Register the target member (to be mentioned)
  const targetUsername = RandomGenerator.alphaNumeric(8);
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPasswordHash = RandomGenerator.alphaNumeric(16);
  const targetDisplayName = RandomGenerator.name();

  const target = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: targetUsername,
      email: targetEmail,
      hashed_password: targetPasswordHash,
      display_name: targetDisplayName,
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(target);

  // 3. As the actor, create a mention targeting the target
  const mention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: target.id,
      content_type: "post",
      content_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // 4. Attempt to update the mention as a regular member; expect forbidden error
  await TestValidator.error("Regular member cannot update mention")(
    () =>
      api.functional.discussionBoard.mentions.putById(connection, {
        id: mention.id,
        body: { content_type: "comment" } satisfies IDiscussionBoardMention.IUpdate,
      }),
  );
}