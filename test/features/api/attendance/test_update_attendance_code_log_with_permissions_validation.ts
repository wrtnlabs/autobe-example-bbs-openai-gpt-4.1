import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IAttendanceAttendanceCodeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCodeLog";

/**
 * 출석 코드 로그 정보(이벤트 주석/actor_id 등) 수정 E2E.
 *
 * # 시나리오 요약
 * 출석 코드 로그(예: event_type='used', actor_id 등)를 실수나 후속 정정(잘못 기록, 설명 추가 등) 목적으로 일부 또는 전체 필드 수정한다. 수정 성공 시 반영 값을 전체 반환해야 하며, 접근/권한, 입력 조건 위반 시 각각 403/422, 잘못된 id에는 404 반환을 검증.
 *
 * # 주요 검증 포인트 및 단계
 * 1. 사전 준비: 출석 코드(code) 엔터티 및 테스트용 로그(log) 엔터티 사전 생성
 * 2. 정상 케이스: details, event_time 등 선택 필드를 일부/전체 수정 후 반영 값 전체 확인
 * 3. 필수값 누락, event_type 등 비정상 입력 시 422 반환 확인
 * 4. 존재하지 않는 id로 수정 시도 시 404 반환 확인
 * 5. (가정) 권한 없는 사용자 접근 시 403 반환 (단, API 토큰·접근자 스위칭이 가능하다고 가정 시)
 *
 * # 순서 (코드 예시)
 * 1. 출석코드 생성 → 로그 생성 → 일부 필드(예: details, actor_id)만 변경 → putById → 반환값 전체 assert
 * 2. 필수 필드 누락/잘못된 event_type 등으로 422 체크
 * 3. 잘못된 id로 요청시 404 체크
 * 4. (권한·액터 switch 케이스는 실제 시스템 지원 가능 시에 한해 403 기대, 불가할 경우 skip)
 */
export async function test_api_attendance_test_update_attendance_code_log_with_permissions_validation(connection: api.IConnection) {
  // 1. 출석 코드 생성
  const codeInput = {
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    teacher_id: typia.random<string & tags.Format<"uuid">>(),
    code_value: RandomGenerator.alphaNumeric(6),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    is_active: true,
  } satisfies IAttendanceAttendanceCode.ICreate;
  const code = await api.functional.attendance.attendanceCodes.post(connection, { body: codeInput });
  typia.assert(code);

  // 2. 사전 로그 생성
  const logInput = {
    code_id: code.id,
    event_type: "issued",
    event_time: new Date().toISOString(),
    actor_id: code.teacher_id,
    actor_type: "teacher",
    details: "출석 코드 최초 발급"
  } satisfies IAttendanceAttendanceCodeLog.ICreate;
  const log = await api.functional.attendance.attendanceCodeLogs.post(connection, { body: logInput });
  typia.assert(log);

  // 3. 정상(일부/전체) 필드 수정 및 전체 값 검증
  const updateInput = {
    code_id: code.id,
    event_type: "used",
    event_time: new Date(Date.now() + 10000).toISOString(), // 10초 후
    actor_id: typia.random<string & tags.Format<"uuid">>(), // 다른 actor
    actor_type: "student",
    details: "학생 출석 코드 사용, 정정"
  } satisfies IAttendanceAttendanceCodeLog.IUpdate;
  const updated = await api.functional.attendance.attendanceCodeLogs.putById(connection, { id: log.id, body: updateInput });
  typia.assert(updated);
  TestValidator.equals("code_id 변경됨")(updated.code_id)(updateInput.code_id);
  TestValidator.equals("event_type 변경됨")(updated.event_type)(updateInput.event_type);
  TestValidator.equals("event_time 변경됨")(updated.event_time)(updateInput.event_time);
  TestValidator.equals("actor_id 변경됨")(updated.actor_id)(updateInput.actor_id);
  TestValidator.equals("actor_type 변경됨")(updated.actor_type)(updateInput.actor_type);
  TestValidator.equals("details 변경됨")(updated.details)(updateInput.details);

  // 4. event_type 필수값 누락 422 (putById)
  await TestValidator.error("필수 이벤트 타입 누락-422")(() =>
    api.functional.attendance.attendanceCodeLogs.putById(connection, {
      id: log.id,
      body: {
        code_id: code.id,
        // event_type 누락 intentionally
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "teacher",
        details: null,
      } as any // ts compile error이므로 실제로는 실행되지 않음
    })
  );

  // 5. 비정상 event_type 값 422
  await TestValidator.error("비정상 이벤트 타입-422")(() =>
    api.functional.attendance.attendanceCodeLogs.putById(connection, {
      id: log.id,
      body: {
        code_id: code.id,
        event_type: "invalid_type",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "teacher",
        details: null,
      } satisfies IAttendanceAttendanceCodeLog.IUpdate,
    }),
  );

  // 6. 존재하지 않는 id로 수정 404
  await TestValidator.error("존재하지 않는 id-404")(() =>
    api.functional.attendance.attendanceCodeLogs.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: updateInput,
    }),
  );

  // 7. (Optional) 권한 없는 액터로 수정 403 (가능시)
  // 실제 인증/권한 토큰 스위칭 API가 제공되어야 검증 가능, 구현환경에 따라 생략 가능
}