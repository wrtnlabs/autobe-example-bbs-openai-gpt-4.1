import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * [존재하지 않는 FK(외래키, 교실/교사)로 출석코드 생성 시 오류 반환 테스트]
 *
 * 이 테스트는 출석코드를 발급하는 API에서, 존재하지 않는 classroom_id(반), teacher_id(교사) 등 잘못된 FK를 입력해서 생성 요청했을 때 
 * 서버가 422 혹은 404 같은 적절한 오류코드를 반환하는지 검증합니다.
 *
 * 1. 출석코드 생성 권한을 위해 인증 계정을 하나 생성한다
 * 2. 임의의 존재하지 않는 UUID 값을 classroom_id, teacher_id로 하여 출석코드 생성 요청을 시도한다
 * 3. 422 또는 404에 해당하는 오류가 정상적으로 반환되는지 확인한다
 */
export async function test_api_attendance_test_create_attendance_code_with_invalid_fk(
  connection: api.IConnection,
) {
  // 1. 출석코드 생성 권한을 위해 인증 계정(관리자 또는 교사 권한)을 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(authAccount);

  // 2. 존재하지 않는 classroom_id, teacher_id 로 출석코드 생성 시도
  // - code_value: 실제 코드 유효 규칙(6자, 대문자/숫자)를 임의로 맞춰 사용
  // - issued_at/expires_at: 현재~만료 임의 할당
  const invalidClassroomId = typia.random<string & tags.Format<"uuid">>(); // 실제 존재하지 않는 UUID 가정
  const invalidTeacherId = typia.random<string & tags.Format<"uuid">>(); // 실제 존재하지 않는 UUID 가정
  const code_value = RandomGenerator.alphaNumeric(6).toUpperCase();

  const now = new Date();
  const issued_at = now.toISOString();
  const expires_at = new Date(now.getTime() + 60*60*1000).toISOString(); // 1시간 뒤 만료
  const body = {
    classroom_id: invalidClassroomId,
    teacher_id: invalidTeacherId,
    code_value,
    issued_at,
    expires_at,
    is_active: true,
  } satisfies IAttendanceAttendanceCode.ICreate;

  await TestValidator.error("존재하지 않는 FK로 출석코드 생성시 422 또는 404 응답")(() =>
    api.functional.attendance.attendanceCodes.post(connection, {
      body,
    })
  );
}