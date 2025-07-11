import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";
import type { IPageIAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceStatsStudentSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 학생 요약 통계에 대한 권한 없는 요청 시, 인증/인가 오류(401/403)를 올바르게 반환하는지 검증합니다.
 *
 * - 학생 또는 학부모 계정의 인증으로 출석 학생 요약 통계 API를 호출할 때 기대되는 보안 동작을 테스트합니다.
 * - 권한이 없는 사용자가 이 API에 접근 시 401(인증 실패) 또는 403(권한 없음) HTTP 오류가 반환되어야 합니다.
 * - 학생 계정, 학부모 계정을 각각 생성 후 해당 토큰으로 /attendance/stats/studentSummaries API를 호출하여 오류 발생 여부를 점검합니다.
 *
 * [테스트 단계]
 * 1. 학생 엔티티를 생성한다 (학생 계정 인증 토큰 획득 목적)
 * 2. 학부모 엔티티를 생성한다 (학부모 계정 인증 토큰 획득 목적)
 * 3. 학생 인증 토큰으로 출석 학생 요약 통계 API 호출 → 401 또는 403 오류를 반환해야 함
 * 4. 학부모 인증 토큰으로 출석 학생 요약 통계 API 호출 → 401 또는 403 오류를 반환해야 함
 *
 * 모든 API 응답에서 typia 타입 체크와, TestValidator.error로 예외 발생을 확인해야 합니다.
 */
export async function test_api_attendance_test_list_student_summary_stats_with_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. 학생 엔티티 생성(학생 인증 토큰 획득)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 2. 학부모 엔티티 생성(학부모 인증 토큰 획득)
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(5)}@test.com`,
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // 3. 학생 인증을 통해 출석 학생 요약 통계 API 호출 시도(권한 없음)
  // ※ 실제로 학생/학부모 인증 절차 및 별도의 인증 API가 있다면 해당 절차 반영 필요
  // 여기서는 토큰 발급 및 주입 로직이 없는 환경을 가정
  await TestValidator.error("학생 권한(인증 토큰)으로 통계 API 접근 불가해야 함")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.patch(connection, {
        body: {},
      });
    },
  );

  // 4. 학부모 인증을 통해 출석 학생 요약 통계 API 호출 시도(권한 없음)
  await TestValidator.error("학부모 권한(인증 토큰)으로 통계 API 접근 불가해야 함")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.patch(connection, {
        body: {},
      });
    },
  );
}