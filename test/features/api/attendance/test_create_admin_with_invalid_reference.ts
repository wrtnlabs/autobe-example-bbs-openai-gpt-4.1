import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 무결성 제약조건 위반(존재하지 않는 school_id/auth_account_id 참조) 관리자 생성 실패 테스트
 *
 * /attendance/admins(관리자 신규등록) 엔드포인트에 대해 실제 존재하지 않는 school_id, auth_account_id를 참조했을 때
 * 무결성 위반(422 등) 예외가 발생하는지를 검증합니다.
 *
 * 주요 테스트 시나리오:
 * 1. 존재하지 않는 school_id 참조로 관리자 생성 요청 → 예외 발생 확인
 * 2. 존재하지 않는 auth_account_id 참조로 관리자 생성 요청 → 예외 발생 확인
 *
 * 각 케이스는 typia.random을 통해 무작위 UUID를 생성하여 실존하지 않는 값을 만듭니다.
 * TestValidator.error()를 통해 API 호출 시 예외가 발생하는지 검증하며,
 * 실제 응답 메시지 등은 검증하지 않습니다.
 */
export async function test_api_attendance_test_create_admin_with_invalid_reference(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 school_id로 생성 요청 (auth_account_id는 임의 UUID)
  await TestValidator.error("존재하지 않는 school_id 참조 시 예외")(async () => {
    await api.functional.attendance.admins.post(connection, {
      body: {
        school_id: typia.random<string & tags.Format<"uuid">>(),
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
        name: "무결성 school_id", // 특성 파악 용도
        email: typia.random<string & tags.Format<"email">>()
      },
    });
  });
  
  // 2. 존재하지 않는 auth_account_id로 생성 요청 (school_id는 undefined)
  await TestValidator.error("존재하지 않는 auth_account_id 참조 시 예외")(async () => {
    await api.functional.attendance.admins.post(connection, {
      body: {
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
        name: "무결성 auth_account_id", // 특성 파악 용도
        email: typia.random<string & tags.Format<"email">>()
      },
    });
  });
}