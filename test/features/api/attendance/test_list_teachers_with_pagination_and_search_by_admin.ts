import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IPageAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceTeacher";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";

/**
 * 여러 학교 및 다양한 교사 데이터를 생성한 뒤,
 * 관리자 권한으로 교사 목록(search/paging/sorting) API를
 * 정상 및 비정상, 결과 없음의 주요 케이스까지 테스트한다.
 *
 * 1. 테스트용 학교 2개 및 다양한 이름, 이메일을 가진 교사 5명 생성
 *    (학교별 중복/고유, name/email 패턴 다양)
 * 2. 정상: school_id, name, email, page, limit, sort_by, sort_direction 별 조건/페이징 검색 및 결과/정렬/총합 검증
 * 3. 잘못된 요청: 없는 school_id, 잘못된 sort_by, 음수 page/limit 등 422 반환 확인
 * 4. 결과 없음: 특이 필터(name/email), school_id+email 조합 등으로 검색 결과 empty/pagination 검증
 */
export async function test_api_attendance_test_list_teachers_with_pagination_and_search_by_admin(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 2개 생성
  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "세종중학교_테스트A_" + RandomGenerator.alphaNumeric(5),
      address: "서울시 강남구_테스트A_" + RandomGenerator.alphaNumeric(8),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(schoolA);

  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "한솔고등학교_테스트B_" + RandomGenerator.alphaNumeric(5),
      address: "서울시 서초구_테스트B_" + RandomGenerator.alphaNumeric(8),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(schoolB);

  // 2. 생성 교사들(이름/이메일 패턴 차등, 소속이 schoolA/schoolB 섞임)
  const teachers: IAttendanceTeacher[] = [];
  const teacherInputs: IAttendanceTeacher.ICreate[] = [
    {
      school_id: schoolA.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "박세종",
      email: "jparkA+" + RandomGenerator.alphaNumeric(6) + "@school.com",
      phone: "010-2345-" + RandomGenerator.alphaNumeric(4),
    },
    {
      school_id: schoolA.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "김예은",
      email: "yekimA+" + RandomGenerator.alphaNumeric(6) + "@school.com",
      phone: "010-1234-" + RandomGenerator.alphaNumeric(4),
    },
    {
      school_id: schoolB.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "서다은",
      email: "dseoB+" + RandomGenerator.alphaNumeric(6) + "@school.com",
      phone: "010-5678-" + RandomGenerator.alphaNumeric(4),
    },
    {
      school_id: schoolB.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "임채민",
      email: "cmimB+" + RandomGenerator.alphaNumeric(6) + "@school.com",
      phone: "010-4444-" + RandomGenerator.alphaNumeric(4),
    },
    {
      school_id: schoolA.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: "윤은정특찾기",
      email: "findmeA+" + RandomGenerator.alphaNumeric(6) + "@school.com",
      phone: "010-7777-" + RandomGenerator.alphaNumeric(4),
    },
  ];
  for (const teacherInput of teacherInputs) {
    const teacher = await api.functional.attendance.teachers.post(connection, {
      body: teacherInput,
    });
    typia.assert(teacher);
    teachers.push(teacher);
  }

  // 3-1. school_id 기준으로 교사 검색(학교A)
  const querySchoolA = await api.functional.attendance.teachers.patch(connection, {
    body: { school_id: schoolA.id } satisfies IAttendanceTeacher.IRequest
  });
  typia.assert(querySchoolA);
  TestValidator.predicate("schoolA 교사들만 포함")(querySchoolA.data.every(t => t.school_id === schoolA.id));
  TestValidator.equals("schoolA 교사 수 일치")(querySchoolA.data.length)(teachers.filter(t => t.school_id === schoolA.id).length);

  // 3-2. 이름 부분검색(다은 포함) - B학교 소속만
  const queryName = await api.functional.attendance.teachers.patch(connection, {
    body: { name: "다은", school_id: schoolB.id } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(queryName);
  TestValidator.predicate("schoolB, 이름에 '다은' 포함")(queryName.data.every(t => t.school_id === schoolB.id && t.name.includes("다은")));
  TestValidator.equals("name 필터 결과 1명")(queryName.data.length)(1);

  // 3-3. 이메일 부분검색("cmimB" 포함)
  const queryEmail = await api.functional.attendance.teachers.patch(connection, {
    body: { email: "cmimB" } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(queryEmail);
  TestValidator.predicate("이메일에 'cmimB' 포함한 교사만")(queryEmail.data.every(t => t.email.includes("cmimB")));
  TestValidator.equals("email 필터 결과 1명")(queryEmail.data.length)(1);

  // 3-4. sort_by/방향 지정(최신 등록순)
  const descSorted = await api.functional.attendance.teachers.patch(connection, {
    body: { sort_by: "created_at", sort_direction: "desc" } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(descSorted);
  for (let i = 1; i < descSorted.data.length; ++i) {
    TestValidator.predicate("desc 정렬")(descSorted.data[i - 1].created_at >= descSorted.data[i].created_at);
  }

  // 3-5. 페이징(page, limit) -> 2개씩 2페이지 조회
  const page1 = await api.functional.attendance.teachers.patch(connection, {
    body: { page: 1, limit: 2, sort_by: "created_at" } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("페이지1 limit 2")(page1.data.length)(2);
  const page2 = await api.functional.attendance.teachers.patch(connection, {
    body: { page: 2, limit: 2, sort_by: "created_at" } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("페이지2 limit 2")(page2.data.length)(2);
  TestValidator.notEquals("페이지별 중복X")(page1.data[0].id)(page2.data[0].id);

  // 4-1. 존재하지 않는 school_id (유효한 uuid 포맷, 실제 없음)
  await TestValidator.error("없는 school_id는 422")(() =>
    api.functional.attendance.teachers.patch(connection, {
      body: { school_id: typia.random<string & tags.Format<"uuid">>() } satisfies IAttendanceTeacher.IRequest,
    }),
  );

  // 4-2. 잘못된 sort_by (enum 이외 값)
  await TestValidator.error("sort_by 허용값 아님은 422")(() =>
    api.functional.attendance.teachers.patch(connection, {
      body: { sort_by: "WRONG_FIELD" as any } as any,
    }),
  );

  // 4-3. 음수 page/limit (타입상 금지이나 실제 0/음수 요청도 422 검사)
  await TestValidator.error("음수 page는 422")(() =>
    api.functional.attendance.teachers.patch(connection, {
      body: { page: -1 } as any,
    }),
  );
  await TestValidator.error("limit 0은 422")(() =>
    api.functional.attendance.teachers.patch(connection, {
      body: { limit: 0 } as any,
    }),
  );

  // 5. 결과 없음 케이스 (매우 특이한 name)
  const emptyName = await api.functional.attendance.teachers.patch(connection, {
    body: { name: "존재하지않는테스트_" + RandomGenerator.alphaNumeric(7) } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(emptyName);
  TestValidator.equals("result empty")(emptyName.data.length)(0);
  TestValidator.equals("pagination 개수 0")(emptyName.pagination.records)(0);

  // 5-2. 실제 있는 school_id + 존재하지 않는 이메일
  const emptyCombo = await api.functional.attendance.teachers.patch(connection, {
    body: { school_id: schoolB.id, email: "notexist_" + RandomGenerator.alphaNumeric(10) + "@school.com" } satisfies IAttendanceTeacher.IRequest,
  });
  typia.assert(emptyCombo);
  TestValidator.equals("combo result empty")(emptyCombo.data.length)(0);
}