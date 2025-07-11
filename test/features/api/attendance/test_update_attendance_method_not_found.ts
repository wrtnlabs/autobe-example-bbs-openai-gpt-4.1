import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 존재하지 않는 출석 방식 ID로 수정을 요청했을 때 404 Not Found 오류가 발생해야 함을 검증한다.
 *
 * 시스템이 잘못된 UUID(존재하지 않는 출석 방식 id)로 수정 요청 시 적절히 예외를 반환하는지 확인하는 시나리오이다.
 *
 * 1. 무작위로 생성한 UUID(존재하지 않는 id)로 출석 방식 수정 API를 호출한다.
 * 2. method_name, description 등 일반적인 유효 body를 전달한다.
 * 3. 정상적으로 404 예외가 발생하는지만 검증한다. (에러 메시지까지 확인하지 않음)
 */
export async function test_api_attendance_test_update_attendance_method_not_found(
  connection: api.IConnection,
) {
  await TestValidator.error("존재하지 않는 출석 방식 id로 수정 요청시 404 발생")(async () => {
    await api.functional.attendance.attendanceMethods.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        method_name: "FAKE_METHOD",
        description: "존재하지 않는 출석 방식 예외처리 테스트",
      },
    });
  });
}