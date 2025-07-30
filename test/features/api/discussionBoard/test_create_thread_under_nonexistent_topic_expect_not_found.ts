import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate error response when attempting to create a thread under a
 * non-existent topic.
 *
 * In a discussion board system, thread creation must be scoped to an existing
 * topic. To ensure robust error handling, this test attempts to create a thread
 * using a random or deleted topicId that does not exist in the system. The
 * system should respond with a 404 Not Found (or equivalent) error, indicating
 * that thread creation under an invalid topic is impossible.
 *
 * Test Steps:
 *
 * 1. Provision an admin user for authorization (required by API security).
 * 2. Attempt to create a thread by calling the endpoint with a random
 *    (non-existent) topicId and a valid thread creation body.
 * 3. Confirm that the API responds with a 404 not found error, and that thread
 *    creation is blocked as expected.
 */
export async function test_api_discussionBoard_test_create_thread_under_nonexistent_topic_expect_not_found(
  connection: api.IConnection,
) {
  // 1. Provision an admin user for authorization
  const adminUserIdentifier: string = RandomGenerator.alphaNumeric(12);
  const adminMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(adminMember);

  // 2. Attempt to create a thread under a non-existent topic
  const nonExistentTopicId = typia.random<string & tags.Format<"uuid">>();
  const threadCreateBody = {
    title: RandomGenerator.paragraph()(),
  } satisfies IDiscussionBoardThreads.ICreate;

  // 3. Confirm that the API responds with 404 Not Found (or equivalent)
  await TestValidator.error(
    "Attempting to create a thread under non-existent topic should return 404",
  )(async () => {
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      {
        topicId: nonExistentTopicId,
        body: threadCreateBody,
      },
    );
  });
}
