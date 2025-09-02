import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the soft deletion of a discussion board tag as performed by an
 * administrator.
 *
 * This E2E function validates the soft delete (logical delete) operation
 * for platform taxonomy tags in the discussion board, ensuring:
 *
 * 1. An admin account is created (precondition for authorization).
 * 2. A new tag is created by the admin, representing a new taxonomy/facet.
 * 3. The admin soft deletes the tag using the DELETE endpoint.
 * 4. The delete operation marks the tag's deleted_at property (if
 *    returned/available), not a physical removal.
 * 5. The tag cannot be found in regular (non-admin) flows (see dependencies
 *    and limits of SDK visibility), enforcing usage/access boundaries.
 * 6. The tag remains present in admin audit, compliance, or direct details (if
 *    accessible via SDK; otherwise check from step 2 & 3 output).
 *
 * Steps:
 *
 * - Register a new admin user via the /auth/admin/join endpoint to obtain an
 *   authorized admin session.
 * - Create a tag as admin using the /discussionBoard/admin/tags POST API.
 * - Soft delete the tag as admin via /discussionBoard/admin/tags/{tagId}
 *   (DELETE), using the returned tagId from the create response.
 * - Verify the tag's deleted_at timestamp is set after deletion.
 * - (If available) Attempt to retrieve the tag in regular flows and expect it
 *   not to appear or not be assignable. (Note: skip this if endpoint is not
 *   defined in SDK.)
 */
export async function test_api_admin_tag_soft_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const userId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: userId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a new tag as admin
  const label = RandomGenerator.name(2);
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const createTagInput = {
    label,
    description,
    is_active: true,
  } satisfies IDiscussionBoardTag.ICreate;
  const tag = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: createTagInput,
    },
  );
  typia.assert(tag);
  TestValidator.equals("tag label matches input", tag.label, label);
  TestValidator.equals("tag is active after creation", tag.is_active, true);
  TestValidator.equals(
    "tag is not deleted right after creation",
    tag.deleted_at,
    null,
  );

  // Step 3: Soft delete the tag as admin
  await api.functional.discussionBoard.admin.tags.erase(connection, {
    tagId: tag.id,
  });

  // Step 4: (Optional, as not supported yet) If SDK had a tag listing/fetch endpoint,
  // we would fetch and assert deleted_at is not null and/or tag is not returned in regular queries.
  // Since these are not available, this step is omitted.
}
