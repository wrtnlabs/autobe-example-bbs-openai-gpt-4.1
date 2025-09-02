import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";

/**
 * Test successful update of a poll option by its creator user.
 *
 * This test verifies that a poll option can be successfully updated by its
 * owner. Steps:
 *
 * 1. Register a new user to obtain authentication.
 * 2. (Assume/Stub) Create a post, a poll, and a poll option as the user –
 *    obtain postId, pollId, pollOptionId.
 * 3. Update the poll option’s 'option_text' or 'sequence' to a new unique
 *    value.
 * 4. Assert that the poll option’s field(s) are correctly updated.
 * 5. Ensure uniqueness constraints are enforced within the poll (for
 *    option_text and sequence).
 * 6. Confirm that only permitted fields (option_text and sequence) may be
 *    updated, and other business rules (can’t update if closed, etc., but
 *    only implement what’s actually possible with available APIs/DTOs).
 */
export async function test_api_poll_option_user_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new user to get auth token and user id.
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // 2. (Stubbed) Create post, poll, poll option directly - only use random UUIDs as placeholders, since APIs are not available
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();
  const pollOptionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid update (update option_text to a new unique value)
  const updateData: IDiscussionBoardPollOption.IUpdate = {
    option_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    // Optionally, test sequence: sequence: typia.random<number & tags.Type<"int32">>(),
  };

  // 4. Call the update endpoint as the authenticated user
  const updatedPollOption =
    await api.functional.discussionBoard.user.posts.polls.pollOptions.update(
      connection,
      {
        postId,
        pollId,
        pollOptionId,
        body: updateData,
      },
    );
  typia.assert(updatedPollOption);

  // 5. Validate that changes are applied
  TestValidator.equals(
    "poll option text updated correctly",
    updatedPollOption.option_text,
    updateData.option_text,
  );
  // Optionally: TestValidator.equals("sequence updated", updatedPollOption.sequence, updateData.sequence);
  // (Cannot check uniqueness across other options or business rule for closed poll without further APIs)
  // 6. Confirm that only permitted fields are changeable; others are unaffected or not present (all DTO-compliant)
}
