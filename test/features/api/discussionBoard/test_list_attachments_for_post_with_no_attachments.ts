import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * 첨부파일이 없는 게시글의 첨부파일 목록 조회를 검증합니다.
 *
 * 게시판 thread에 첨부파일 없이 게시글을 작성한 뒤, 해당 게시글의 첨부파일 목록 조회 API를 호출하였을 때 빈 배열이
 * 반환되는지(첨부파일이 없음을 확인) 검증합니다.
 *
 * 1. 테스트용 threadId를 발급한 뒤, 해당 threadId에 본문만 포함하는 게시글을 생성합니다.
 * 2. 생성된 게시글(post)의 id로 첨부파일 목록 조회 API를 호출합니다.
 * 3. 첨부파일 데이터가 존재하지 않으므로, 에러가 발생함을 확인합니다.
 */
export async function test_api_discussionBoard_test_list_attachments_for_post_with_no_attachments(
  connection: api.IConnection,
) {
  // 1. 테스트 threadId 발급 및 첨부파일 없이 게시글 작성
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: "첨부가 없는 게시글 본문 내용",
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. 첨부파일 목록 조회 시, 데이터가 없어 에러가 발생하는지 확인
  await TestValidator.error("첨부파일 없음 에러 발생")(async () => {
    await api.functional.discussionBoard.posts.attachments.index(connection, {
      postId: post.id,
    });
  });
}
