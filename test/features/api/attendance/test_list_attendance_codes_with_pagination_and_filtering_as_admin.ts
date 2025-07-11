import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IPageAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 권한으로 출석 코드 목록을 페이징 및 다양한 필터로 성공/실패 케이스 조회하는 주요 시나리오 테스트
 *
 * - 관리자가 출석 코드의 목록을 페이징 및 다양한 필터(교사, 반, 활성/비활성, 발급/만료일 범위 등)로 조회하는 기본 성공 시나리오를 포함합니다.
 * - 목록에는 총 개수, 현재 페이지, 코드 정보 등이 포함되어야 하며, 잘못된 필터 파라미터를 사용하면 오류 응답(422 등)이 반환되는지도 검증합니다.
 * - 데이터 준비를 위해 교사, 반, 출석 코드를 사전에 생성합니다.
 *
 * [step]
 * 1. 관리자 인증 계정 생성 (권한 획득)
 * 2. 학교 데이터 생성
 * 3. 교사 계정 및 해당 학교 소속 반 생성
 * 4. 교실/교사 기준 출석코드 여러 개(활성/비활성, 기간 다르게) 생성
 * 5. 페이징/필터(teacher, classroom, is_active, issued/expires date)별 목록 조회 후 각 반환 데이터/메타 검증
 * 6. 잘못된 파라미터(uuid 오타, 음수 page 등) 호출 시 422 오류나는 실패 케이스 검증
 */
export async function test_api_attendance_test_list_attendance_codes_with_pagination_and_filtering_as_admin(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 (인증)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "testPassword!123";
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(adminAccount);

  // 2. 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트학교_${RandomGenerator.alphaNumeric(6)}`,
      address: `서울시 강남구 테헤란로 ${RandomGenerator.pick(Array.from({length: 200}, (_, i) => i+1)).toString()}`,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사 계정/반 생성
  const teacherEmail = typia.random<string & tags.Format<"email">>();
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: teacherEmail,
      password_hash: adminPassword,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAccount);

  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: "1-1반",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 출석코드 여러개 생성 (활성/비활성, 기간 다양) (min 3개)
  const now = new Date();
  const codes = [];
  for (let i = 0; i < 3; ++i) {
    const isActive = (i % 2 === 0);
    const issued_at = new Date(now.getTime() - i * 1000 * 60 * 60 * 12).toISOString();
    const expires_at = new Date(now.getTime() + (i + 1) * 1000 * 60 * 60 * 24).toISOString();
    const code = await api.functional.attendance.attendanceCodes.post(connection, {
      body: {
        classroom_id: classroom.id,
        teacher_id: teacherAccount.id,
        code_value: RandomGenerator.alphaNumeric(6),
        issued_at,
        expires_at,
        is_active: isActive,
      } satisfies IAttendanceAttendanceCode.ICreate,
    });
    typia.assert(code);
    codes.push(code);
  }

  // 5. [성공] 페이징+필터별 조합 목록 조회/검증
  // (1) 전체 목록, 기본 페이지
  const allList = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(allList);
  TestValidator.predicate("전체 코드 3개 이상 존재")(allList.data.length >= 3);
  TestValidator.equals("pagination page")(allList.pagination.current)(1);

  // (2) teacher_id 필터
  const teacherList = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      teacher_id: teacherAccount.id,
      limit: 10,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(teacherList);
  TestValidator.predicate("모든 코드 teacher id 동일")(teacherList.data.every(item => item.teacher_id === teacherAccount.id));

  // (3) classroom_id 필터
  const classList = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      classroom_id: classroom.id,
      limit: 10,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(classList);
  TestValidator.predicate("모든 코드 classroom id 동일")(classList.data.every(item => item.classroom_id === classroom.id));

  // (4) is_active true/false 둘 다 합쳐서 조회
  for (const isActive of [true, false]) {
    const activeList = await api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        is_active: isActive,
        limit: 10,
      } satisfies IAttendanceAttendanceCode.IRequest,
    });
    typia.assert(activeList);
    TestValidator.predicate(`${isActive ? '활성' : '비활성'} 코드만 존재`)(activeList.data.every(item => item.is_active === isActive));
  }

  // (5) issued_at, expires_at 조건(검색)
  const fromDate = now.toISOString();
  const toDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString();
  const dateList = await api.functional.attendance.attendanceCodes.patch(connection, {
    body: {
      issued_from: fromDate,
      expires_to: toDate,
      limit: 10,
    } satisfies IAttendanceAttendanceCode.IRequest,
  });
  typia.assert(dateList);
  TestValidator.predicate("issued_at >= from && expires_at <= to")(dateList.data.every(item => item.issued_at >= fromDate && item.expires_at <= toDate));

  // 6. [실패] 잘못된 필터/파라미터 (ex. invalid uuid, 음수 page)
  await TestValidator.error("잘못된 teacher_id uuid 시 422 에러")(
    async () => { await api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        teacher_id: "fake-uuid",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }); }
  );
  await TestValidator.error("음수 page 전달 시 422 에러")(
    async () => { await api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        page: -1 as number,
      } satisfies IAttendanceAttendanceCode.IRequest,
    }); }
  );
}