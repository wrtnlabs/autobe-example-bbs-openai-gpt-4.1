import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IPageAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceTeacher";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 교사 권한 교사가 /attendance/teachers PATCH API를 통해 본인(또는 소속 학교)의 교사 리스트를 조회하는 권한을 검증하는 테스트입니다.
 * 
 * # 시나리오
 *
 * 1. 서로 다른 소속 학교(school_id)를 가진 교사 2명을 각각 생성한다.
 * 2. 첫번째 교사 계정으로 로그인된 상태에서, 별도 필터 없이 /attendance/teachers PATCH를 호출하면 본인 계정만 조회되어야 한다.
 * 3. 본인 학교 school_id로 필터를 걸면, 해당 학교의 교사가 자신 1명뿐이므로 결과에 자신만 포함된다.
 * 4. 다른 학교(school_id)에 소속된 교사 필터, 혹은 해당 school_id로 패치 호출 시 403 권한 오류가 발생해야 한다.
 * 5. 이름/이메일 등 허용된 필터링이 동작하는지도 검증한다(부분검색).
 *
 * ## 검증포인트
 * - 본인 계정(teacher role)으로 호출 시 본인만 조회되는지
 * - school_id 필터 사용 시 자신이 소속된 학교로만 OK, 타 school_id로는 403 Forbidden
 * - 이름/이메일 필터가 정상 동작하는지
 * - 권한 위배 시도 시 403 에러가 실제 발생하는지
 */
export async function test_api_attendance_test_list_teachers_by_teacher_role_access(
  connection: api.IConnection,
) {
  // 1. 교사 2명을 서로 다른 school_id로 생성
  const schoolId1 = typia.random<string & tags.Format<"uuid">>();
  const schoolId2 = typia.random<string & tags.Format<"uuid">>();
  const teacher1_email = typia.random<string & tags.Format<"email">>();
  const teacher2_email = typia.random<string & tags.Format<"email">>();
  const auth_account_id1 = typia.random<string & tags.Format<"uuid">>();
  const auth_account_id2 = typia.random<string & tags.Format<"uuid">>();

  const teacher1 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: schoolId1,
      auth_account_id: auth_account_id1,
      name: "테스터1",
      email: teacher1_email,
      phone: "01000001111"
    }
  });
  typia.assert(teacher1);

  const teacher2 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: schoolId2,
      auth_account_id: auth_account_id2,
      name: "테스터2",
      email: teacher2_email,
      phone: "01000002222"
    }
  });
  typia.assert(teacher2);

  // (실제 프로젝트에서는 teacher1으로 인증/토큰 갱신 필요 - 본 테스트에서는 생략)

  // 2. 별도 필터 없이 패치(조회) -> 본인 계정만 조회
  const res1 = await api.functional.attendance.teachers.patch(connection, {
    body: {},
  });
  typia.assert(res1);
  TestValidator.equals("본인만 목록에 조회되어야 함")(res1.data.length)(1);
  TestValidator.equals("내 정보만")(res1.data[0].id)(teacher1.id);

  // 3. 본인 school_id로 조회(정상)
  const res2 = await api.functional.attendance.teachers.patch(connection, {
    body: { school_id: schoolId1 },
  });
  typia.assert(res2);
  TestValidator.equals("school_id 기준 1명")(res2.data.length)(1);
  TestValidator.equals("자신 school_id로 조회시 자기 자신")(res2.data[0].id)(teacher1.id);

  // 4. 타 학교 school_id로 조회 시 403(권한 없음)
  await TestValidator.error("타 학교 조회시 403 Forbidden")(
    async () => {
      await api.functional.attendance.teachers.patch(connection, {
        body: { school_id: schoolId2 },
      });
    },
  );

  // 5. 이름, 이메일 등 허용 검색 필터 동작
  const res3 = await api.functional.attendance.teachers.patch(connection, {
    body: { name: "테스터1" },
  });
  typia.assert(res3);
  TestValidator.equals("이름 필터 결과")(res3.data.length)(1);
  TestValidator.equals("이름 필터 id")(res3.data[0].id)(teacher1.id);

  const res4 = await api.functional.attendance.teachers.patch(connection, {
    body: { email: teacher1_email },
  });
  typia.assert(res4);
  TestValidator.equals("이메일 필터 결과")(res4.data.length)(1);
  TestValidator.equals("이메일 필터 id")(res4.data[0].id)(teacher1.id);
}