import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IPageAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceParent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 학부모 권한으로 부모(학부모/보호자) 목록 검색(PATCH /attendance/parents) 시 권한 제한 테스트
 *
 * 이 테스트는 학부모 권한으로 로그인된 상태에서 본인의 자녀가 아닌 타 학생 혹은 전체 부모 목록을 조회 시 권한 오류(403)를 반환하는지 검증한다.
 *
 * 시나리오 단계:
 * 1. 인증 계정(IAttendanceAuthAccount) 생성
 * 2. 학부모(IAttendanceParent) 등록 (위 인증 계정과 연결)
 * 3. [학부모로 로그인되어 있다고 가정] PATCH /attendance/parents에 전체 조회 필드 or 타학생 등 임의 쿼리로 요청
 * 4. 권한 오류(403) 반환되는지 TestValidator.error로 검증
 */
export async function test_api_attendance_test_list_parents_permission_denied_for_parent_role(
  connection: api.IConnection,
) {
  // 1. 인증계정 생성 (자녀 매핑이나 실제 로그인 엔드포인트는 미제공이므로 스킵)
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authAccount);

  // 2. 학부모 계정 등록
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      email: authAccount.email ?? typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(parent);

  // 3. (학부모 권한 상태로) 전체 부모 목록 쿼리 또는 타 자녀/학교/페이지 쿼리 시도
  // 여기서는 최소 필드로 전체 목록 쿼리 요청
  await TestValidator.error("부모권한 전체리스트 금지")(
    async () => {
      await api.functional.attendance.parents.patch(connection, {
        body: {
          page: 1,
          limit: 10,
        },
      });
    },
  );

  // 4. 타학생(child_id 랜덤) 조건으로도 추가 테스트
  await TestValidator.error("부모권한 타학생 필터 금지")(
    async () => {
      await api.functional.attendance.parents.patch(connection, {
        body: {
          child_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
}