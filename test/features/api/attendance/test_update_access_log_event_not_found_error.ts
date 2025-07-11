import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 존재하지 않는 접근 로그 PK(id)로 접근 로그 수정 시 404 not found 에러가 발생하는지 검증합니다.
 *
 * 출결 시스템 access log 수정(putById) 엔드포인트에 실제 존재하지 않는 임의의 UUID를 id로 사용해 IAttendanceAccessLog.IUpdate 데이터를 요청 본문으로 전달하면,
 * 해당 PK가 DB에 없으므로 반드시 404 not found 에러가 발생해야 합니다.
 *
 * 이 테스트는 다음 흐름을 검증합니다:
 * 1. 임의의 UUID(존재하지 않는 PK)를 생성합니다.
 * 2. IAttendanceAccessLog.IUpdate 타입의 임의의 유효 데이터를 생성합니다.
 * 3. putById API 호출 시 404 not found 에러가 발생하는지만 TestValidator.error()로 검증합니다.
 *  (에러 메시지/타입 검증 및 정상 수정 케이스는 다루지 않습니다.)
 */
export async function test_api_attendance_test_update_access_log_event_not_found_error(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 랜덤 UUID 생성
  const nonExistId = typia.random<string & tags.Format<"uuid">>();

  // 2. 임의의 유효한 업데이트 데이터 생성
  const updateData = typia.random<IAttendanceAccessLog.IUpdate>();

  // 3. 존재하지 않는 PK에서 404 not found 오류가 발생하는지 검증(TestValidator.error)
  await TestValidator.error("존재하지 않는 PK 수정 404 not found 발생 확인")(
    () => api.functional.attendance.accessLogs.putById(connection, {
      id: nonExistId,
      body: updateData,
    }),
  );
}