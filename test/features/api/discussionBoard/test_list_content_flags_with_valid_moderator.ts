import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that a moderator can retrieve the paginated list of all discussion
 * board content flags.
 *
 * This test ensures:
 *
 * - At least one moderator exists (created by admin)
 * - The moderator is able to create flags on content
 * - The moderator can retrieve the list of flags and that it contains the flag(s)
 *   created
 * - The response includes proper pagination metadata and only exposes permitted
 *   summary properties
 * - Access control: An unauthorized user (non-moderator/admin) cannot call the
 *   API
 *
 * Steps:
 *
 * 1. As admin, create a new moderator assignment (with random user_identifier)
 * 2. As moderator, create at least two distinct content flags (on random
 *    post/comment UUIDs)
 * 3. As moderator, retrieve the list of content flags; validate pagination and
 *    summary content (the flags created appear)
 * 4. As unauthorized user, attempt to retrieve content flags (should fail with
 *    error)
 */
export async function test_api_discussionBoard_test_list_content_flags_with_valid_moderator(
  connection: api.IConnection,
) {
  // 1. Create a moderator as admin
  const user_identifier = typia.random<string>();
  const granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create two content flags as moderator
  // (simulate moderator role switch if system requires, otherwise operate with same connection)
  const flag1 =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          flag_type: "abuse",
          flag_source: "manual",
          flag_details: "Test: offensive post",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag1);
  const flag2 =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          flag_type: "spam",
          flag_source: "manual",
          flag_details: "Test: link spam",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag2);

  // 3. Retrieve flags as moderator
  const page =
    await api.functional.discussionBoard.moderator.contentFlags.index(
      connection,
    );
  typia.assert(page);

  // Validate pagination metadata
  TestValidator.predicate("pagination valid")(
    !!page.pagination && typeof page.pagination.current === "number",
  );
  // Validate at least 2 flags (the ones we just created) are present in page data
  const flagIds = page.data.map((f) => f.id);
  TestValidator.predicate("flag1 is present")(flagIds.includes(flag1.id));
  TestValidator.predicate("flag2 is present")(flagIds.includes(flag2.id));
  // Validate summary properties only (per ISummary)
  page.data.forEach((summary) => {
    // Only allowed: id, flag_type, flag_source, created_at
    const allowedKeys = ["id", "flag_type", "flag_source", "created_at"];
    TestValidator.equals("flag summary keys")(Object.keys(summary).sort())(
      allowedKeys.sort(),
    );
  });

  // 4. Attempt as unauthorized (non-moderator) user
  const plainConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("access control for contentFlags index")(() =>
    api.functional.discussionBoard.moderator.contentFlags.index(
      plainConnection,
    ),
  );
}
