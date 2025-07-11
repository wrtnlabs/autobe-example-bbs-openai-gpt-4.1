import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";

/**
 * 관리자 권한에서 교사 상세조회 API의 정상 및 주요 예외동작 검증.
 *
 * 1. 신규 교사 레코드를 생성해 id 확보
 * 2. 해당 id로 상세조회(getById) 수행 – 모든 필드 존재 및 주요값 일치 확인
 * 3. 존재하지 않는 id로 조회시 404 Not Found 예외 검증
 * 4. (환경지원 시) 비관리자 권한 connection으로 403 Forbidden 예외 검증
 */
export async function test_api_attendance_test_get_teacher_detail_as_admin(
  connection: api.IConnection,
) {
  // 1. 신규 교사 레코드 생성 (POST)
  const createInput: IAttendanceTeacher.ICreate = {
    school_id: typia.random<string & tags.Format<"uuid">>(),
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const teacher: IAttendanceTeacher = await api.functional.attendance.teachers.post(connection, {
    body: createInput,
  });
  typia.assert(teacher);
  // 주요 필드 shape 및 값 일치
  TestValidator.equals("생성 id 일치")(teacher.id)(teacher.id);
  TestValidator.equals("이메일 일치")(teacher.email)(createInput.email);

  // 2. 동일 id로 상세조회 (GET)
  const detail: IAttendanceTeacher = await api.functional.attendance.teachers.getById(connection, {
    id: teacher.id,
  });
  typia.assert(detail);
  // 주요 필드존재 및 생성 데이터와 일치
  TestValidator.equals("상세조회 id 일치")(detail.id)(teacher.id);
  TestValidator.equals("상세조회 이메일 일치")(detail.email)(teacher.email);
  TestValidator.equals("상세조회 name 일치")(detail.name)(teacher.name);
  TestValidator.equals("school_id 일치")(detail.school_id)(teacher.school_id);
  TestValidator.equals("auth_account_id 일치")(detail.auth_account_id)(teacher.auth_account_id);

  // 3. 존재하지 않는 id 로 조회 (404 검증)
  await TestValidator.error("not found")(() =>
    api.functional.attendance.teachers.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 4. (옵션) 권한 없는 connection 환경 있으면 403 검증
  // 환경 미지원 시 아래 블록은 주석처리 하세요
  /*
  const unauthorizedConnection = ...; // 실제 비관리자 connection 필요
  await TestValidator.error("forbidden")(() =>
    api.functional.attendance.teachers.getById(unauthorizedConnection, {
      id: teacher.id,
    }),
  );
  */
}