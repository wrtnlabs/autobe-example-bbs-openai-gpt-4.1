import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * 비인증(게스트) 상태에서 게시글에 댓글을 작성 시도할 경우를 테스트합니다.
 *
 * 인증되지 않은 사용자가 댓글을 작성하면 접근이 거부(403 Forbidden 또는 401 Unauthorized)되어야 하며, 반드시
 * 인증된 회원만이 댓글 작성이 가능함을 보장해야 합니다.
 *
 * [테스트 절차]
 *
 * 1. 임의의 댓글 생성 파라미터를 준비합니다.
 * 2. 별도의 로그인/인증 과정을 거치지 않은 connection(guest 상태)으로 댓글 작성 API를 호출합니다.
 * 3. Forbidden(403) 또는 Unauthorized(401) 에러가 발생하는지 검증합니다.
 */
export async function test_api_discussionBoard_test_create_comment_as_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. 임의의 댓글 생성 파라미터 준비
  const createInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: "테스트 댓글 내용입니다.",
  };

  // 2. 인증되지 않은(비로그인) 상태로 댓글 작성 시도 → 반드시 권한 에러가 발생해야 함
  await TestValidator.error("비인증 사용자의 댓글 작성 금지")(async () => {
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: createInput,
    });
  });
}
