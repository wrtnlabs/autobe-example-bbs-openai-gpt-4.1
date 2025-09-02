import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Test validation logic when a user submits a flag report with an invalid
 * or missing reason property.
 *
 * This test ensures the following business rules and behaviors:
 *
 * 1. Only authenticated users can submit flag reports, so user registration
 *    and authentication is performed first.
 * 2. The 'reason' property is mandatory for flag reports. Attempting to submit
 *    a report with an empty reason ("") or an unsupported value should
 *    result in a validation error.
 *
 * Test procedure:
 *
 * - Register a new user and obtain authentication context.
 * - Submit a flag report with an empty 'reason' string and verify a
 *   validation error is returned.
 * - Submit a flag report with an unsupported 'reason' string (e.g.,
 *   'not_a_real_reason') and verify a validation error is returned.
 */
export async function test_api_flag_report_create_invalid_reason_error(
  connection: api.IConnection,
) {
  // Step 1: Register a new user and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  // Password must follow policy: min 10 chars, at least 1 uppercase, number, special char
  const password = "ValidPassw0rd!";
  const auth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(auth);

  // Step 2: Try to create a flag report with an empty 'reason'
  await TestValidator.error(
    "flag report creation should fail when reason is empty",
    async () => {
      await api.functional.discussionBoard.user.flagReports.create(connection, {
        body: {
          reason: "",
        } satisfies IDiscussionBoardFlagReport.ICreate,
      });
    },
  );

  // Step 3: Try to create a flag report with an unsupported 'reason'
  await TestValidator.error(
    "flag report creation should fail when reason is unsupported",
    async () => {
      await api.functional.discussionBoard.user.flagReports.create(connection, {
        body: {
          reason: "not_a_real_reason",
        } satisfies IDiscussionBoardFlagReport.ICreate,
      });
    },
  );
}
