import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IPageAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceStudent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 학부모 계정의 접근 통제가 적용된 학생 목록 조회(PATCH /attendance/students) 권한/필터/페이징/검색 통합 테스트
 *
 * 1. 두 명 이상의 학부모/인증 계정/자녀들을 학교, 교실 각각 다르게 생성: ParentA(학교1), ParentB(학교2)
 *   - ParentA: 자녀 S1(학교1, class1), S2(학교1, class2)
 *   - ParentB: 자녀 S3(학교2, class3), S4(학교2, class4)
 * 2. ParentA로 로그인(실제 인증 토큰 전환 없이, parent_id만 시뮬)
 * 3. 다양한 필터(parent_id, school_id, classroom_id, name, 페이징, 정렬)로 PATCH /attendance/students 요청
 * 4. 어떤 조건에서도 ParentA 자녀(S1, S2)만 반환되고, 타 학부모/타 학교 소속 학생은 절대 포함 불가
 * 5. parent_id, school_id 등 필터를 타인 값으로 조작해도 본인 자녀만 노출됨을 검증
 */
export async function test_api_attendance_test_list_students_access_control_parent_restriction(
  connection: api.IConnection,
) {
  // 1. Parent A, B용 인증계정 및 보호자 생성
  const parentA_account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    },
  });
  typia.assert(parentA_account);
  const parentB_account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    },
  });
  typia.assert(parentB_account);
  const parentA = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentA_account.id,
      name: "ParentA",
      email: parentA_account.email ?? "parentA@test.com",
      phone: "010-1234-5678",
    },
  });
  typia.assert(parentA);
  const parentB = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentB_account.id,
      name: "ParentB",
      email: parentB_account.email ?? "parentB@test.com",
      phone: "010-8765-4321",
    },
  });
  typia.assert(parentB);

  // 학교, 교실 UUID 랜덤 생성
  const schoolA_id = typia.random<string & tags.Format<"uuid">>();
  const schoolB_id = typia.random<string & tags.Format<"uuid">>();
  const classroomA1_id = typia.random<string & tags.Format<"uuid">>();
  const classroomA2_id = typia.random<string & tags.Format<"uuid">>();
  const classroomB1_id = typia.random<string & tags.Format<"uuid">>();
  const classroomB2_id = typia.random<string & tags.Format<"uuid">>();

  // ParentA 자녀 2명 S1/S2(각각 다른 반)
  const studentA1 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolA_id,
      classroom_id: classroomA1_id,
      parent_id: parentA.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학생A1",
      gender: "male",
      birthdate: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  typia.assert(studentA1);
  const studentA2 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolA_id,
      classroom_id: classroomA2_id,
      parent_id: parentA.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학생A2",
      gender: "female",
      birthdate: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  typia.assert(studentA2);

  // ParentB 자녀 2명 S3/S4(각각 다른 반, 다른 학교)
  const studentB1 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolB_id,
      classroom_id: classroomB1_id,
      parent_id: parentB.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학생B1",
      gender: "male",
      birthdate: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  typia.assert(studentB1);
  const studentB2 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolB_id,
      classroom_id: classroomB2_id,
      parent_id: parentB.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "학생B2",
      gender: "female",
      birthdate: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  typia.assert(studentB2);

  // ParentA의 자녀들(StudentA1/A2) id 셋팅
  const parentA_student_ids = [studentA1.id, studentA2.id];

  // [패턴1] parent_id 등 아무 조건 없이 전체 요청 → 본인 자녀만 반환
  {
    const res = await api.functional.attendance.students.patch(connection, {
      body: {},
    });
    typia.assert(res);
    TestValidator.predicate("parentA only - no filter")(res.data.every(x => parentA_student_ids.includes(x.id)));
  }

  // [패턴2] parent_id: parentA.id 명시 요청 (자기 필터) → 역시 본인 자녀만 반환
  {
    const res = await api.functional.attendance.students.patch(connection, {
      body: { parent_id: parentA.id },
    });
    typia.assert(res);
    TestValidator.predicate("parentA only - parent_id filter")(res.data.every(x => parentA_student_ids.includes(x.id)));
  }

  // [패턴3] 학교, 반, 이름 필터 - (school_id, classroom_id, name 조합)
  {
    const res = await api.functional.attendance.students.patch(connection, {
      body: { school_id: schoolA_id, classroom_id: classroomA1_id },
    });
    typia.assert(res);
    TestValidator.predicate("parentA only - school/classroom filter")(res.data.every(x => parentA_student_ids.includes(x.id)));
  }

  // [패턴4] 페이지네이션(limit=1) 및 정렬(sort_by, sort_direction) 필터
  {
    const res = await api.functional.attendance.students.patch(connection, {
      body: { limit: 1, sort_by: "created_at", sort_direction: "desc" },
    });
    typia.assert(res);
    TestValidator.predicate("parentA only - limit/paging")(res.data.every(x => parentA_student_ids.includes(x.id)));
  }

  // [패턴5] 타 parent_id나 타 학교/반 id, 이름(타인 자녀명) 등 조작…모두 무시되고 본인 자녀만 나올 것
  {
    const res = await api.functional.attendance.students.patch(connection, {
      body: { parent_id: parentB.id, school_id: schoolB_id, classroom_id: classroomB2_id, name: "학생B2" },
    });
    typia.assert(res);
    TestValidator.predicate("parentA only - other parent filter")(res.data.every(x => parentA_student_ids.includes(x.id)));
  }
}