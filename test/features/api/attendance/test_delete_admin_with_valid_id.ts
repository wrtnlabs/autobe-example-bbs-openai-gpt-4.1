import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 관리자(감독관) 삭제 API의 정상 동작 검증
 *
 * 이 테스트는 다음을 검증합니다.
 * 1. 관리자 생성 후, 해당 관리자 id에 대해 삭제 API를 호출할 경우 정상적으로 soft 삭제(직무 정지) 혹은 완전 삭제 처리가 되는지 확인
 * 2. 삭제 API의 응답값이 정확히 반환되는지 검증
 * 3. 삭제 후, 동일 id로 재조회 시 404 Not Found 오류 등 적절한 에러가 발생하는지 테스트
 *
 * [테스트 절차]
 * 1. 테스트용 관리자 계정(삭제 대상) 생성
 * 2. 삭제 API를 호출하여 정상 삭제 처리 여부 확인 및 응답값 검증
 * 3. 삭제된 관리자 계정을 재조회 시 NotFound(404) 발생 여부 및 에러 상황 추가 검증
 */
export async function test_api_attendance_test_delete_admin_with_valid_id(
  connection: api.IConnection,
) {
  // 1. 테스트용 관리자 계정 생성
  const adminCreateInput = {
    school_id: undefined, // 최상위 관리자용(또는 필요 시 null 허용)
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IAttendanceAdmin.ICreate;

  const admin = await api.functional.attendance.admins.post(connection, {
    body: adminCreateInput,
  });
  typia.assert(admin);

  // 2. 해당 관리자 id로 삭제 API 호출 및 정상 응답 검증
  const deletedAdmin = await api.functional.attendance.admins.eraseById(connection, {
    id: admin.id,
  });
  typia.assert(deletedAdmin);
  TestValidator.equals("삭제된 관리자 id가 일치함")(deletedAdmin.id)(admin.id);

  // 3. 삭제 처리된 관리자 id 재조회시 NotFound(404) 발생 검증 (의도적 에러 발생 여부 확인)
  await TestValidator.error("삭제된 관리자 재조회시 NotFound 오류")(
    async () => {
      await api.functional.attendance.admins.eraseById(connection, {
        id: admin.id,
      });
    },
  );
}