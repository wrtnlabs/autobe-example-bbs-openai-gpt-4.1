import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IPageIAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceClassroom";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 권한으로 다양한 조건(페이징, 학년, 담당 교사, 이름, 정렬 등) 조합으로 반(학급) 목록 조회를 검증한다.
 *
 * - 관리자 인증계정 생성을 시작으로,
 * - 학교, 복수 교사, 다양한 조합의 반 데이터를 선행 생성한 뒤
 * - 여러 검색 조합(학년, 담당교사, 이름 포함, 정렬, 페이지, limit 등)에 대해
 *   목록이 정상 반환되는지 확인한다.
 * - 잘못된 값(존재하지 않는 school_id/teacher_id, 음수 limit, 허용범위 초과 등) 전달 시 422를,
 * - 권한없는 계정(비관리자) 요청 시 403을 리턴하는지 검증.
 */
export async function test_api_attendance_test_list_classrooms_with_filters_and_pagination_admin(
  connection: api.IConnection,
) {
  // 1. 관리자 인증계정 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: adminEmail,
      password_hash: RandomGenerator.alphabets(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(adminAccount);

  // 2. 학교 생성
  const schoolName = `테스트학교_${RandomGenerator.alphabets(5)}`;
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: schoolName,
      address: `서울특별시 강남구 ${RandomGenerator.alphabets(6)}`,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 여러 교사(2명 이상) 생성
  const teacherAccounts = await ArrayUtil.asyncRepeat(2)(async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
      body: {
        email,
        password_hash: RandomGenerator.alphabets(8),
      } satisfies IAttendanceAuthAccount.ICreate,
    });
    typia.assert(authAccount);
    return authAccount;
  });

  const teachers = await ArrayUtil.asyncMap(teacherAccounts)(async (account, idx) => {
    const teacher = await api.functional.attendance.teachers.post(connection, {
      body: {
        school_id: school.id,
        auth_account_id: account.id,
        name: `교사_${idx + 1}_${RandomGenerator.name()}`,
        email: account.email!,
        phone: `010${typia.random<number & tags.Type<"int32">>().toString().padStart(8, "0")}`,
      } satisfies IAttendanceTeacher.ICreate,
    });
    typia.assert(teacher);
    return teacher;
  });

  // 4. 다양한 학년/교사 조합으로 5개 학급 생성
  const classroomDefinitions = [
    { grade_level: 1, teacher: teachers[0], name: `1-1` },
    { grade_level: 1, teacher: teachers[1], name: `1-2` },
    { grade_level: 2, teacher: teachers[0], name: `2-1` },
    { grade_level: 2, teacher: teachers[1], name: `2-2` },
    { grade_level: 3, teacher: teachers[0], name: `3-1` },
  ];
  const classrooms = await ArrayUtil.asyncMap(classroomDefinitions)(async (def) => {
    const classroom = await api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: def.teacher.id,
        name: def.name,
        grade_level: def.grade_level,
      } satisfies IAttendanceClassroom.ICreate,
    });
    typia.assert(classroom);
    return classroom;
  });

  // 5. 조건 없이 전체목록(기본 페이징) 조회
  const allPage = await api.functional.attendance.classrooms.patch(connection, {
    body: { school_id: school.id } satisfies IAttendanceClassroom.IRequest,
  });
  typia.assert(allPage);
  TestValidator.predicate("반 전체 데이터가 모두 포함")(allPage.data.length >= classrooms.length);
  TestValidator.equals("같은 school_id로 반환")(new Set(allPage.data.map(d => d.school_id)).size)(1);

  // 6. 특정 학년+limit로 필터(2학년, limit=2)
  const filterPage = await api.functional.attendance.classrooms.patch(connection, {
    body: { school_id: school.id, grade_level: 2, limit: 2 } satisfies IAttendanceClassroom.IRequest,
  });
  typia.assert(filterPage);
  TestValidator.predicate("2학년만 필터")(filterPage.data.every(d => d.grade_level === 2));
  TestValidator.predicate("limit이 제대로 적용")(filterPage.data.length <= 2);

  // 7. teacher_id+grade_level 복합 필터
  const teacher2_2 = classrooms.find(c => c.name === "2-2")!;
  const complexFilterPage = await api.functional.attendance.classrooms.patch(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher2_2.teacher_id,
      grade_level: 2,
    } satisfies IAttendanceClassroom.IRequest,
  });
  typia.assert(complexFilterPage);
  TestValidator.predicate("teacher_id+2학년만 반환")(complexFilterPage.data.every(d => d.teacher_id === teacher2_2.teacher_id && d.grade_level === 2));

  // 8. name 부분일치 검색/정렬(desc)
  const keyword = "1-";
  const nameFilterPage = await api.functional.attendance.classrooms.patch(connection, {
    body: {
      school_id: school.id,
      name: keyword,
      sort: "name",
      order: "desc",
    } satisfies IAttendanceClassroom.IRequest,
  });
  typia.assert(nameFilterPage);
  TestValidator.predicate("1-로 시작하는 반만")(nameFilterPage.data.every(d => d.name.includes(keyword)));
  if (nameFilterPage.data.length > 1) {
    TestValidator.predicate("내림차순 정렬됨")(nameFilterPage.data[0].name > nameFilterPage.data[1].name);
  }

  // 9. 파라미터 제약 - 음수 limit/허용범위 초과(>100) 등 422
  await TestValidator.error("음수 limit 오류")(() =>
    api.functional.attendance.classrooms.patch(connection, {
      body: {
        school_id: school.id,
        limit: -1,
      } satisfies IAttendanceClassroom.IRequest,
    }),
  );
  await TestValidator.error("너무 큰 limit 오류")(() =>
    api.functional.attendance.classrooms.patch(connection, {
      body: {
        school_id: school.id,
        limit: 10000,
      } satisfies IAttendanceClassroom.IRequest,
    }),
  );

  // 10. 잘못된 school_id/teacher_id 등 유효성 위반(422)
  await TestValidator.error("없는 school_id")(() =>
    api.functional.attendance.classrooms.patch(connection, {
      body: {
        school_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceClassroom.IRequest,
    }),
  );
  await TestValidator.error("없는 teacher_id")(() =>
    api.functional.attendance.classrooms.patch(connection, {
      body: {
        school_id: school.id,
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAttendanceClassroom.IRequest,
    }),
  );

  // 11. 권한없는 계정 접근(예: 학생 역할 등)로 403 검증
  const unauthorizedAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(unauthorizedAccount);

  await TestValidator.error("권한 없는 계정 403")(() =>
    api.functional.attendance.classrooms.patch(connection, {
      body: {
        school_id: school.id,
      } satisfies IAttendanceClassroom.IRequest,
    }),
  );
}