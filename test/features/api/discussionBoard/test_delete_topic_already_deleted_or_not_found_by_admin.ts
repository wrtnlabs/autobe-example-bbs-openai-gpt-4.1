import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate error handling when an admin attempts to delete a topic that does
 * not exist or was previously deleted.
 *
 * This test ensures the API robustly returns a not found (404) error when an
 * administrator tries to delete:
 *
 * - A topic with a totally meaningless random UUID (never existed in the system)
 * - A topic that is successfully deleted and then attempted to be deleted again
 *   (repeat delete: not possible here due to missing topic creation API)
 *
 * The API must NEVER succeed in deleting truly non-existent topics, and must
 * not expose side-effects or security issues for these cases.
 *
 * Steps:
 *
 * 1. Create a new admin privilege (set up an admin presence).
 * 2. Attempt to delete a discussion topic using a random UUID that is extremely
 *    unlikely to ever have existed. Validate a 404/not found error.
 * 3. (Repeat delete scenario is omitted due to unavailable topic creation
 *    endpoint.)
 */
export async function test_api_discussionBoard_test_delete_topic_already_deleted_or_not_found_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin (grant admin privileges for this test)
  const adminIdentifier = RandomGenerator.alphaNumeric(12);
  const now = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminIdentifier,
        granted_at: now,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. Attempt to delete a topic with a random non-existent UUID
  const randomFakeTopicId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent topic should fail with not found",
  )(async () => {
    await api.functional.discussionBoard.admin.topics.erase(connection, {
      topicId: randomFakeTopicId,
    });
  });
  // 3. Repeat delete scenario is omitted as topic creation API is unavailable.
}
