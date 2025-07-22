import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * 참조 중인 투표 유형 삭제 시도 시, 409 Conflict 오류가 발생하는지 검증합니다.
 *
 * - 투표 유형(예: "like") 생성
 * - 해당 투표 유형 ID를 참조하는 투표 레코드 1건 생성
 * - 해당 투표 유형 삭제 시도 → 참조중이므로 삭제 불가(409 발생)
 *
 * 이 테스트는 토론 게시판의 투표 유형 마스터 데이터가 실제 투표 레코드에서
 * 사용되고 있을 때, 일반적인 FK 무결성 또는 비즈니스 규칙에 따라 삭제가
 * 금지되고, API에서 이를 409(Conflict)로 응답하는지 확인합니다.
 *
 * 1. 임의 코드명, 이름, 설명의 투표유형을 새로 등록합니다
 * 2. 해당 투표 유형 ID로 votes.post로 1건 투표(최소 요구 필드로) 생성합니다
 * 3. votesType.delete(id) 수행 시 409 Conflict 에러를 받는지 확인합니다
 */
export async function test_api_discussionBoard_voteTypes_test_delete_vote_type_that_is_in_use(
  connection: api.IConnection,
) {
  // 1. 투표 유형 생성 (고유 코드값 보장)
  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: `like_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: "공감테스트유형",
      description: "e2e referential integrity 테스트용",
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(voteType);

  // 2. 해당 ID를 참조하는 투표 생성(thread, post, comment 없음)
  const vote = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType.id,
    } satisfies IDiscussionBoardVote.ICreate,
  });
  typia.assert(vote);

  // 3. 투표 참조 중인 voteType을 삭제 시도 → 409 Conflict 오류 검증
  await TestValidator.error("referenced vote type delete should fail with 409")(
    async () => {
      await api.functional.discussionBoard.voteTypes.eraseById(connection, {
        id: voteType.id,
      });
    },
  );
}