import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate that an authenticated admin can successfully retrieve tag
 * details by ID.
 *
 * This test ensures that after registering and logging in as an admin,
 * creating a discussion board tag, the API endpoint GET
 * /discussionBoard/admin/tags/{tagId} returns the complete tag data
 * matching the object that was created.
 *
 * Steps:
 *
 * 1. Register an admin using api.functional.auth.admin.join with a unique
 *    user_id
 * 2. Ensure the Authorization token is set for the admin session
 * 3. Create a new tag via api.functional.discussionBoard.admin.tags.create
 *    (provide unique label and is_active true)
 * 4. Retrieve the tag using api.functional.discussionBoard.admin.tags.at with
 *    the tag's id
 * 5. Assert that the returned tag matches the originally created tag (deep
 *    equality, ignoring created_at/updated_at differences)
 */
export async function test_api_admin_tag_at_success(
  connection: api.IConnection,
) {
  // 1. Register admin via join
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create new tag (admin session, Authorization set by join)
  const tagInput = {
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 7,
    }),
    is_active: true,
  } satisfies IDiscussionBoardTag.ICreate;
  const createdTag = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: tagInput,
    },
  );
  typia.assert(createdTag);

  // 3. Retrieve tag by ID
  const fetchedTag = await api.functional.discussionBoard.admin.tags.at(
    connection,
    {
      tagId: createdTag.id,
    },
  );
  typia.assert(fetchedTag);

  // 4. Validate tag detail response
  // Fields to ignore for timestamp differences: created_at, updated_at, deleted_at
  TestValidator.equals(
    "fetched tag matches created tag data",
    {
      ...fetchedTag,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
    {
      ...createdTag,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
  );
  TestValidator.predicate(
    "tag label matches",
    fetchedTag.label === tagInput.label,
  );
  TestValidator.predicate(
    "tag is_active matches",
    fetchedTag.is_active === tagInput.is_active,
  );
  if (tagInput.description !== undefined && tagInput.description !== null) {
    TestValidator.predicate(
      "tag description matches",
      fetchedTag.description === tagInput.description,
    );
  }
}
