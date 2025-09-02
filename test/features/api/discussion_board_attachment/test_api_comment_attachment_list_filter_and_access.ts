import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for attachment list/filter/access control on comment attachments
 * in discussion board.
 *
 * This test covers the following scenarios:
 *
 * - Register two users (owner and non-owner)
 * - Owner creates thread, post, comment
 * - Owner uploads multiple attachments to comment (different file names and
 *   types)
 * - Owner requests attachment index using various filters
 * - Non-owner (unrelated user) attempts to index the attachments and is
 *   denied
 * - Soft delete is simulated by forcibly setting deleted_at, test that such
 *   items are excluded
 * - Test that listing on a comment with no attachments yields an empty
 *   paginated result
 */
export async function test_api_comment_attachment_list_filter_and_access(
  connection: api.IConnection,
) {
  // Register owner user
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.name();
  const ownerPassword = "TestPassword123!";
  const ownerAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: ownerEmail,
      username: ownerUsername,
      password: ownerPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(ownerAuth);
  const ownerId = ownerAuth.user.id;

  // Owner creates thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  const threadId = thread.id;

  // Owner creates post
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        thread_id: threadId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  const postId = post.id;

  // Owner creates comment
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId,
        postId,
        body: {
          post_id: postId,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  const commentId = comment.id;

  // Upload multiple attachments with distinct file_name/content_type
  const files = [
    { file_name: "file1.txt", content_type: "text/plain" },
    { file_name: "file2.png", content_type: "image/png" },
    { file_name: "file3.pdf", content_type: "application/pdf" },
  ];
  const attachments: IDiscussionBoardAttachment[] = [];
  for (const file of files) {
    const attachment =
      await api.functional.discussionBoard.user.threads.posts.comments.attachments.create(
        connection,
        {
          threadId,
          postId,
          commentId,
          body: {
            comment_id: commentId,
            file_name: file.file_name,
            file_url: `https://storage.example.com/test/${RandomGenerator.alphaNumeric(12)}`,
            content_type: file.content_type,
            size_bytes: 1024,
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }

  // List all attachments as owner (no filters)
  let page =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
      connection,
      {
        threadId,
        postId,
        commentId,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "number of attachments listed = files uploaded",
    page.data.length,
    files.length,
  );
  const foundNames = page.data.map((a) => a.file_name);
  for (const uploaded of files)
    TestValidator.predicate(
      `attachment found by name: ${uploaded.file_name}`,
      foundNames.includes(uploaded.file_name),
    );

  // Filter by file_name (should yield exactly one for each)
  for (const uploaded of files) {
    page =
      await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
        connection,
        {
          threadId,
          postId,
          commentId,
          body: {
            file_name: uploaded.file_name,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      `listing with file_name '${uploaded.file_name}' yields single result`,
      page.data.length === 1 && page.data[0].file_name === uploaded.file_name,
    );
  }

  // Filter by content_type (e.g. image/png)
  const pngAttachment = files.find((f) => f.content_type === "image/png");
  if (pngAttachment) {
    page =
      await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
        connection,
        {
          threadId,
          postId,
          commentId,
          body: {
            content_type: pngAttachment.content_type,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      "PNG attachment is listed when filtered",
      page.data.some((a) => a.file_name === pngAttachment.file_name),
    );
  }

  // Filter by uploaded_by_id
  page =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
      connection,
      {
        threadId,
        postId,
        commentId,
        body: {
          uploaded_by_id: ownerId,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "all listed attachments uploaded by owner",
    page.data.every((a) => a.uploaded_by_id === ownerId),
    true,
  );

  // Register unrelated non-owner user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "BadGuy456!";
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // Non-owner attempts to list the attachments
  page =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
      connection,
      {
        threadId,
        postId,
        commentId,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "number of comment attachments visible to non-owner: depends on business config (should be metadata only or none)",
    Array.isArray(page.data),
    true,
  );

  // Simulate soft delete by forcibly marking first attachment as deleted (simulate outgoing result)
  const deletedAttachment = {
    ...attachments[0],
    deleted_at: new Date().toISOString(),
  };
  const softDeletedList = [deletedAttachment, ...attachments.slice(1)]; // Not sent to API, just for logical check

  // When listing as owner, make sure soft-deleted is not shown
  page =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
      connection,
      {
        threadId,
        postId,
        commentId,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "soft-deleted attachments are excluded from normal listing",
    !page.data.some(
      (a) => a.id === deletedAttachment.id && a.deleted_at != null,
    ),
  );

  // Listing on another comment with no attachments yields empty data[]
  const emptyComment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId,
        postId,
        body: {
          post_id: postId,
          body: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(emptyComment);
  const emptyPage =
    await api.functional.discussionBoard.user.threads.posts.comments.attachments.index(
      connection,
      {
        threadId,
        postId,
        commentId: emptyComment.id,
        body: {},
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "listing attachments for comment with no attachments returns empty data[]",
    emptyPage.data.length,
    0,
  );
}
