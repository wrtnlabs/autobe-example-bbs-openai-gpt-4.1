import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 존재하지 않는 출석 코드 ID로 삭제 시 404 에러를 반환하는지 테스트합니다.
 *
 * 테스트 목적: 허용된(권한 있는) 계정으로 /attendance/attendanceCodes/{id} DELETE API 호출 시,
 * 존재하지 않는 id(랜덤 UUID) 입력 시 404 Not Found 에러가 발생함을 보장.
 *
 * 절차:
 * 1. 삭제 권한을 가진 출석 인증 계정을 새로 생성한다.
 * 2. 해당 계정으로 로그인된 connection으로 임의의(존재하지 않는) UUID로 삭제 API를 호출한다.
 * 3. 404 에러가 발생하는지 TestValidator.error()로 확인한다.
 */
export async function test_api_attendance_test_delete_attendance_code_not_found(
  connection: api.IConnection,
) {
  // 1. 삭제 권한 계정 생성(이메일·패스워드는 랜덤)
  const authAccount = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: typia.random<string>(),
      } satisfies IAttendanceAuthAccount.ICreate,
    },
  );
  typia.assert(authAccount);

  // 2. 존재하지 않는 출석코드 UUID 생성(중복될 확률이 사실상 0)
  const fakeAttendanceCodeId = typia.random<string & tags.Format<"uuid">>();

  // 3. 출석코드 삭제 API 호출 시 404 에러 발생 여부 검증
  await TestValidator.error("존재하지 않는 출석코드 삭제 시 404 에러")(
    async () => {
      await api.functional.attendance.attendanceCodes.eraseById(connection, {
        id: fakeAttendanceCodeId,
      });
    },
  );
}