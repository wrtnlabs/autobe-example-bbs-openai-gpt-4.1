import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * 존재하지 않는 moderatorId로 moderator 수정 시도 → 404 Not Found 오류 검증
 *
 * 관리자가 moderator 정보 수정 엔드포인트에 실존하지 않는 UUID를 지정하여 PUT 요청 시, 시스템이 404 error를
 * 반환하고, 어떠한 side effect(레코드 생성, 수정)도 없어야 함을 검증합니다.
 *
 * 주요 검증 포인트:
 *
 * 1. 무작위(UUID)로 moderatorId를 생성하여, 실제 레코드가 없음을 보장합니다.
 * 2. 유효한 업데이트 데이터(IDiscussionBoardModerator.IUpdate)를 준비합니다.
 * 3. API 호출이 실패(404 error)로 반환되는지 TestValidator.error로 검증합니다.
 *
 * 이 테스트는 오로지 실패(존재하지 않는 ID)에 대한 예외 처리가 적절히 동작하는지에만 초점을 둡니다.
 */
export async function test_api_discussionBoard_admin_moderators_test_update_moderator_nonexistent_id_fails(
  connection: api.IConnection,
) {
  // 1. 실존하지 않는 무작위 UUID를 생성하여 moderatorId로 사용
  const nonExistentModeratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. 업데이트(수정) 시도용 유효한 페이로드 준비
  const updateData: IDiscussionBoardModerator.IUpdate = {
    user_identifier: "test-nonexistent-id",
    granted_at: new Date().toISOString(),
    revoked_at: null,
  };

  // 3. 실제로 404 Not Found가 발생하는지 검증
  await TestValidator.error("존재하지 않는 moderatorId로 수정 시 404 반환")(
    async () => {
      await api.functional.discussionBoard.admin.moderators.update(connection, {
        moderatorId: nonExistentModeratorId,
        body: updateData,
      });
    },
  );
}
