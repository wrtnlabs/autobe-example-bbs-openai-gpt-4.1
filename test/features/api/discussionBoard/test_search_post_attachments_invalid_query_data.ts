import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostAttachment";

/**
 * Validate error response when searching attachments with invalid or malformed
 * query data.
 *
 * Business context: Searching attachments on a post supports extensive
 * filtering (uploader, file name, mime type, upload date, etc.) and is robust
 * to correct queries. However, invalid input (such as nonsensical date ranges,
 * unsupported filters, or invalid value types) should not return generic server
 * errors, but rather meaningful, user-friendly validation errors indicating the
 * issue.
 *
 * Steps:
 *
 * 1. Create a post (with or without attachments). We only need the postId for
 *    attachment search context.
 * 2. Attempt to search attachments for the post using intentionally invalid
 *    queries:
 *
 *    - Provide an unsupported filter property in the request body
 *    - Submit required properties with clearly malformed data (e.g., 'uploadedFrom'
 *         with badly formatted string, or 'pagination.limit' as a negative
 *         number)
 *    - Optionally, send data with correct structure but illogical values (e.g.,
 *         'uploadedFrom' > 'uploadedTo')
 * 3. For each case, verify that the attachments search API returns a user-friendly
 *    error (not a raw server/stack error) and that the error refers to the
 *    invalid field/value.
 */
export async function test_api_discussionBoard_test_search_post_attachments_invalid_query_data(
  connection: api.IConnection,
) {
  // 1. Create a new post under a thread
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: "This is a test post for attachment error test.",
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // Case 1: Unsupported filter property (should trigger validation error)
  await TestValidator.error("unsupported filter property error")(() =>
    api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      // Simulate sending an extra unsupported property, requires type cast
      body: { fooBar: "not a schema field" } as any,
    }),
  );

  // Case 2: Malformed date-time (should trigger validation error)
  await TestValidator.error("malformed uploadedFrom datetime")(() =>
    api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: {
        uploadedFrom: "not-a-date",
      } as any,
    }),
  );

  // Case 3: Pagination with negative limit (should trigger validation error)
  await TestValidator.error("pagination negative limit")(() =>
    api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: {
        pagination: {
          limit: -42,
        },
      } as any,
    }),
  );

  // Case 4: uploadedFrom > uploadedTo (illogical date order - if backend validates logic)
  const from = new Date("2025-10-01T12:00:00.000Z").toISOString();
  const to = new Date("2025-09-01T12:00:00.000Z").toISOString();
  await TestValidator.error("uploadedFrom is after uploadedTo")(() =>
    api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: {
        uploadedFrom: from,
        uploadedTo: to,
      },
    }),
  );
}
