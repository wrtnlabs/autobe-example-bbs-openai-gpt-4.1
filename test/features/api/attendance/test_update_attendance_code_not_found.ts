import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 존재하지 않는 출석 코드 ID로 출석코드 정보를 수정할 때의 404 에러 동작 검증
 *
 * 이 테스트의 목적은 실제로 존재하지 않는 임의의 UUID를 출석코드({@link IAttendanceAttendanceCode})의 id로 지정하여 PUT 요청 시,
 * 서버가 정상적으로 404 Not Found 에러를 반환하는지 확인하는 것입니다.
 *
 * [과정 요약]
 * 1. 수정 권한이 있는 인증 계정을 생성한다.
 * 2. typia.random을 사용해 실제로 존재하지 않는 임의의 UUID 값(충돌 가능성이 사실상 0인 UUID)을 생성한다.
 * 3. 모든 필수 필드가 포함된 임의의 출석코드 정보(IAttendanceAttendanceCode.IUpdate)를 생성한다.
 * 4. 해당 UUID와 함께 출석코드 수정(putById) API를 호출한다.
 * 5. 결과적으로 서버가 404 에러를 반환하는지 검증한다. (TestValidator.error)
 */
export async function test_api_attendance_test_update_attendance_code_not_found(
  connection: api.IConnection,
) {
  // 1. 수정 권한이 있는 인증 계정 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 실제 존재하지 않는 UUID 생성
  const notFoundId = typia.random<string & tags.Format<"uuid">>();

  // 3. 임의의 출석코드 전체 수정 데이터 생성
  const updateBody = typia.random<IAttendanceAttendanceCode.IUpdate>();

  // 4. putById 호출 시 404 에러인지 확인
  await TestValidator.error("존재하지 않는 출석코드 ID로 PUT시 404 에러")(
    async () => {
      await api.functional.attendance.attendanceCodes.putById(connection, {
        id: notFoundId,
        body: updateBody,
      });
    },
  );
}