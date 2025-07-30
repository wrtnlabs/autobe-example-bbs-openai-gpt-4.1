import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * 인증되지 않은(비관리자) 사용자는 관리자 엔드포인트를 통해 댓글 버전을 삭제할 수 없음을 검증합니다.
 *
 * 즉, 비관리자(멤버) 세션에서 admin 댓글 버전 삭제 API를 호출하면, 권한 부족(Unauthorized/Forbidden) 에러가
 * 발생해야만 합니다. 테스트를 위해 사전 조건으로 댓글 및 그 댓글에 대한 버전이 1개 이상 존재해야 하며, 이 테스트는 실제 댓글/버전
 * 생성 후, 관리자가 아닌 상태에서 삭제를 시도하여 권한 오류를 확인하는 시나리오입니다.
 *
 * [테스트 절차]
 *
 * 1. 댓글을 생성 (discussion_board_member_id, discussion_board_post_id, content)
 * 2. 해당 댓글에 버전(수정 이력)을 추가로 1개 생성
 * 3. 관리자가 아닌(멤버) 세션으로, 댓글 버전 삭제(Admin API) 호출을 시도 -> 권한 오류(Forbidden/Unauthorized)
 *    발생 기대
 */
export async function test_api_discussionBoard_test_delete_comment_version_as_admin_unauthorized(
  connection: api.IConnection,
) {
  // 1. 댓글 생성 (discussion_board_member_id 및 post_id와 내용 지정)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: "테스트 댓글 본문 (E2E 권한 검증)",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. 해당 댓글에 버전(수정 이력)을 추가
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: comment.discussion_board_member_id,
          content: "수정된 댓글 버전 내용 (E2E 권한 검증)",
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 3. 관리자가 아닌 멤버 세션에서 관리자 API로 버전 삭제를 시도 (권한 에러가 발생해야 함)
  await TestValidator.error(
    "비관리자 세션에서 댓글 버전 삭제 시 권한 오류 발생해야 함",
  )(() =>
    api.functional.discussionBoard.admin.comments.versions.erase(connection, {
      commentId: comment.id,
      versionId: version.id,
    }),
  );
}
