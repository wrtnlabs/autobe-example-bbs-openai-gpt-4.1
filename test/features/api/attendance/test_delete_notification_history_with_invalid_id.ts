import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * 존재하지 않는 notification history ID에 대해 삭제(DELETE) 시 404 Not Found 에러가 반환되는지 검증하며,
 * 이미 삭제된(존재하지 않는) row에 대해 중복 삭제 요청 시에도 동일하게 404가 반환됨을 확인합니다.
 *
 * - 별도의 사전 데이터 준비 없이, 임의의 UUID를 사용하여 테스트합니다.
 * - 테스트 과정에서 실제로 해당 레코드는 DB에 존재하지 않아야 하며, typia.random<string & tags.Format<"uuid">>()로 생성합니다.
 *
 * 구현 순서:
 * 1. 존재하지 않는 id로 최초 DELETE 요청 → 404 Not Found 검증
 * 2. 같은 id로 DELETE 재요청 → 404 Not Found 재검증
 * @author AutoBE
 */
export async function test_api_attendance_notificationHistories_eraseById_test_delete_notification_history_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 notification history id 생성
  const invalidId = typia.random<string & tags.Format<"uuid">>();

  // 2. 존재하지 않는 id에 대한 최초 DELETE 요청 → 404
  await TestValidator.error("존재하지 않는 id의 삭제요청은 404 not found이어야 한다")(
    async () => {
      await api.functional.attendance.notificationHistories.eraseById(connection, { id: invalidId });
    },
  );

  // 3. 동일 id로 다시 DELETE 시도 → 404 재확인
  await TestValidator.error("이미 삭제된(존재하지 않는) id의 삭제도 404 not found이어야 한다 (중복 요청)")(
    async () => {
      await api.functional.attendance.notificationHistories.eraseById(connection, { id: invalidId });
    },
  );
}