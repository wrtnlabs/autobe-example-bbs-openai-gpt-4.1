import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test successful update of an existing discussion board tag's label and
 * description by an administrator.
 *
 * This scenario covers the complete admin workflow for updating a tag:
 *
 * 1. Register and authenticate as an admin (using a random, unique user_id for
 *    registration).
 * 2. Create a tag via POST /discussionBoard/admin/tags (with unique label and
 *    optional description).
 * 3. Use PUT /discussionBoard/admin/tags/{tagId} to update the tag (change
 *    label and description, optionally toggle is_active).
 * 4. Validate that the tag's updated fields are reflected in the response.
 * 5. (Assuming further endpoints exist) Confirm changes with an additional
 *    fetch of the tag detail.
 *
 * Steps:
 *
 * 1. Register as admin using /auth/admin/join (required to get admin token).
 * 2. Create initial tag via /discussionBoard/admin/tags (returns tag with id).
 * 3. Update the tag using /discussionBoard/admin/tags/{tagId} with new label
 *    and/or description.
 * 4. Assert response reflects the updates.
 * 5. (If details endpoint exists) Fetch the tag again and assert fields are
 *    updated.
 *
 * Validation:
 *
 * - Ensure label, description, and is_active state are correctly updated.
 * - Assert no unexpected changes on other fields like id, created_at,
 *   deleted_at.
 * - Validate correct type and non-nullity of id and audit fields.
 * - Check old/new label are different if label is updated.
 */
export async function test_api_admin_tag_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin (random user_id)
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // Step 2: Create initial tag
  const tagCreateInput = {
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
    is_active: true,
  } satisfies IDiscussionBoardTag.ICreate;
  const tag = await api.functional.discussionBoard.admin.tags.create(
    connection,
    { body: tagCreateInput },
  );
  typia.assert(tag);
  TestValidator.equals(
    "created tag label matches input",
    tag.label,
    tagCreateInput.label,
  );
  TestValidator.equals(
    "created tag description matches input",
    tag.description,
    tagCreateInput.description,
  );
  TestValidator.equals("created tag is_active true", tag.is_active, true);

  // Step 3: Update the tag: change label and description
  const updateInput = {
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 6,
      wordMax: 11,
    }),
    is_active: false, // toggle active state for completeness
  } satisfies IDiscussionBoardTag.IUpdate;
  const updatedTag = await api.functional.discussionBoard.admin.tags.update(
    connection,
    {
      tagId: tag.id,
      body: updateInput,
    },
  );
  typia.assert(updatedTag);

  // Step 4: Assert updates reflected
  TestValidator.notEquals(
    "tag label changed after update",
    updatedTag.label,
    tag.label,
  );
  TestValidator.equals(
    "tag label updated",
    updatedTag.label,
    updateInput.label,
  );
  TestValidator.equals(
    "tag description updated",
    updatedTag.description,
    updateInput.description,
  );
  TestValidator.equals(
    "tag is_active false after update",
    updatedTag.is_active,
    false,
  );
  TestValidator.equals("tag id remains unchanged", updatedTag.id, tag.id);
  TestValidator.equals(
    "tag deleted_at remains unchanged",
    updatedTag.deleted_at,
    tag.deleted_at,
  );
  TestValidator.notEquals(
    "tag updated_at is more recent",
    updatedTag.updated_at,
    tag.updated_at,
  );

  // Step 5: (No detail endpoint provided) If available, would fetch again and assert equality
  // If list endpoint were available, verify tag appears in listing with updated label/description.
}
