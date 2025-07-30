import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Discussion board 코멘트 생성시 필수 필드 미입력(input 누락) 유효성 검증
 *
 * 필수 입력 값(discussion_board_member_id, discussion_board_post_id, content) 중 하나
 * 또는 이상을 누락하고 코멘트 작성 시도시, API가 스키마 수준 유효성 오류로 명확한 validation error(필수 필드 누락) 을
 * 반환하는지 확인합니다.
 *
 * - 정상 입력일 때는 생성 성공 (assert 성공)
 * - 한 필드씩 누락하며 테스트하여, 각 케이스별로 오류 발생을 검사함
 * - 실제 응답은 HttpError 등 예외 케이스 발생 여부만 단순 검증 (특정 메시지/코드 비교는 생략)
 *
 * 테스트 단계:
 *
 * 1. Discussion_board_member_id 누락 케이스: 예상대로 오류 발생하는지 확인
 * 2. Discussion_board_post_id 누락 케이스: 예상대로 오류 발생하는지 확인
 * 3. Content 누락 케이스: 예상대로 오류 발생하는지 확인
 * 4. 모든 필드 정상 입력 시 성공적으로 게시되는지 확인
 */
export async function test_api_discussionBoard_test_create_comment_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. 모든 필드 정상 입력 시: 정상 생성
  const validInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: "정상 코멘트 입력입니다.",
  };
  const created = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: validInput,
    },
  );
  typia.assert(created);

  // 2. discussion_board_member_id 누락
  TestValidator.error("필수 discussion_board_member_id 누락")(() =>
    api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        // discussion_board_member_id: 누락 intentionally
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: "코멘트 입력 값",
      } as any,
    }),
  );

  // 3. discussion_board_post_id 누락
  TestValidator.error("필수 discussion_board_post_id 누락")(() =>
    api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        // discussion_board_post_id: 누락 intentionally
        content: "코멘트 입력 값",
      } as any,
    }),
  );

  // 4. content 누락
  TestValidator.error("필수 content 누락")(() =>
    api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        // content: 누락 intentionally
      } as any,
    }),
  );
}
