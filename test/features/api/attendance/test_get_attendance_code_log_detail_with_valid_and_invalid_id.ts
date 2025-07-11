import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IAttendanceAttendanceCodeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCodeLog";

/**
 * 출석 코드 이벤트 로그 상세 조회 API의 정상 및 예외 상황(존재X, 권한X)을 검증합니다.
 *
 * 이 테스트는 대시보드/감사 화면 등에서 사용되는 단일 출석 코드 이벤트 로그(PK 기반) 상세 조회 엔드포인트의
 * 정상조회 및 주요 예외분기를 함께 검증합니다.
 *
 * [테스트 목적 및 비즈니스 컨텍스트]
 * - 실제 등록된 로그 id로 상세조회시 모든 필드가 정확하게 반환됨을 확인합니다.
 * - 존재하지 않는(또는 삭제된) id 조회시 404 에러가 발생하는지 확인합니다.
 * - 권한 없는 사용자의 접근(403) 테스트는 현재 권한 인증 분리 기능 미구현으로 스킵(향후 개선시 보완)
 *
 * [테스트 프로세스]
 * 1. 출석코드를 신규로 생성하여 code_id를 준비합니다.
 * 2. 위 code_id 기반으로 로그를 생성, 로그 id를 확보합니다.
 * 3. 1,2 단계 데이터를 이용하여 정상 PK 조회 및 필드값 일치(정합성) 검증을 합니다.
 * 4. 미존재(랜덤 uuid) id 조회시 404 NotFound 에러 발생 여부를 검증합니다.
 * 5. 권한 없는 접근(403) 시나리오는 별도 인증/권한 기능 미구현으로 테스트 스킵합니다.
 */
export async function test_api_attendance_test_get_attendance_code_log_detail_with_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. 출석코드 신규 생성 (code_id 확보)
  const codeInput: IAttendanceAttendanceCode.ICreate = {
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    teacher_id: typia.random<string & tags.Format<"uuid">>(),
    code_value: RandomGenerator.alphaNumeric(6),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60*60*1000).toISOString(),
    is_active: true,
  };
  const code = await api.functional.attendance.attendanceCodes.post(connection, { body: codeInput });
  typia.assert(code);

  // 2. 출석 코드 이벤트 로그 생성 (id 확보)
  const eventInput: IAttendanceAttendanceCodeLog.ICreate = {
    code_id: code.id,
    event_type: "issued",
    event_time: new Date().toISOString(),
    actor_id: code.teacher_id,
    actor_type: "teacher",
    details: "출석코드 발급"
  };
  const createdLog = await api.functional.attendance.attendanceCodeLogs.post(connection, { body: eventInput });
  typia.assert(createdLog);

  // 3. 정상 케이스: 생성 로그 id로 상세조회하여 각 필드값 정확성 & 정합성 검증
  const fetchedLog = await api.functional.attendance.attendanceCodeLogs.getById(connection, { id: createdLog.id });
  typia.assert(fetchedLog);
  TestValidator.equals("코드 ID 일치")(fetchedLog.code_id)(eventInput.code_id);
  TestValidator.equals("이벤트 타입 일치")(fetchedLog.event_type)(eventInput.event_type);
  TestValidator.equals("행위자 유저 ID")(fetchedLog.actor_id)(eventInput.actor_id);
  TestValidator.equals("행위자 타입")(fetchedLog.actor_type)(eventInput.actor_type);
  TestValidator.equals("세부 설명")(fetchedLog.details)(eventInput.details);

  // 4. 예외(404): 존재하지 않는 id 조회 시도 → 404 에러 발생 검증
  await TestValidator.error("존재하지 않는 출석 코드 로그 id 상세조회시 404")(async () => {
    await api.functional.attendance.attendanceCodeLogs.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. 권한(403)은 인증/권한 기능 미지원으로 테스트 스킵 (향후 기능 추가시 보완)
}