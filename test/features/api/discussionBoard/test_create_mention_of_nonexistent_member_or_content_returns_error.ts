import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate error handling for mentioning a nonexistent member or referencing nonexistent content.
 *
 * This test ensures that when attempting to create a discussion board mention with either a non-existent member ID or a non-existent content ID, the API responds with an appropriate error (validation or not found). Exercises both negative paths separately.
 *
 * Step-by-step process:
 * 1. Register a real discussion board member ("actor") for authentication context.
 * 2. Attempt to create a mention where mentioned_member_id is a random (non-existent) UUID, but content_type/content_id are valid/newly generated.
 *    - Expect 404 or 400 error (member not found)
 * 3. Attempt to create a mention referencing a random (non-existent) content_id, with mentioned_member_id being a real member.
 *    - Expect 404 or 400 error (content not found)
 * 4. (Optional) Attempt both fields as random (non-existent) — optional, as the above cover the critical cases.
 *
 * Each error condition should trigger the system's appropriate error handling, tested via TestValidator.error.
 */
export async function test_api_discussionBoard_test_create_mention_of_nonexistent_member_or_content_returns_error(
  connection: api.IConnection,
) {
  // 1. Register an "actor" member
  const actorInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(),
  };
  const actor = await api.functional.discussionBoard.members.post(connection, {
    body: actorInput,
  });
  typia.assert(actor);

  // 2. Attempt mention with non-existent mentioned_member_id
  TestValidator.error("mentioning a nonexistent user should fail")(async () => {
    await api.functional.discussionBoard.mentions.post(connection, {
      body: {
        mentioned_member_id: typia.random<string & tags.Format<"uuid">>(), // Likely not an actual member
        content_type: "post",
        content_id: typia.random<string & tags.Format<"uuid">>(), // Assume random content, but path is to test member not found
      },
    });
  });

  // 3. Attempt mention referencing a non-existent content_id, but real member
  TestValidator.error("mentioning on nonexistent content should fail")(async () => {
    await api.functional.discussionBoard.mentions.post(connection, {
      body: {
        mentioned_member_id: actor.id,
        content_type: "post",
        content_id: typia.random<string & tags.Format<"uuid">>(), // Invalid content
      },
    });
  });
}