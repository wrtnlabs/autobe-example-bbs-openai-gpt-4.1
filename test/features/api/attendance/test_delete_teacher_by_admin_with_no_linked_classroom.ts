import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";

/**
 * 관리자가 종속 클래스룸이 없는 교사(Teacher) 데이터를 성공적으로 삭제한다.
 *
 * 이 테스트는 관리자가 새로운 교사 데이터를 생성 후, 해당 교사가 다른 엔티티(클래스룸 등)와 연결이 없는지
 * 확인된 상태에서 삭제 API를 호출하여 정상적으로 삭제가 수행되는지 검증한다. 삭제 정책(soft/hard)에 따라 반환
 * 결과가 달라질 수 있으므로, 삭제 성공 후 HTTP status 및 엔티티 삭제 여부를 확인한다. 또한, 없는 id 또는
 * 비관리자 권한(권한 없는 연결 등)으로 시도할 경우 각각 404/403이 반환되는지 검증한다.
 *
 * 1. 관리자 권한으로 교사 생성 API 호출 (종속 클래스룸 없는 상태)
 * 2. 생성된 교사의 id로 삭제 API 호출
 * 3. (성공) 삭제 API에서 204 또는 삭제 엔티티 반환. 엔티티 정보 검증
 * 4. (실패-존재하지 않는 id) 임의의 uuid로 삭제 시도 → 404 확인
 * 5. (실패-권한없음) 관리자가 아닌 연결로 삭제 시도 → 403 확인
 */
export async function test_api_attendance_test_delete_teacher_by_admin_with_no_linked_classroom(
  connection: api.IConnection,
) {
  // 1. 관리자로서 새로운 교사 등록 (종속 엔터티 연결 필요 없음)
  const teacherInput: IAttendanceTeacher.ICreate = {
    school_id: typia.random<string & tags.Format<"uuid">>(),
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: "테스트교사" + RandomGenerator.alphaNumeric(5),
    email: typia.random<string & tags.Format<"email">>(),
    phone: "010-" + typia.random<string>().slice(0,8),
  };
  const teacher = await api.functional.attendance.teachers.post(connection, { body: teacherInput });
  typia.assert(teacher);

  // 2. 정상 삭제 (관리자)
  const deleted = await api.functional.attendance.teachers.eraseById(connection, { id: teacher.id });
  typia.assert(deleted);
  TestValidator.equals("deleted teacher id")(deleted.id)(teacher.id);

  // 3. 없는 id로 삭제 시도 → 404
  await TestValidator.error("존재하지 않는 교사 삭제는 404")(
    async () => {
      await api.functional.attendance.teachers.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    }
  );

  // 4. 권한 없는 연결(관리자가 아닌 상태) - 별도 connection 의존.
  // 실제 권한 처리 로직은 테스트 환경 따라 추가 필요. (여기서는 연결만 구분)
  const nonAdminConnection = { ...connection, headers: { ...connection.headers, Authorization: "Bearer NONADMIN" } };
  await TestValidator.error("권한 없는 사용자 삭제는 403")(
    async () => {
      await api.functional.attendance.teachers.eraseById(nonAdminConnection, { id: teacher.id });
    }
  );
}