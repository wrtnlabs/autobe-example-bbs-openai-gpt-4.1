import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";

/**
 * E2E test for successful retrieval of a specific poll option as an
 * authenticated user.
 *
 * This test covers authentication and the successful GET of a poll option
 * resource, validating type safety and DTO contract:
 *
 * 1. Register a new user to obtain authentication context and JWT.
 * 2. (Unimplementable with current API - skipped): Would create a post, poll,
 *    and poll option, but no create endpoints are available with the
 *    supplied DTOs/APIs.
 * 3. Generate random (mock) UUIDs for postId, pollId, and pollOptionId.
 * 4. Retrieve the poll option by ID as an authenticated user via the GET
 *    endpoint.
 * 5. Assert all fields of the returned poll option conform to type contract,
 *    expected values, and business logic (option_text, sequence, status);
 *    check that soft-deleted flag is null (not deleted).
 *
 * NOTE: This E2E test cannot fully simulate end-to-end poll creation and
 * user data lifecycle due to missing create endpoints. It validates only
 * user registration and the retrieval endpoint on random IDs.
 */
export async function test_api_poll_option_user_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "A@1"; // 10+ chars, has upper/num/special
  const displayName = RandomGenerator.name();

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  TestValidator.equals(
    "registered user email matches",
    userAuth.user.email,
    userEmail,
  );
  TestValidator.equals(
    "registered username matches",
    userAuth.user.username,
    username,
  );
  TestValidator.predicate(
    "token access string present",
    typeof userAuth.token.access === "string" &&
      userAuth.token.access.length > 0,
  );

  // [Skipped] 2: Would create a post, poll, and poll option -- APIs not available in supplied materials.

  // 3. Generate mock UUIDs for post/poll/pollOption, as we lack creation APIs
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();
  const pollOptionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the poll option by IDs as authenticated user
  const pollOption =
    await api.functional.discussionBoard.user.posts.polls.pollOptions.at(
      connection,
      {
        postId,
        pollId,
        pollOptionId,
      },
    );
  typia.assert(pollOption);

  // 5. Validate poll option DTO and expected fields
  TestValidator.equals(
    "poll option id matches request",
    pollOption.id,
    pollOptionId,
  );
  TestValidator.equals(
    "parent poll id matches request",
    pollOption.discussion_board_poll_id,
    pollId,
  );
  TestValidator.predicate(
    "poll option text not empty",
    pollOption.option_text.length > 0,
  );
  TestValidator.predicate(
    "sequence is positive integer",
    pollOption.sequence > 0 && Number.isInteger(pollOption.sequence),
  );
  TestValidator.predicate(
    "created_at field present",
    typeof pollOption.created_at === "string" &&
      pollOption.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at field present",
    typeof pollOption.updated_at === "string" &&
      pollOption.updated_at.length > 0,
  );
  TestValidator.equals(
    "poll option is not soft-deleted",
    pollOption.deleted_at,
    null,
  );
}
