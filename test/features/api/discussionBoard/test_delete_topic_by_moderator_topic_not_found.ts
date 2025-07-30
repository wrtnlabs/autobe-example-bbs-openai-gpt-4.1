import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate moderator deletion error on nonexistent topic.
 *
 * Test verifies that when a moderator attempts to delete a topic that doesn't
 * exist (i.e., random or already removed topic ID), the system should return a
 * not found error, confirming correct handling of such requests. The moderator
 * role must be prepared (dependency) to ensure proper authorization for the
 * test.
 *
 * Steps:
 *
 * 1. Create a moderator role using the admin API (dependency/prep).
 * 2. Attempt to delete a random (nonexistent) topic as moderator.
 * 3. Verify that the system responds with a not found error (i.e., HTTP 404 or
 *    similar), ensuring robust error handling for invalid/deleted IDs.
 */
export async function test_api_discussionBoard_test_delete_topic_by_moderator_topic_not_found(
  connection: api.IConnection,
) {
  // 1. Create moderator as prerequisite (using real user identifier for realistic scenario).
  const user_identifier = RandomGenerator.alphaNumeric(12);
  const now = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: now,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Moderator attempts to delete a topic that does not exist.
  // Generate a random UUID that is extremely unlikely to be valid.
  const nonExistentTopicId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect error: not found (should throw an error, e.g., HttpError 404/410)
  await TestValidator.error("should return not found for nonexistent topic")(
    () =>
      api.functional.discussionBoard.moderator.topics.erase(connection, {
        topicId: nonExistentTopicId,
      }),
  );
}
