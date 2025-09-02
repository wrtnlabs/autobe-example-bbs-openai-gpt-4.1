import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that an admin can successfully create a new discussion board tag.
 *
 * This test covers the entire admin tag creation flow, from authorization
 * setup to final record validation. It ensures that:
 *
 * - The admin account can be registered and authenticated
 * - A valid tag creation payload is correctly accepted by the API
 * - The created tag matches all expected request data
 * - Metadata fields (id, created_at, updated_at) are properly formatted and
 *   present
 * - The tag is active and not deleted (deleted_at is null or undefined)
 *
 * Steps:
 *
 * 1. Register as an admin (join) to establish authorization
 * 2. Construct a valid tag creation payload (unique label, optional
 *    description, is_active)
 * 3. Call the tag creation API
 * 4. Assert response correctness (payload, id, meta, active status,
 *    soft-deletion)
 */
export async function test_api_admin_tag_create_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin for tag creation
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Prepare tag creation payload (label, nullable description, is_active)
  const tagInput: IDiscussionBoardTag.ICreate = {
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
    is_active: true,
  };

  // 3. Create the tag using the admin context
  const createdTag = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: tagInput,
    },
  );
  typia.assert(createdTag);

  // 4. Validate all business data and metadata
  TestValidator.equals(
    "tag label matches input",
    createdTag.label,
    tagInput.label,
  );
  TestValidator.equals(
    "tag description matches input",
    createdTag.description,
    tagInput.description,
  );
  TestValidator.equals(
    "tag is_active matches input",
    createdTag.is_active,
    tagInput.is_active,
  );

  TestValidator.predicate(
    "tag id is valid uuid format",
    typeof createdTag.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdTag.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof createdTag.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdTag.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof createdTag.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdTag.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    createdTag.deleted_at ?? null,
    null,
  );
}
