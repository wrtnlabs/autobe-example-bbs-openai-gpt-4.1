import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to update user accounts and handle permitted and
 * edge/error cases.
 *
 * Validates that only authenticated moderators can update permitted fields
 * on user accounts via the moderator endpoint, and that duplicate/invalid
 * values and not-found/permission errors are handled as expected.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator (tokens set in connection
 *    context).
 * 2. Register a normal user to be the update target (store email & username
 *    for duplicate tests).
 * 3. As moderator, update permitted fields and verify changes are reflected in
 *    the response.
 * 4. Attempt to update user with duplicate username (trigger business rule
 *    error).
 * 5. Attempt to update user with invalid username (e.g., empty string, or
 *    clearly invalid format).
 * 6. Attempt to update a non-existing user (random UUID); expect not found
 *    error.
 * 7. As a normal user, attempt to update another user (expect permission
 *    error).
 * 8. As an unauthenticated context, attempt to update any user (expect
 *    permission error).
 */
export async function test_api_moderator_user_update_permissions_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // token automatically attached in connection.headers

  // 2. Register user (save for duplicate and update tests)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userReg);

  // Reload userId for later use
  const userId = userReg.user.id;

  // 3. Moderator updates permitted fields (display_name, username, is_verified, is_suspended)
  const newDisplayName = RandomGenerator.name();
  const newUsername = RandomGenerator.name();
  const updateRes = await api.functional.discussionBoard.moderator.users.update(
    connection,
    {
      userId,
      body: {
        display_name: newDisplayName,
        username: newUsername,
        is_verified: true,
        is_suspended: true,
        suspended_until: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days from now
      } satisfies IDiscussionBoardUser.IUpdate,
    },
  );
  typia.assert(updateRes);
  TestValidator.equals(
    "display_name updated",
    updateRes.display_name,
    newDisplayName,
  );
  TestValidator.equals("username updated", updateRes.username, newUsername);
  TestValidator.equals("verified now true", updateRes.is_verified, true);
  TestValidator.equals(
    "is_suspended true after update",
    updateRes.is_suspended,
    true,
  );
  TestValidator.equals(
    "suspended_until set correctly",
    updateRes.suspended_until,
    updateRes.suspended_until,
  ); // Cannot reliably predict string value, but should exist

  // 4. Attempt to update user with duplicate username (use moderator's username, expect error)
  await TestValidator.error("duplicate username error", async () => {
    await api.functional.discussionBoard.moderator.users.update(connection, {
      userId,
      body: {
        username: moderatorUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // 5. Attempt to update with invalid username values
  // 5a. Empty username
  await TestValidator.error("empty username not allowed", async () => {
    await api.functional.discussionBoard.moderator.users.update(connection, {
      userId,
      body: { username: "" } satisfies IDiscussionBoardUser.IUpdate,
    });
  });
  // 5b. Clearly invalid username (too short/special chars)
  await TestValidator.error("invalid username format not allowed", async () => {
    await api.functional.discussionBoard.moderator.users.update(connection, {
      userId,
      body: { username: "!!!@@@" } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // 6. Attempt to update non-existing user (random UUID)
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not found on non-existent UUID", async () => {
    await api.functional.discussionBoard.moderator.users.update(connection, {
      userId: fakeUserId,
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // 7. Switch to normal user (authenticate as created user), then try forbidden update
  // This will overwrite the connection's Authorization header with user's token
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
      display_name: userReg.user.display_name,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  await TestValidator.error(
    "user role cannot update other users (permission error)",
    async () => {
      await api.functional.discussionBoard.moderator.users.update(connection, {
        userId,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );

  // 8. Attempt update as unauthenticated user (clear Authorization)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot use moderator endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.users.update(unauthConn, {
        userId,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );
}
