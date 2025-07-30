import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test that creating a discussion thread with a non-existent or invalid topicId
 * results in an error.
 *
 * Business context: Creating threads is allowed only under an existing, valid
 * topic. The API should reject attempts to create a thread under a topicId that
 * is either invalid (malformed UUID) or non-existent (well-formed UUID, but no
 * topic by that id).
 *
 * Test process:
 *
 * 1. Attempt to create a new thread for an obviously invalid topicId (malformed
 *    UUID). Expect an error about topicId format.
 * 2. Attempt to create a new thread for a well-formed, random UUID that does not
 *    exist as a topic. Expect a not-found or invalid parent error.
 * 3. For both attempts, verify that the API throws a runtime error and does not
 *    create a thread.
 */
export async function test_api_discussionBoard_test_create_thread_with_invalid_topic_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Attempt to create with malformed topicId (non-uuid string)
  await TestValidator.error("malformed topicId should error")(async () => {
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: "not-a-uuid" as string & tags.Format<"uuid">,
        body: {
          title: RandomGenerator.paragraph()(3),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  });

  // 2. Attempt to create with well-formed but non-existent topicId
  await TestValidator.error("non-existent topicId should error")(async () => {
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.paragraph()(3),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  });
}
