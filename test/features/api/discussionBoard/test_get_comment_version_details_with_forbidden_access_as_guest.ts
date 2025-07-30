import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * 테스트 목적: 비회원(게스트, 인증되지 않은 사용자)이 특정 commentId와 versionId로 댓글 버전 세부 정보를 조회하려 할 때
 * 권한 오류(Forbidden/Unauthenticated)가 발생하는지 검증합니다.
 *
 * 비즈니스 시나리오:
 *
 * 1. (사전준비) 관리자 권한으로 게시판 회원을 등록합니다.
 * 2. 해당 회원 id로 댓글을 작성합니다.
 * 3. 댓글의 새로운 버전을 추가(수정)합니다.
 * 4. 게스트(비로그인) 상태에서 moderator 버전 조회 API로 방금 만든 버전을 조회 시도합니다.
 * 5. 권한 오류(인증 실패/금지)를 확인하여, 댓글 버전 히스토리 열람에 대한 RBAC(역할 기반 접근제어)가 제대로 적용되는지 검증합니다.
 *
 * 상세 테스트 플로우:
 *
 * 1. 관리자 엔드포인트로 board member 등록 (minimum 필드)
 * 2. Member id로 댓글 작성 (게시글 id는 무작위)
 * 3. 해당 댓글에 대해, member가 새로운 내용으로 버전(수정본) 생성
 * 4. Connection의 인증(Authorization) 헤더가 없는 상태(게스트)에서, moderator 버전 단건 조회 엔드포인트 호출
 * 5. Forbidden 혹은 Unauthenticated 오류 발생 확인 (TestValidator.error)
 */
export async function test_api_discussionBoard_test_get_comment_version_details_with_forbidden_access_as_guest(
  connection: api.IConnection,
) {
  // 1. 관리자 권한으로 board member 등록
  const now: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: now,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. 해당 멤버로 댓글 생성
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(2),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. 댓글 버전(수정본) 생성
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: member.id,
          content: RandomGenerator.paragraph()(3),
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 4-5. 인증 헤더가 없는(게스트) 연결에서 moderator 버전 상세 조회시 권한 오류 발생 검증
  await TestValidator.error(
    "비회원은 댓글 버전 세부 정보에 접근할 수 없어야 함",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.versions.at(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
      },
    );
  });
}
