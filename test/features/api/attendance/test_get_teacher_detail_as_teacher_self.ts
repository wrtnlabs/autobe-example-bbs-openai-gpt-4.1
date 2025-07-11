import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";

/**
 * 교사가 자신의 상세 정보를 조회하는 시나리오와, 타 교사 정보 접근 거부 케이스 검증.
 *
 * 1. 관리자 권한 connection에서 선행 API를 통해 교사 A(본인), 교사 B(타인) 두 명의 교사 레코드 생성
 * 2. 교사 A 계정으로 로그인한 context라고 가정하여 getById API 호출(id=A)
 *    - 정상적으로 자신의 정보를 받아온다 (모든 주요 필드 비교)
 * 3. 동일 connection에서 getById API 호출(id=B)
 *    - 403 Forbidden이어야 한다 (권한 거부만 확인, 구체 에러 메시지 미검증)
 *
 * 외부 인증/조직 context 준비 없이 핵심 API 권한 및 상세 정보 flow만을 검증함.
 */
export async function test_api_attendance_test_get_teacher_detail_as_teacher_self(
  connection: api.IConnection,
) {
  // 1. 교사 A (본인) 생성
  const teacherA = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacherA);

  // 2. 교사 B (타인) 생성
  const teacherB = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacherB);

  // 3. 교사 A(본인)가 자신의 id로 상세 정보 조회
  const myDetail = await api.functional.attendance.teachers.getById(connection, { id: teacherA.id });
  typia.assert(myDetail);
  TestValidator.equals("교사A PK 일치")(myDetail.id)(teacherA.id);
  TestValidator.equals("이름 일치")(myDetail.name)(teacherA.name);
  TestValidator.equals("이메일 일치")(myDetail.email)(teacherA.email);
  TestValidator.equals("school_id 일치")(myDetail.school_id)(teacherA.school_id);
  TestValidator.equals("auth_account_id 일치")(myDetail.auth_account_id)(teacherA.auth_account_id);
  TestValidator.equals("전화번호 일치")(myDetail.phone)(teacherA.phone);

  // 4. 타 교사 id 조회 시 권한 거부(403)
  await TestValidator.error("타 교사 상세 정보 접근 금지")(
    async () => {
      await api.functional.attendance.teachers.getById(connection, { id: teacherB.id });
    },
  );
}