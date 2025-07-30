import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * 테스트 목적: 관리자가 특정 댓글 버전을 영구 삭제(하드 딜리트)하는 케이스를 검증합니다.
 *
 * 비즈니스 컨텍스트: 댓글은 여러 번 수정되어 버전 히스토리를 갖습니다. 일정 조건 하에 관리자는 문제된 버전만 데이터베이스에서 영구 삭제할
 * 수 있습니다 (예: 법적/정책적 삭제, 개인정보 침해 등). 실유저 관점에서 버전 삭제 시 실제 UI에서 히스토리 목록이 갱신되고, 해당
 * 버전의 데이터가 더 이상 조회되지 않는지를 확인해야 합니다. (감사 로그, 감사 사업무는 이 엔드포인트가 오픈되어 있다고 전제하고 별도
 * 검증하지 않음)
 *
 * 시나리오 요약 / 테스트 흐름:
 *
 * 1. 가상의 댓글 작성 멤버 UUID, 게시글 UUID 준비 (실제 회원/게시글 인증 및 생성은 생략, UUID만 랜덤 생성)
 * 2. 일반 멤버로 댓글을 하나 생성 (최초 댓글 버전 생성)
 * 3. 동일 댓글에 대해 새로운 버전(수정본) 추가 (최소 2개 버전 보유)
 * 4. 관리자로 전환 (특수 플로우는 별도 인증 없이 호출 가능하다고 간주)
 * 5. 두 번째 버전(수정본)을 지정하여 버전 삭제 API 호출
 * 6. (기능 상 API상에서 실제 남은 버전 확인은 불가, 별도 목록/조회 API 없음) 삭제 API가 정상 success(에러 반환 없음)으로
 *    처리되는지만 검증
 * 7. (의도적으로 삭제 API가 오류 발생시 TestValidator.error 사용)
 *
 * 검증 포인트:
 *
 * - 삭제 API 호출시 반환 오류 없이 성공적으로 처리되는지
 * - 잘못된 versionId 입력시(존재하지 않는 UUID) 오류가 발생하는지 [엣지 케이스]
 */
export async function test_api_discussionBoard_test_delete_comment_version_as_admin_success(
  connection: api.IConnection,
) {
  // 1. 테스트에 사용할 멤버 UUID, 게시글 UUID 생성 (랜덤)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. 댓글 생성 (최초 버전)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "최초 댓글 버전",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. 댓글 버전 추가 (수정 버전)
  const secondVersion =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: memberId,
          content: "두번째 버전(수정본)",
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(secondVersion);

  // 4. 관리자로 전환 처리 (API 인증/전환 플로우가 주어지지 않았으므로 별도 인증없이 호출 가능하다고 간주)

  // 5. 버전 삭제 API 호출 (두 번째 버전 삭제)
  await api.functional.discussionBoard.admin.comments.versions.erase(
    connection,
    {
      commentId: comment.id,
      versionId: secondVersion.id,
    },
  );

  // 6. 존재하지 않는 versionId로 삭제 시도시 오류 발생 확인 (엣지/오류 케이스)
  await TestValidator.error("존재하지 않는 버전 삭제 오류")(() =>
    api.functional.discussionBoard.admin.comments.versions.erase(connection, {
      commentId: comment.id,
      versionId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
