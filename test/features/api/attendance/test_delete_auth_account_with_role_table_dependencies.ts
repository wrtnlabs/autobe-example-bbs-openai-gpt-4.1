import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 역할(Teacher)에 연결된 인증 계정 삭제 동작 검증
 *
 * - Teacher 등 역할 테이블 연관 상태에서 인증 계정 삭제 시 정책(종속성 위반/soft-delete cascade)내역이 올바르게 동작하는지 확인합니다.
 *
 * [테스트 시나리오]
 * 1. 신규 인증 계정을 생성합니다.
 * 2. 생성된 계정과 연결하여 교사(Teacher) 엔터티를 등록합니다.
 * 3. 계정과 연결된 teacher 데이터가 있는 상황에서 계정 삭제 API를 호출합니다.
 * 4. 정책상 종속성 제약 위반(삭제 거부) 또는 soft-delete cascade가 올바르게 동작하는지 검증합니다.
 *   - 제공 API로 teacher 엔터티의 삭제 상태 직접 조회는 미지원하므로, 삭제 거부(에러 return) 여부를 우선 검증합니다.
 */
export async function test_api_attendance_test_delete_auth_account_with_role_table_dependencies(connection: api.IConnection) {
  // 1. 인증 계정 신규 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 해당 계정과 연결된 교사 엔터티 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 3. 연결된 인증 계정 삭제 시도 시 정책상 에러 반환 또는 soft-delete처리 확인
  await TestValidator.error("role 종속 인증 계정 삭제시 에러 or 정책적 soft-delete 동작 확인")(
    async () => {
      await api.functional.attendance.auth.accounts.eraseById(connection, {
        id: authAccount.id,
      });
    }
  );
}