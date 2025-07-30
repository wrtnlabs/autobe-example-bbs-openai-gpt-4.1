import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Ensure the system returns a not found error when attempting to update a
 * non-existent post version as admin.
 *
 * Business Context:
 *
 * - Admin users need to update historical post versions for compliance or
 *   moderation, but must receive a 404/not found error if the version or post
 *   does not exist.
 * - The update API should not allow ambiguous results or data mutation when
 *   targeted entities are not present.
 *
 * Test Steps:
 *
 * 1. Register an admin member account (as required for admin endpoint
 *    authorization).
 * 2. Attempt to update a post version using random (non-existent) UUIDs for both
 *    postId and versionId.
 *
 * - Provide a legitimate IUpdate body (with random but valid fields).
 * - The update attempt should fail with an error indicating not found (404).
 * - No data should be returned on success; if the API returns an entity or does
 *   not throw an error, the test should fail.
 */
export async function test_api_discussionBoard_test_update_nonexistent_post_version_should_fail(
  connection: api.IConnection,
) {
  // 1. Register an admin member (setup dependency)
  const adminUserIdentifier: string = typia.random<string>();
  const admin: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: adminUserIdentifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to update a post version with non-existent IDs
  await TestValidator.error("update non-existent post version should fail")(
    () =>
      api.functional.discussionBoard.admin.posts.versions.update(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        versionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          body: "New body content for compliance audit.",
          editor_member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardPostVersion.IUpdate,
      }),
  );
}
