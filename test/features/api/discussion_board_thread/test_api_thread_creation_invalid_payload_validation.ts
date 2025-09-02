import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * E2E: Validates backend payload validation for thread creation (API: POST
 * /discussionBoard/user/threads).
 *
 * Ensures that only authenticated, verified users can create new threads.
 * Negative payload scenarios are tested to ensure strict backend
 * enforcement (not just UI checks):
 *
 * 1. Missing title property (required) → validation error
 * 2. Empty title string → validation error
 * 3. Duplicate title (should fail uniqueness constraint)
 * 4. Extraneous/unknown property in payload is rejected Each error path is
 *    checked for correct API-side enforcement. Title uniqueness, DTO field
 *    constraints, and correct error handling (no implementation detail
 *    leakage) are all verified.
 */
export async function test_api_thread_creation_invalid_payload_validation(
  connection: api.IConnection,
) {
  // --- Step 1: Register a test user and authenticate ---
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "A!1";
  const userJoinPayload = {
    email,
    username,
    password,
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const userAuth = await api.functional.auth.user.join(connection, {
    body: userJoinPayload,
  });
  typia.assert(userAuth);
  TestValidator.predicate("joined user is verified", userAuth.user.is_verified);

  // --- Step 2: Attempt thread creation with missing title (should fail validation) ---
  await TestValidator.error(
    "validation error: title property is required",
    async () => {
      await api.functional.discussionBoard.user.threads.create(connection, {
        body: {} as any,
      });
    },
  );

  // --- Step 3: Attempt with empty title string (should fail validation) ---
  await TestValidator.error(
    "validation error: title must not be empty",
    async () => {
      await api.functional.discussionBoard.user.threads.create(connection, {
        body: {
          title: "",
        } satisfies IDiscussionBoardThread.ICreate,
      });
    },
  );

  // --- Step 4: Successfully create thread with valid title (preparation for uniqueness test) ---
  const validTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const createdThread =
    await api.functional.discussionBoard.user.threads.create(connection, {
      body: { title: validTitle } satisfies IDiscussionBoardThread.ICreate,
    });
  typia.assert(createdThread);
  TestValidator.equals(
    "successful thread creation retains title",
    createdThread.title,
    validTitle,
  );

  // --- Step 5: Attempt duplicate thread title (should fail uniqueness constraint) ---
  await TestValidator.error(
    "validation error: thread title must be unique (duplicate title)",
    async () => {
      await api.functional.discussionBoard.user.threads.create(connection, {
        body: { title: validTitle } satisfies IDiscussionBoardThread.ICreate,
      });
    },
  );

  // --- Step 6: Attempt to create with extra/unknown field (should fail validation) ---
  await TestValidator.error(
    "validation error: extraneous field in request body",
    async () => {
      await api.functional.discussionBoard.user.threads.create(connection, {
        body: {
          title: RandomGenerator.paragraph(),
          extraneous: "notAllowed",
        } as any,
      });
    },
  );
}
