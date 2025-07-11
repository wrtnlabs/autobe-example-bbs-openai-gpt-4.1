import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";
import type { IPageIAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAccessLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 잘못된 필터 파라미터로 출결 접근 로그 리스트 API 호출 시 오류 반환 검증
 *
 * 출결 시스템 접속 로그 조회(PATCH /attendance/accessLogs) 호출 시, 다음과 같이 허용되지 않은 필터 또는 잘못된 타입 값으로 요청할 때
 * 1. 존재하지 않는 FK(teacher_id, student_id 등) 필드에 잘못된 UUID 포맷, 혹은 UUID가 아님
 * 2. 맞지 않는 타입 (예: page, limit에 문자열 사용 등)
 * 3. 각종 형식오류 (IP 주소에 이상값, 날짜에 비정상 형식 등)
 * 4. 필수값 누락 (조합상 불가 조건 등)
 *
 * 이러한 입력 오류에 대해, 시스템이 422나 관련 유효성 검증 에러를 응답하는지 테스트한다.
 *
 * [테스트 구성]
 * 1. teacher_id, student_id, parent_id, admin_id, classroom_id 에 UUID가 아닌 값 전달
 * 2. page, limit에 숫자가 아닌 값 전달
 * 3. ip_address, accessed_at_start, accessed_at_end에 이상값/비정상 형식 전달
 * 4. 조합상 맞지 않는 요청 (예: limit이 0보다 작은 수)
 * 5. 존재하지 않는 필드 추가시 거부 여부 (API DTO에 정의된 속성 외에 임의 필드 추가)
 *
 * 각각의 오류 입력별로, API가 적절히 에러(422 등) 응답하는지 TestValidator.error()로 검증한다.
 */
export async function test_api_attendance_test_list_access_logs_with_invalid_filter_parameter(
  connection: api.IConnection,
) {
  // 1. UUID 필드에 잘못된 값 전달
  for (const field of ["teacher_id", "student_id", "parent_id", "admin_id", "classroom_id"]) {
    const invalidBody = { [field]: "NOT-A-UUID" };
    await TestValidator.error(`${field}에 잘못된 UUID`)(async () => {
      await api.functional.attendance.accessLogs.patch(connection, { body: invalidBody as any });
    });
  }

  // 2. page, limit에 문자열 등 타입 불일치
  for (const field of ["page", "limit"]) {
    const invalidBody = { [field]: "this-must-be-number" };
    await TestValidator.error(`${field}에 숫자가 아님`)(async () => {
      await api.functional.attendance.accessLogs.patch(connection, { body: invalidBody as any });
    });
  }

  // 3. ip_address, accessed_at_start, accessed_at_end의 잘못된 형식
  await TestValidator.error("ip_address에 불가한 값")(async () => {
    await api.functional.attendance.accessLogs.patch(connection, { body: { ip_address: "999.999.999.999" } as any });
  });
  await TestValidator.error("accessed_at_start 잘못된 date-time")(async () => {
    await api.functional.attendance.accessLogs.patch(connection, { body: { accessed_at_start: "23-02-33333" } as any });
  });
  await TestValidator.error("accessed_at_end 잘못된 date-time")(async () => {
    await api.functional.attendance.accessLogs.patch(connection, { body: { accessed_at_end: "not-a-date" } as any });
  });

  // 4. limit이 범위 밖(음수 등)
  await TestValidator.error("limit에 음수")(async () => {
    await api.functional.attendance.accessLogs.patch(connection, { body: { limit: -10 } as any });
  });

  // 5. 존재하지 않는 필드 추가로 허용 거부
  await TestValidator.error("존재하지 않는 필드 추가")(async () => {
    await api.functional.attendance.accessLogs.patch(connection, { body: { fakeField: "should be rejected" } as any });
  });
}