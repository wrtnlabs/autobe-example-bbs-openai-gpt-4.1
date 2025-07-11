import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 존재하지 않는 출석코드 상세 조회 시 404 반환 검증
 *
 * - 선행 조건: 권한 있는 인증계정(유저) 정보를 생성한다.
 * - 검증 흐름: 해당 계정 로그인/인증 상태에서, 실제로 존재하지 않는 출석 코드 ID(UUID)로 상세 조회를 시도한다.
 * - 기대 결과: 404 Not Found 에러가 발생한다.
 *
 * 1. 권한 있는 인증 계정을 생성한다.
 * 2. typia.random<string & tags.Format<"uuid">>()로 시스템에 존재하지 않는 출석 코드 ID를 랜덤 생성한다.
 * 3. 해당 계정의 인증 정보로 무효 코드 ID 상세 조회 요청을 보낸다.
 * 4. TestValidator.error로 404 에러 발생을 검증한다.
 */
export async function test_api_attendance_test_get_attendance_code_detail_not_found(
  connection: api.IConnection,
) {
  // 1. 인증 계정(권한 사용자) 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 존재하지 않는 출석코드 UUID 생성
  const nonExistId = typia.random<string & tags.Format<"uuid">>();

  // 3. 존재하지 않는 코드 상세 조회 시도 및 4. 404 에러 검증
  await TestValidator.error("존재하지 않는 출석코드 상세조회 404 에러 검증")(
    () => api.functional.attendance.attendanceCodes.getById(connection, {
      id: nonExistId,
    }),
  );
}