import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * 관리자가 댓글 내용을 성공적으로 수정할 수 있는지 검증합니다.
 *
 * 이 테스트는 관리자 권한이 있는 계정이 임의의 멤버가 생성한 댓글의 내용을 정상적으로 수정할 수 있음을 검증합니다. 댓글의
 * 내용(content)이 바뀌고, updated_at 시각이 갱신되어야 하며, 다른 PK·is_deleted 필드는 변하지 않아야 합니다.
 *
 * 테스트 과정:
 *
 * 1. 멤버 계정으로 댓글을 생성해 테스트 타깃 댓글을 준비합니다.
 * 2. 관리자가 해당 댓글의 content를 변경합니다.
 * 3. API 응답에서 id와 소프트 삭제 상태(is_deleted)가 유지되고, content와 updated_at은 실제 수정된 것을
 *    검증합니다. (감사 로그 등은 별도 API 없어 본 테스트에서는 확인하지 않음)
 */
export async function test_api_discussionBoard_test_admin_update_comment_content_success(
  connection: api.IConnection,
) {
  // 1. 멤버 계정으로 댓글 생성 (테스트 타깃 준비)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const originalContent = "원본 댓글 내용입니다.";

  const createdComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: originalContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(createdComment);

  // 2. 관리자가 댓글의 내용을 수정
  const updatedContent = "수정된 댓글 내용입니다.";
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(connection, {
      commentId: createdComment.id,
      body: {
        content: updatedContent,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);

  // 3. 수정 결과 검증 (PK, 삭제 상태는 유지, 내용과 updated_at은 변경)
  TestValidator.equals("id 동일함")(updatedComment.id)(createdComment.id);
  TestValidator.equals("post 동일함")(updatedComment.discussion_board_post_id)(
    postId,
  );
  TestValidator.equals("member 동일함")(
    updatedComment.discussion_board_member_id,
  )(memberId);
  TestValidator.notEquals("updated_at이 갱신됨")(updatedComment.updated_at)(
    createdComment.updated_at,
  );
  TestValidator.equals("수정된 content")(updatedComment.content)(
    updatedContent,
  );
  TestValidator.equals("is_deleted false 유지")(updatedComment.is_deleted)(
    false,
  );
}
