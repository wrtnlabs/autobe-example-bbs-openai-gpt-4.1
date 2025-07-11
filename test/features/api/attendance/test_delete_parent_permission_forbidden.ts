import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 타인 학부모 정보를 자신의 부모 계정(ownership이 아님)에서 삭제를 시도할 경우 권한 오류(403)가 반환되는지 확인한다.
 *
 * 1. 본인 학부모(Parent A) 계정을 먼저 등록한다.
 * 2. 타인 학부모(Parent B) 계정을 추가로 등록한다.
 * 3. Parent A의 권한(자신의 connection) 상태에서 Parent B의 id로 삭제(eraseById)를 시도한다.
 * 4. 반드시 403 Forbidden 권한 에러가 발생해야 하며, TestValidator.error를 사용해 오류 발생을 명확히 검증한다.
 */
export async function test_api_attendance_test_delete_parent_permission_forbidden(
  connection: api.IConnection,
) {
  // 1. 본인 학부모(Parent A) 계정 등록
  const parentA = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "ParentA",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-0000-0000",
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentA);

  // 2. 타인 학부모(Parent B) 계정 등록
  const parentB = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "ParentB",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-1111-1111",
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentB);

  // 3. Parent A의 권한 상태에서 Parent B 계정 삭제를 시도 (자신이 소유하지 않은 학부모 계정)
  // 4. 403 Forbidden 권한 오류가 발생해야 함
  await TestValidator.error("타인 보호자 삭제시 403 에러 발생")(async () => {
    await api.functional.attendance.parents.eraseById(connection, {
      id: parentB.id,
    });
  });
}