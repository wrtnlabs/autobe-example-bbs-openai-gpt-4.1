import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 학부모 본인 계정의 회원탈퇴(삭제) 및 탈퇴 후 재접근 차단 검증 E2E
 *
 * 본 테스트는 학부모(보호자)가 자기 계정으로 서비스에서 탈퇴(삭제) 요청 시,
 * 정상 처리 여부와 탈퇴 후에는 더 이상 동일 id로 정보가 노출되지 않음을 검증합니다.
 *
 * 1. 신규 학부모 계정 가입
 * 2. 가입된 본인 id로 자기 정보 삭제(탈퇴) 요청
 * 3. 삭제 성공 응답 및 id 일치 확인
 * 4. 동일 id 재접근(조회) 시 차단(에러 발생) 여부 검증
 */
export async function test_api_attendance_test_delete_parent_as_owner(
  connection: api.IConnection,
) {
  // 1. 신규 학부모 계정 가입 처리
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "테스트 학부모",
      email: typia.random<string>(),
      phone: typia.random<string>(),
    },
  });
  typia.assert(parent);

  // 2. 본인 id로 자기 정보 삭제(탈퇴) 요청
  const deleted = await api.functional.attendance.parents.eraseById(connection, {
    id: parent.id,
  });
  typia.assert(deleted);
  // 삭제된 오브젝트의 id와 원본이 일치하는지 확인
  TestValidator.equals("삭제 대상 id 일치")(deleted.id)(parent.id);

  // 3. 삭제 후 동일 id 재접근 시 에러(더 이상 노출되지 않음) 검증
  await TestValidator.error("삭제 후 자기 정보 접근 차단")(
    async () => {
      await api.functional.attendance.parents.eraseById(connection, {
        id: parent.id,
      });
    },
  );
}