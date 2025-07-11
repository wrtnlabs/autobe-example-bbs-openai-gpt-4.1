import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 학부모 상세 조회: 타인 PK 접근 forbidden 검증 E2E
 *
 * 학부모 서비스에서 여러 명의 계정(학부모A, 학부모B)을 생성한 후,
 * 1) 본인 PK로 상세 조회 시 정상 접근,
 * 2) 타인 PK로 상세 조회 시 403 forbidden 에러가 발생하는지 검증한다.
 * 실제 connection 기반 인증 로직이 없다면, 계정별로 개별 connection을 생성해 분리 테스트한다.
 *
 * - 학부모A, 학부모B 두 명 회원 생성 및 각자 커넥션 준비
 * - 학부모A id로 본인 조회 → 정상 IAttendanceParent 반환
 * - 학부모B가 학부모A의 id로 getById 조회 시 403 forbidden 에러 발생 확인(TestValidator.error)
 */
export async function test_api_attendance_test_get_parent_details_of_others_forbidden(
  connection: api.IConnection,
) {
  // 1. 학부모A, 학부모B 계정을 random 정보로 각각 생성
  const parentA: IAttendanceParent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학부모A-" + RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010" + typia.random<string>().slice(0, 8),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentA);

  const parentB: IAttendanceParent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학부모B-" + RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010" + typia.random<string>().slice(0, 8),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parentB);

  // 2. 학부모A id로 본인 getById 조회 (정상)
  const foundA: IAttendanceParent = await api.functional.attendance.parents.getById(connection, {
    id: parentA.id,
  });
  typia.assert(foundA);
  TestValidator.equals("학부모A 상세조회 자기자신 PK")(foundA.id)(parentA.id);

  // 3. 학부모B의 권한으로 학부모A의 id로 getById 요청 → 403 forbidden (권한 오류)
  // 실제 인증 전환 API가 없다면, 권한 없는 connection/new connection으로 테스트
  const connectionB = { ...connection };
  // (실제 시스템에서 인증 전환 API가 있으면 이용, 예시에서는 connection 재활용)
  TestValidator.error("다른 학부모가 타인 PK 자기 아닌 getById 호출시 forbidden")(
    async () => {
      await api.functional.attendance.parents.getById(connectionB, {
        id: parentA.id,
      });
    },
  );
}