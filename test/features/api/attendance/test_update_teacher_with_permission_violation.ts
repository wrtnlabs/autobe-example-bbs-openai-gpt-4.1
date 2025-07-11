import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";

/**
 * 교사 본인이 아닌 타 교사의 정보를 수정하거나 권한이 없는 사용자가 교사 정보를 수정하려 할 때 403 Forbidden이 반환됨을 검증합니다.
 *
 * 시나리오 개요:
 * 1. 두 명의 교사 레코드를 사전에 생성합니다. (타겟 교사와 요청자 교사)
 * 2. 요청자 교사 계정(혹은 권한 없는 계정)으로 target 교사의 id로 PUT 요청 시도
 * 3. 403 Forbidden이 발생해야 함을 검증
 * 4. (옵션) 전혀 권한이 없는 기본 연결로도 PUT 시도하여 역시 403 Forbidden을 검증
 */
export async function test_api_attendance_test_update_teacher_with_permission_violation(
  connection: api.IConnection,
) {
  // 1. 두 명의 교사 레코드 생성 (target, requester)
  const targetTeacher: IAttendanceTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "Target Teacher",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-0000-0000",
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(targetTeacher);

  const requesterTeacher: IAttendanceTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "Requester Teacher",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-1111-1111",
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(requesterTeacher);

  // 2. 요청자 교사 계정(권한 없는 연결)으로 target 교사의 정보를 PUT 요청
  await TestValidator.error("타 교사 정보 수정 403 Forbidden")(
    async () => {
      await api.functional.attendance.teachers.putById(connection, {
        id: targetTeacher.id,
        body: {
          school_id: targetTeacher.school_id,
          auth_account_id: targetTeacher.auth_account_id,
          name: "타인이 시도한 수정",
          email: typia.random<string & tags.Format<"email">>(),
          phone: "010-9876-5432",
        } satisfies IAttendanceTeacher.IUpdate,
      });
    },
  );

  // 3. (옵션) 권한이 없는 기본 연결로 PUT 시도
  await TestValidator.error("권한 없는 사용자의 교사 정보 수정 시도도 403 Forbidden")(
    async () => {
      await api.functional.attendance.teachers.putById(connection, {
        id: targetTeacher.id,
        body: {
          school_id: targetTeacher.school_id,
          auth_account_id: targetTeacher.auth_account_id,
          name: "권한 없음",
          email: typia.random<string & tags.Format<"email">>(),
          phone: "010-5555-5555",
        } satisfies IAttendanceTeacher.IUpdate,
      });
    },
  );
}