import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * 일반 회원은 타인의 댓글에 대해 버전(수정본)을 생성할 수 없음(권한 불가) 검증
 *
 * - 두 명의 별도 회원을 관리자로 등록
 * - 첫 번째 회원이 댓글 작성
 * - 두 번째 회원이 해당 댓글에 버전을 생성 시도 → 반드시 권한오류(Permission Denied) 발생
 * - 본인만 자신의 댓글에 버전(수정)을 생성할 수 있음을 검증
 *
 * 1. Admin 계정으로 member1 생성 (user_identifier, joined_at)
 * 2. Admin 계정으로 member2 생성
 * 3. Member1으로 댓글 작성 (member id, post id 부여)
 * 4. Member2가 댓글 버전 생성 시도(comment 작성자가 아님) → 권한 오류/예외 발생 확인
 */
export async function test_api_discussionBoard_test_create_comment_version_permission_denied_for_other_members(
  connection: api.IConnection,
) {
  // 1. 첫 번째 회원(admin 생성)
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member1);

  // 2. 두 번째 회원(admin 생성)
  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member2);

  // 3. member1이 댓글 작성 (body에 직접 member1 id 사용)
  const dummyPostId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member1.id,
        discussion_board_post_id: dummyPostId,
        content: RandomGenerator.paragraph()(3),
      },
    },
  );
  typia.assert(comment);

  // 4. member2가 타인 댓글에 버전 생성 (editor_member_id: member2.id)
  await TestValidator.error(
    "타인 댓글에 대해 버전 생성 시 권한 오류 발생해야 함",
  )(() =>
    api.functional.discussionBoard.member.comments.versions.create(connection, {
      commentId: comment.id,
      body: {
        discussion_board_comment_id: comment.id,
        editor_member_id: member2.id,
        content: RandomGenerator.paragraph()(3),
      },
    }),
  );
}
