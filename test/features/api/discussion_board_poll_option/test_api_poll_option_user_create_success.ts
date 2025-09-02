import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";

/**
 * Test the successful creation of a poll option for a poll by an
 * authenticated user.
 *
 * Business context:
 *
 * - Users of the discussion board can create posts and add polls to those
 *   posts. Each poll can have multiple options (choices), which must have
 *   unique text (option_text) and a display order (sequence).
 * - Only authenticated users who created the poll or have management rights
 *   can add options. The system must enforce authentication, poll
 *   existence, and uniqueness constraints.
 *
 * Test steps:
 *
 * 1. Register a new user (using /auth/user/join with unique email, username,
 *    password, and consent=true). This authenticates the session and issues
 *    tokens.
 * 2. (Prerequisite assumption) Create a post as that user. (Note: Post
 *    creation API is not provided, so this step must be assumed as setup,
 *    and postId must be synthesized for test purposes.)
 * 3. (Prerequisite assumption) Create a poll on the newly created post. (No
 *    poll-creation API/DTO exists, so pollId must be synthesized for test
 *    purposes.)
 * 4. Call api.functional.discussionBoard.user.posts.polls.pollOptions.create
 *    using the user's authentication context, passing synthesized
 *    postId/pollId and a body with unique option_text and sequence.
 * 5. Assert that the returned IDiscussionBoardPollOption matches the sent
 *    discussion_board_poll_id, option_text, sequence, and that system
 *    fields (id, created_at, updated_at) are valid and deleted_at is
 *    null/undefined.
 *
 * Notes:
 *
 * - The actual creation of the post and poll is not implemented due to
 *   missing endpoints/types; valid UUIDs are used to simulate their
 *   existence for the test.
 * - Validation of uniqueness constraints and business logic around
 *   duplication is handled in a separate error/failure test.
 */
export async function test_api_poll_option_user_create_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (authenticates session)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "Aa1@",
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(userAuth);

  // Step 2: (Assumed) Create a post as the user (not implemented; synthesize postId)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: (Assumed) Create a poll on the post (not implemented; synthesize pollId)
  const pollId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Create a poll option with unique label and sequence
  const optionInput = {
    discussion_board_poll_id: pollId,
    option_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    sequence: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardPollOption.ICreate;

  const pollOption =
    await api.functional.discussionBoard.user.posts.polls.pollOptions.create(
      connection,
      {
        postId,
        pollId,
        body: optionInput,
      },
    );
  typia.assert(pollOption);

  // Step 5: Assert returned poll option correctness
  TestValidator.equals(
    "pollId matches request",
    pollOption.discussion_board_poll_id,
    optionInput.discussion_board_poll_id,
  );
  TestValidator.equals(
    "option_text matches request",
    pollOption.option_text,
    optionInput.option_text,
  );
  TestValidator.equals(
    "sequence matches request",
    pollOption.sequence,
    optionInput.sequence,
  );
  TestValidator.predicate(
    "id is a UUID",
    typeof pollOption.id === "string" &&
      /^[0-9a-fA-F\-]{36}$/.test(pollOption.id),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof pollOption.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(pollOption.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof pollOption.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(pollOption.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    pollOption.deleted_at,
    null,
  );
}
