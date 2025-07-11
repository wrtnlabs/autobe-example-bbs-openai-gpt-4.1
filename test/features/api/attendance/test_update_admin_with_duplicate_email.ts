import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 이미 존재하는 이메일로 관리자의 이메일을 변경하려 할 때 409 충돌 오류를 반환하는지 검증
 *
 * 본 테스트는 관리자 정보(이메일)를 수정하는 /attendance/admins/{id} API에서, 이미 존재하는 다른 관리자의 이메일로 이메일을 변경할 경우
 * 유니크 제약조건(DB unique/email) 위반으로 409 오류가 발생하는지 확인합니다.
 *
 * 테스트 순서:
 * 1. 관리자 A 신규 생성 (고유 이메일)
 * 2. 관리자 B 신규 생성 (서로 다른 이메일)
 * 3. 관리자 B의 이메일을 A의 이메일로 update(putById) → 409 에러가 발생하는지 검증
 *
 * 정상적으로 409 오류가 발생해야 테스트 통과
 */
export async function test_api_attendance_test_update_admin_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 관리자 A 신규 생성
  const emailA = typia.random<string & tags.Format<"email">>();
  const adminA = await api.functional.attendance.admins.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "관리자A",
      email: emailA,
      // 소속학교(pk)는 optional이므로 랜덤 null
      school_id: Math.random() < 0.5 ? undefined : typia.random<string & tags.Format<"uuid">>(),
    } satisfies IAttendanceAdmin.ICreate,
  });
  typia.assert(adminA);

  // 2. 관리자 B 신규 생성 (이메일 중복 없이)
  let emailB: string & tags.Format<"email">;
  do {
    emailB = typia.random<string & tags.Format<"email">>();
  } while (emailB === emailA);

  const adminB = await api.functional.attendance.admins.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "관리자B",
      email: emailB,
      school_id: Math.random() < 0.5 ? undefined : typia.random<string & tags.Format<"uuid">>(),
    } satisfies IAttendanceAdmin.ICreate,
  });
  typia.assert(adminB);

  // 3. 관리자 B의 이메일을 A의 이메일로 변경 시도 → 409 오류 검증
  await TestValidator.error("중복 이메일로 이메일 변경 시 409 오류 발생")(
    () =>
      api.functional.attendance.admins.putById(connection, {
        id: adminB.id,
        body: {
          email: emailA,
        } satisfies IAttendanceAdmin.IUpdate,
      }),
  );
}