import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * 토론 게시판 투표 타입 생성 시 잘못된 입력에 대해 시스템이 올바르게 거부하는지 테스트합니다.
 *
 * - 필수 필드 누락(코드, 이름)
 * - 빈 문자열 입력 (코드 또는 이름)
 * - 너무 긴 코드 값 (예: 256자 이상)
 * - 필수-값에 명시적 null 입력
 * - 모든 필드 미입력
 *
 * 각각의 잘못된 입력에 대해 시스템은 유효성 검증에 실패하여 리소스가 생성되지 않아야 하며, 오류가 발생하는지 검증합니다.
 *
 * 1. code 미입력 (required 누락)
 * 2. name 미입력 (required 누락)
 * 3. code 빈 문자열
 * 4. name 빈 문자열
 * 5. code가 과도하게 긴 값(300자)
 * 6. code, name에 명시적 null
 * 7. 모든 필드 미입력
 */
export async function test_api_discussionBoard_test_create_vote_type_with_invalid_input(
  connection: api.IConnection,
) {
  // 1. code 미입력 (필수 누락)
  await TestValidator.error("missing code")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        // code: intentionally omitted
        name: "공감",
      } as any,
    })
  );

  // 2. name 미입력 (필수 누락)
  await TestValidator.error("missing name")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: "upvote",
        // name: intentionally omitted
      } as any,
    })
  );

  // 3. code 빈 문자열
  await TestValidator.error("empty code")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: "",
        name: "추천",
      },
    })
  );

  // 4. name 빈 문자열
  await TestValidator.error("empty name")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: "like",
        name: "",
      },
    })
  );

  // 5. code 값이 너무 김 (예: 300자)
  await TestValidator.error("overly long code")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: "x".repeat(300),
        name: "공감",
      },
    })
  );

  // 6. code, name을 명시적으로 null 할당
  await TestValidator.error("null code and name")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: null,
        name: null,
      } as any,
    })
  );

  // 7. 모든 필드 미입력
  await TestValidator.error("all fields missing")(() =>
    api.functional.discussionBoard.voteTypes.post(connection, {
      body: {} as any,
    })
  );
}