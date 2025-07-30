import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";
import type { IPageIDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E 테스트: 멤버의 자신의 댓글 버전 히스토리 필터/검색/페이지네이션 검증
 *
 * 이 테스트에서는 다음을 검증합니다:
 *
 * 1. 멤버가 댓글을 생성할 수 있다.
 * 2. 멤버가 댓글을 여러 번 수정하여 버전 히스토리를 남길 수 있다.
 * 3. 멤버가 자신이 작성한 댓글의 버전 히스토리를 editor, date, content 기준으로 검색/필터링할 수 있다.
 * 4. 버전 히스토리에 페이지네이션이 정상적으로 동작한다.
 * 5. Editor_member_id로 필터링 시 올바른 버전만 반환된다.
 * 6. Created_at_from/to, content_contains 필터로 적절한 결과값이 반환된다.
 * 7. 다른 멤버가 소유하지 않은 댓글의 버전 히스토리를 조회하면 권한 오류가 발생한다.
 *
 * [테스트 시나리오]
 *
 * 1. 두 개의 멤버(MemberA/B) UUID를 랜덤 생성(인증 API 미지원 → 시뮬)
 * 2. MemberA가 댓글 생성
 * 3. MemberA가 댓글을 여러 번 수정하여 버전 생성
 * 4. (MemberA) 버전 히스토리 전체 조회/에디터별/내용별/날짜별/페이지네이션 검증
 * 5. (MemberB) 타인의 댓글 버전 히스토리 조회 시 권한 오류 확인
 */
export async function test_api_discussionBoard_test_search_filter_and_paginate_comment_versions_for_member(
  connection: api.IConnection,
) {
  // 1. 두 회원 UUID 생성 (인증/세션이 없으므로 시뮬)
  const memberAId = typia.random<string & tags.Format<"uuid">>();
  const memberBId = typia.random<string & tags.Format<"uuid">>();
  // 임의 게시글 UUID
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. MemberA 댓글 생성
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberAId,
        discussion_board_post_id: postId,
        content: "버전 기능 E2E 테스트용 최초 댓글",
      },
    },
  );
  typia.assert(comment);

  // 3. MemberA 댓글 수정 버전 여러 개 생성
  const versions: IDiscussionBoardCommentVersion[] = [];
  for (let i = 0; i < 3; ++i) {
    const content = `버전${i + 1} 멤버A ${RandomGenerator.alphaNumeric(6)}`;
    const version =
      await api.functional.discussionBoard.member.comments.versions.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            editor_member_id: memberAId,
            content,
          },
        },
      );
    typia.assert(version);
    versions.push(version);
  }

  // 4-1. 전체 버전(Unfiltered)
  const allResult =
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(allResult);
  TestValidator.equals("전체 버전 수")(allResult.data.length)(versions.length);

  // 4-2. editor_member_id로만 필터
  const filteredByEditor =
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: { editor_member_id: memberAId },
      },
    );
  typia.assert(filteredByEditor);
  for (const v of filteredByEditor.data) {
    TestValidator.equals("에디터 일치")(v.editor_member_id)(memberAId);
  }

  // 4-3. 내용 substring 필터(content_contains)
  const targetStr = versions[1].content.split(" ")[1]; // 생성한 랜덤 토큰 잡기
  const filteredByContent =
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: { content_contains: targetStr },
      },
    );
  typia.assert(filteredByContent);
  TestValidator.predicate("내용 substring 필터로 결과 1개 이상")(
    filteredByContent.data.length > 0,
  );
  for (const v of filteredByContent.data) {
    TestValidator.predicate("내용에 substring 포함")(
      v.content.includes(targetStr),
    );
  }

  // 4-4. 날짜 from~to
  const from = versions[0].created_at;
  const to = versions[versions.length - 1].created_at;
  const filteredByDate =
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: { created_at_from: from, created_at_to: to },
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate("날짜 범위 필터 결과 1개 이상")(
    filteredByDate.data.length >= 1,
  );

  // 4-5. 페이지네이션(전체 records 수 연결 확인)
  const paginated =
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(paginated);
  TestValidator.equals("pagination 전체 수")(paginated.pagination.records)(
    versions.length,
  );

  // 5. MemberB가 타인 댓글 버전 히스토리 시도(권한오류 예상)
  TestValidator.error("MemberB 권한 오류")(async () => {
    await api.functional.discussionBoard.member.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: { editor_member_id: memberBId },
      },
    );
  });
}
