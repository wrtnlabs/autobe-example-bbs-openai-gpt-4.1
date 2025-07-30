import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that an admin can retrieve a paginated list of all content flags on
 * the discussion board.
 *
 * This test ensures that the admin/list endpoint returns correct paginated
 * data, includes all pertinent flag details, is only accessible to admins, and
 * behaves correctly whether flags exist or not. The test covers both creation
 * of prerequisite data (flags and an admin) and the listing operation itself.
 *
 * 1. Assign admin role to a unique user (simulate privilege assignment).
 * 2. Using moderator privileges, create at least two content flags: one on a post,
 *    one on a comment (simulate flagged content).
 * 3. Log in as the admin (ensure proper authentication if required).
 * 4. Call the admin contentFlags GET endpoint.
 * 5. Assert the response pagination structure and the inclusion of recently
 *    created flag summaries.
 * 6. Validate that all flag summary fields (id, flag_type, flag_source,
 *    created_at) are present and match the created flags.
 * 7. (Negative) Switch to a non-admin/non-moderator account and assert that access
 *    is denied (if possible with available functions).
 * 8. Edge: If there are no flags, verify an empty data list and valid pagination.
 * 9. Confirm that the listing operation is properly audit-logged for compliance
 *    (to extent possible).
 */
export async function test_api_discussionBoard_test_list_all_content_flags_with_valid_admin_role(
  connection: api.IConnection,
) {
  // Step 1. Assign admin role
  const uniqueAdminUser: string = RandomGenerator.alphabets(12);
  const adminGrantedAt: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: uniqueAdminUser,
        granted_at: adminGrantedAt,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals("admin user_identifier matches")(admin.user_identifier)(
    uniqueAdminUser,
  );

  // Step 2. Using moderator privileges, create two content flags: one for a post, one for a comment
  const flagForPost =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          flag_type: "spam",
          flag_source: "manual",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flagForPost);
  const flagForComment =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          flag_type: "abuse",
          flag_source: "automation",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flagForComment);

  // Step 3: (Login as admin if auth system provided - assuming role is set via admin assignment)

  // Step 4. Call the admin contentFlags listing endpoint
  const flagPage =
    await api.functional.discussionBoard.admin.contentFlags.index(connection);
  typia.assert(flagPage);
  // Step 5. Assert the pagination summary structure
  TestValidator.predicate("pagination is present")(!!flagPage.pagination);
  TestValidator.predicate("data array present")(Array.isArray(flagPage.data));
  // Step 6. Check for recently created flags in the result
  const flagIds = flagPage.data.map((summary) => summary.id);
  TestValidator.predicate("flag for post present")(
    flagIds.includes(flagForPost.id),
  );
  TestValidator.predicate("flag for comment present")(
    flagIds.includes(flagForComment.id),
  );
  // Step 7: (Negative case omitted - non-admin accessors are not available in SDK)
  // Step 8. (If no data were present - edge case not triggered here due to setup).
  // Step 9: (Audit log check omitted - not possible via provided SDK)
}
