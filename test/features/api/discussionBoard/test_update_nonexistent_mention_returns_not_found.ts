import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Test updating a mention with a non-existent ID to verify proper not found error handling.
 *
 * Business context:
 * Only moderators and admins can update mention records, and such updates are rare, meant for moderation or correction. This test ensures that if an update is attempted for a mention ID that does not exist (i.e., the resource is missing or mis-targeted), the API responds with an appropriate 'not found' error. This is vital for robust admin tooling and correct user feedback when an attempt is made to moderate or edit a fabricated, deleted, or misreferenced mention event.
 *
 * Workflow:
 * 1. Create an admin or moderator member for privileged context/pre-auth (dependency).
 * 2. Attempt to update a mention using an ID that is guaranteed not to exist (random UUID not present in DB).
 * 3. Validate that the API returns a not found error. The function should throw; this is validated for error correctness but without inspecting the error message body or type.
 */
export async function test_api_discussionBoard_test_update_nonexistent_mention_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Create an admin or moderator for privilege context
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(adminMember);

  // 2. Attempt to update a mention with a non-existent ID
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardMention.IUpdate = {
    mentioned_member_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: "comment",
    content_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Expect a not found error (the API should throw)
  await TestValidator.error("update non-existent mention should return not found error")(
    () =>
      api.functional.discussionBoard.mentions.putById(connection, {
        id: nonexistentId,
        body: updateBody,
      }),
  );
}