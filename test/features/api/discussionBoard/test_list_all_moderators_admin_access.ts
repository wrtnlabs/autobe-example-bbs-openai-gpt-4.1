import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate admin's ability to list all discussion board moderators.
 *
 * This test ensures that an admin can retrieve a complete list of moderators,
 * including those currently active and those who have been revoked. Prior to
 * list retrieval, at least one moderator is created to ensure the returned data
 * is non-empty. The test asserts correct presence of required fields
 * (`user_identifier`, `granted_at`, and optionally `revoked_at`), and verifies
 * both schema and that the listing includes our just-created record.
 * Additionally, the test checks that the response structure matches expected
 * schema. If no moderators existed (e.g., clean DB), the endpoint would still
 * work and return an empty data array with valid pagination. This test only
 * covers successful retrieval for admin access and does not cover permission
 * errors or forbidden access for non-admin users.
 *
 * Steps:
 *
 * 1. As admin, create a new moderator (dependency setup).
 * 2. Retrieve the full list of moderators using the GET endpoint.
 * 3. Validate that the response is a page object with moderator data array.
 * 4. Confirm the presence, schema, and fields (`user_identifier`, `granted_at`,
 *    `revoked_at`).
 * 5. Check that the created moderator is present in the result set.
 */
export async function test_api_discussionBoard_test_list_all_moderators_admin_access(
  connection: api.IConnection,
) {
  // 1. Create a moderator before fetching the list, to ensure non-empty results
  const user_identifier = RandomGenerator.alphaNumeric(10);
  const granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at,
        // optional revoked_at omitted (active moderator)
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals("created moderator user identifier")(
    moderator.user_identifier,
  )(user_identifier);
  TestValidator.equals("created moderator granted_at")(moderator.granted_at)(
    granted_at,
  );

  // 2. Fetch all moderators
  const page =
    await api.functional.discussionBoard.admin.moderators.index(connection);
  typia.assert(page);

  // 3. Verify structure
  TestValidator.equals("page structure: has pagination")(
    typeof page.pagination,
  )("object");
  TestValidator.equals("page structure: has data array")(
    Array.isArray(page.data),
  )(true);

  // 4. Data array includes expected fields: user_identifier, granted_at, revoked_at
  for (const mod of page.data) {
    TestValidator.equals("moderator: user_identifier type")(
      typeof mod.user_identifier,
    )("string");
    TestValidator.equals("moderator: granted_at format")(typeof mod.granted_at)(
      "string",
    );
    // revoked_at may be undefined or null, or string in date-time format if present
    if (mod.revoked_at !== undefined && mod.revoked_at !== null) {
      TestValidator.equals("moderator: revoked_at type")(typeof mod.revoked_at)(
        "string",
      );
    }
  }

  // 5. The created moderator should be found in the list
  const found = page.data.some(
    (mod) =>
      mod.user_identifier === user_identifier &&
      mod.granted_at === granted_at &&
      (mod.revoked_at === undefined || mod.revoked_at === null),
  );
  TestValidator.predicate("created moderator found in result")(found);
}
