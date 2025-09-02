import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for filtering post attachments in a discussion board by file
 * name, content type (MIME), and uploader.
 *
 * - Registers a new user and authenticates
 * - Creates a thread, a post inside the thread.
 * - Uploads several attachments of different types/names to that post.
 * - Calls the PATCH attachment list endpoint with various filter combinations
 *   to:
 *
 *   - Ensure only attachments matching the filter are returned
 *   - Ensure non-matching attachments are excluded
 *   - Validate empty result when filters match nothing
 *   - Validate uploading and filter logic works for all supported fields
 *       (file_name, content_type, uploaded_by_id, and combinations)
 */
export async function test_api_attachment_list_with_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Testpass123!";
  const join = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(join);
  const user = join.user; // IDiscussionBoardUserSummary

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload multiple attachments
  const attachmentsToCreate = [
    {
      file_name: "image1.png",
      content_type: "image/png",
      file_url: "https://files.test.com/image1.png",
      size_bytes: 1024,
    },
    {
      file_name: "doc1.pdf",
      content_type: "application/pdf",
      file_url: "https://files.test.com/doc1.pdf",
      size_bytes: 2048,
    },
    {
      file_name: "note.txt",
      content_type: "text/plain",
      file_url: "https://files.test.com/note.txt",
      size_bytes: 512,
    },
  ];
  const uploadedSummaries: Array<{
    file_name: string;
    content_type: string;
    id: string;
  }> = [];
  for (const meta of attachmentsToCreate) {
    const attachment =
      await api.functional.discussionBoard.user.threads.posts.attachments.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            ...meta,
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    uploadedSummaries.push({
      file_name: meta.file_name,
      content_type: meta.content_type,
      id: attachment.id,
    });
  }

  // 5. FILTER BY file_name
  for (const meta of attachmentsToCreate) {
    const result =
      await api.functional.discussionBoard.threads.posts.attachments.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            file_name: meta.file_name,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `Filtering by file_name ${meta.file_name} returns exactly 1 correct attachment`,
      result.data.length === 1 && result.data[0].file_name === meta.file_name,
    );
  }

  // 6. FILTER BY content_type
  for (const meta of attachmentsToCreate) {
    const result =
      await api.functional.discussionBoard.threads.posts.attachments.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            content_type: meta.content_type,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `Filtering by content_type ${meta.content_type} returns expected attachment(s)`,
      result.data.some((x) => x.content_type === meta.content_type),
    );
    TestValidator.predicate(
      `Filtering by content_type excludes others`,
      result.data.every((x) => x.content_type === meta.content_type),
    );
  }

  // 7. FILTER BY uploaded_by_id
  const byUploader =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          uploaded_by_id: user.id,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(byUploader);
  TestValidator.predicate(
    `Filtering by uploader returns all uploaded attachments`,
    byUploader.data.length === attachmentsToCreate.length &&
      byUploader.data.every((x) => x.file_name && x.content_type),
  );

  // 8. COMBINED FILTER: file_name + content_type
  const combo =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          file_name: "image1.png",
          content_type: "image/png",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(combo);
  TestValidator.predicate(
    `Combined filter file_name+content_type returns correct attachment`,
    combo.data.length === 1 &&
      combo.data[0].file_name === "image1.png" &&
      combo.data[0].content_type === "image/png",
  );

  // 9. NEGATIVE: file_name not present
  const noneFile =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          file_name: "nonexistent.doc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(noneFile);
  TestValidator.equals(
    "Filtering by nonexistent file_name returns no results",
    noneFile.data.length,
    0,
  );

  // 10. NEGATIVE: content_type not present
  const noneType =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          content_type: "application/zip",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(noneType);
  TestValidator.equals(
    "Filtering by nonexistent content_type returns no results",
    noneType.data.length,
    0,
  );

  // 11. NEGATIVE: uploaded_by_id doesn't match any
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  const noneUploader =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          uploaded_by_id: fakeUserId,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(noneUploader);
  TestValidator.equals(
    "Filtering by nonexistent uploader returns no results",
    noneUploader.data.length,
    0,
  );
}
