import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";

/**
 * Test successful retrieval of detailed information about a specific JWT
 * token session belonging to an authenticated user.
 *
 * This E2E test validates that an authenticated user can retrieve detailed
 * information for a JWT token session via the
 * /discussionBoard/user/jwtTokens/{jwtTokenId} endpoint. The test registers
 * a fresh user and, due to API limitations (unavailability of token session
 * ID enumeration or session mapping), attempts a detail lookup using a
 * randomly generated UUID. It cannot correlate the join/register access
 * token string to the required UUID session ID, so this test only verifies
 * API structure, type safety, and that the response returns a well-formed
 * IDiscussionBoardJwtToken record when permitted. True validation of
 * session ownership or linkage between login/join and session detail lookup
 * cannot be implemented with the present API set.
 *
 * Steps:
 *
 * 1. Register a new user, obtain the default authentication session (access
 *    token is set in connection automatically by join).
 * 2. Attempt retrieval of JWT token session detail using a randomly generated
 *    UUID value as the path parameter. (Cannot use actual session due to
 *    API limitations.)
 * 3. Assert the response structure and all fields for type and format
 *    compliance.
 *
 * Future recommendations: when the API supports enumerating sessions or
 * returning session UUID in /join/login responses, also test true ownership
 * matching and cross-user/negative lookups.
 */
export async function test_api_jwt_token_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "Password@12345",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userCredentials,
  });
  typia.assert(authorized);

  // 2. (Limitation): No endpoint to enumerate user JWT sessions or obtain the session UUID; can only generate a random UUID for the lookup.
  const tokenId = typia.random<string & tags.Format<"uuid">>();
  const tokenDetails = await api.functional.discussionBoard.user.jwtTokens.at(
    connection,
    { jwtTokenId: tokenId },
  );

  // 3. Validate structure and field types
  typia.assert(tokenDetails);
}
