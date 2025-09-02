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

/**
 * Test uploading valid and invalid attachments to a user's own post on the
 * discussion board.
 *
 * This test covers the end-to-end workflow for attachment upload, as well
 * as strict type and business rule validation for the
 * /discussionBoard/user/threads/{threadId}/posts/{postId}/attachments
 * endpoint. The scenario validates both normal and edge cases according to
 * platform constraints.
 *
 * Steps:
 *
 * 1. Register a new user with realistic random data and consent enabled.
 *
 *    - Use api.functional.auth.user.join
 *    - Ensure authentication context is established for all next steps.
 * 2. Create a new thread as the authenticated user.
 *
 *    - Use api.functional.discussionBoard.user.threads.create
 * 3. Create a new post in the newly created thread.
 *
 *    - Use api.functional.discussionBoard.user.threads.posts.create
 * 4. Upload a valid attachment (PDF or image) to the user's post using random
 *    but appropriate file metadata (e.g., .pdf, image/png, size < 1MB).
 *
 *    - Validate that:
 *
 *         - API call is successful with correct metadata returned (file_name,
 *                   file_url, content_type, size_bytes, post_id).
 *         - Returned post_id matches the created post, and other fields are correctly
 *                   reflected.
 *         - Use typia.assert on output type conformance.
 *         - Verify file_url is a non-empty string (for demonstration, assume
 *                   accessibility, but check presence).
 * 5. Negative test: Try to upload an attachment with unsupported content_type
 *    (e.g., ".exe" with application/x-msdownload) and assert a
 *    validation/business rule error using TestValidator.error.
 * 6. Negative test: Try to upload an attachment with size_bytes exceeding
 *    allowed maximum (simulate, e.g., 10MB or more if unspecified) and
 *    assert proper validation error.
 * 7. Throughout, assert logical requirements and field relationships with
 *    TestValidator (e.g., returned content_type matches input, post_id
 *    matches, file_url is non-empty).
 *
 * All dependencies (user registration, thread/post creation, authentication
 * context) must be executed in order, and authentication role switching is
 * not required for this scenario as only user operations are performed.
 */
export async function test_api_post_attachment_upload_success_and_type_validation(
  connection: api.IConnection,
) {
  // 1. Register user (and establish authentication in 'connection')
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(2).replace(/\s+/g, "_");
  const password = RandomGenerator.alphaNumeric(14) + "Ab!1";
  const displayName = RandomGenerator.name();
  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuthorized);
  const userId = userAuthorized.user.id;

  // 2. Create thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals("thread title matches input", thread.title, threadTitle);
  const threadId = thread.id;

  // 3. Create post in thread
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        thread_id: threadId,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post thread_id matches thread.id",
    post.thread_id,
    threadId,
  );
  const postId = post.id;

  // 4. Upload valid attachment (pdf)
  const validPdf: IDiscussionBoardAttachment.ICreate = {
    post_id: postId,
    comment_id: null,
    file_name: `${RandomGenerator.name(1)}_sample.pdf`,
    file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.pdf`,
    content_type: "application/pdf",
    size_bytes: 1048576 - 50000, // ~950KB, under a typical 1MB limit
  };
  const pdfAttachment =
    await api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId,
        postId,
        body: validPdf,
      },
    );
  typia.assert(pdfAttachment);
  TestValidator.equals(
    "attachment post_id matches input",
    pdfAttachment.post_id,
    postId,
  );
  TestValidator.equals(
    "attachment file_name matches input",
    pdfAttachment.file_name,
    validPdf.file_name,
  );
  TestValidator.equals(
    "attachment content_type matches input",
    pdfAttachment.content_type,
    validPdf.content_type,
  );
  TestValidator.equals(
    "attachment size_bytes matches input",
    pdfAttachment.size_bytes,
    validPdf.size_bytes,
  );
  TestValidator.predicate(
    "file_url is a non-empty string",
    typeof pdfAttachment.file_url === "string" &&
      pdfAttachment.file_url.length > 0,
  );

  // 4b. Upload valid image (png)
  const validPng: IDiscussionBoardAttachment.ICreate = {
    post_id: postId,
    comment_id: null,
    file_name: `${RandomGenerator.name(1)}_image.png`,
    file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.png`,
    content_type: "image/png",
    size_bytes: 525000, // ~512KB
  };
  const pngAttachment =
    await api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId,
        postId,
        body: validPng,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "attachment post_id matches input (PNG)",
    pngAttachment.post_id,
    postId,
  );
  TestValidator.equals(
    "attachment file_name matches input (PNG)",
    pngAttachment.file_name,
    validPng.file_name,
  );
  TestValidator.equals(
    "attachment content_type matches input (PNG)",
    pngAttachment.content_type,
    validPng.content_type,
  );
  TestValidator.equals(
    "attachment size_bytes matches input (PNG)",
    pngAttachment.size_bytes,
    validPng.size_bytes,
  );
  TestValidator.predicate(
    "file_url is a non-empty string (PNG)",
    typeof pngAttachment.file_url === "string" &&
      pngAttachment.file_url.length > 0,
  );

  // 5. Negative case: Upload with unsupported content_type (.exe)
  const invalidExe: IDiscussionBoardAttachment.ICreate = {
    post_id: postId,
    comment_id: null,
    file_name: `${RandomGenerator.name(1)}_virus.exe`,
    file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.exe`,
    content_type: "application/x-msdownload",
    size_bytes: 500000,
  };
  await TestValidator.error(
    "uploading .exe with unsupported content_type should fail",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.attachments.create(
        connection,
        {
          threadId,
          postId,
          body: invalidExe,
        },
      );
    },
  );

  // 6. Negative case: Upload with size_bytes = 10MB
  const tooLargeAttachment: IDiscussionBoardAttachment.ICreate = {
    post_id: postId,
    comment_id: null,
    file_name: `${RandomGenerator.name(1)}_huge.pdf`,
    file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}_huge.pdf`,
    content_type: "application/pdf",
    size_bytes: 10485760, // 10MB
  };
  await TestValidator.error(
    "uploading oversized attachment (>10MB) should fail",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.attachments.create(
        connection,
        {
          threadId,
          postId,
          body: tooLargeAttachment,
        },
      );
    },
  );
}
