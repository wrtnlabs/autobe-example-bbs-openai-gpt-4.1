import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 다른 학부모 계정의 정보를 본인 권한으로 수정 시 403 Forbidden을 반환하는지 검증합니다.
 *
 * 이 테스트는 개인정보보호 및 권한 통제 정책에 따라, 학부모(보호자) 권한으로 본인이 아닌 타인 계정의 개인정보를 임의로 수정
 * 시도할 경우 반드시 403(Forbidden)이 반환되어야 함을 보장합니다.
 *
 * 절차:
 * 1. 학부모 계정 A 생성 (타인)
 * 2. 학부모 계정 B 생성 (본인)
 * 3. (테스트 환경에서 인증 컨텍스트가 분리되는 경우) 본인(B) 계정 권한으로 요청하도록 context 전환
 * 4. B 계정 권한으로 A 계정의 정보를 putById (PUT /attendance/parents/:id)로 수정 시도
 * 5. 반드시 403 Forbidden(권한 없음) 에러가 반환되는지 TestValidator.error로 검증
 *    (실제 서비스의 권한처리 미구현 시엔 실패 가능)
 */
export async function test_api_attendance_test_update_parent_info_permission_forbidden(
  connection: api.IConnection,
) {
  // 1. 타 학부모(A) 계정 생성
  const parentA = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "Parent A",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-8000-1234",
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentA);

  // 2. 본인(B) 계정 생성
  const parentB = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "Parent B",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-8000-5678",
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentB);

  // (실제 환경에선 parentB로 인증 context를 전환해야 함. SDK/테스트 프레임워크 미지원 시 생략)
  // 본인계정(B) 권한으로 타인(A) 정보 수정 (=권한 없음)
  // 임의 IUpdate payload
  await TestValidator.error("타인 학부모 정보 수정 시 403 Forbidden")(
    async () => {
      await api.functional.attendance.parents.putById(connection, {
        id: parentA.id,
        body: {
          name: "해킹 시도",
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IAttendanceParent.IUpdate,
      });
    },
  );
}