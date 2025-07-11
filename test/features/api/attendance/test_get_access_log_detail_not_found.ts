import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 존재하지 않는 접근 로그 ID에 대한 상세 조회 실패 검증
 *
 * - 1) 존재하지 않는(랜덤) UUID로 조회 시 404 에러 반환 확인
 * - 2) 잘못된 UUID 포맷(예: 일반 문자열, 비어있음) 전달 시 유효성 예외 반환 확인
 *
 * 다양한 실패 케이스에 대해 적절한 오류 반환 여부를 검증하며,
 * 각 시나리오별로 TestValidator.error 등을 이용해 API의 견고함을 테스트한다.
 */
export async function test_api_attendance_accessLogs_test_get_access_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는(랜덤) UUID로 조회 시 404 not found 반환
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 UUID는 404 not found")(async () => {
    await api.functional.attendance.accessLogs.getById(connection, {
      id: randomNonExistentId,
    });
  });

  // 2. 완전히 잘못된 UUID(단순 텍스트) 전달 시
  await TestValidator.error("UUID 포맷이 아닌 값은 유효성 예외가 발생해야 함")(async () => {
    await api.functional.attendance.accessLogs.getById(connection, {
      id: "not-a-uuid" as string & tags.Format<"uuid">,
    });
  });

  // 3. 빈 문자열
  await TestValidator.error("빈 문자열도 유효성 오류")(async () => {
    await api.functional.attendance.accessLogs.getById(connection, {
      id: "" as string & tags.Format<"uuid">,
    });
  });
}