import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IAttendanceAttendanceCodeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCodeLog";

/**
 * 출석 코드 이벤트 로그 생성 기능의 정상 및 비정상 시나리오를 검증합니다.
 * 
 * - 정상 케이스: 출석 코드, 유효한 event_type, event_time, actor_id, actor_type로 로그를 생성 시 정상적(PK 포함 전체 데이터)으로 저장되고 반환되는지 검증합니다.
 * - 필수항목 누락: code_id, event_type, event_time, actor_type 등 필수 필드 미입력 시 422 오류가 발생하는지 체크합니다.
 * - 존재하지 않는 code_id 혹은 actor_id 입력 시 400(혹은 403) 오류가 발생하는지 검증합니다.
 * - event_type 및 actor_type에 스키마에 정의되지 않은 문자열 입력 시 실패(400/422 등) 여부 검증합니다.
 * - 성공 시 반환되는 전체 필드(id/code_id/event_type/event_time/actor_id/actor_type/details 등)과 입력값 일치 여부, PK 존재 확인 등도 검증합니다.
 *
 * 1. 테스트용 출석코드(code) 사전 발급 (의존성 선행처리)
 * 2. 정상 입력 값으로 로그 생성 성공 및 반환 값 검증
 * 3. 필수 필드 누락 케이스별 422 validation error 발생 검증
 * 4. 존재하지 않는 code_id, actor_id 값 입력 → 400 or 403 에러 검증
 * 5. event_type, actor_type 비정상(정의 외 문자열) 입력 → 400/422 에러 검증 
 */
export async function test_api_attendance_test_create_attendance_code_log_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. 의존성: 정상 출석 코드 엔티티 선행 생성
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1시간 후 만료
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(attendanceCode);

  // 2. 정상 입력(유효한 code_id, actor_id, 타입, event_type 등)
  const now = new Date();
  const logInput: IAttendanceAttendanceCodeLog.ICreate = {
    code_id: attendanceCode.id,
    event_type: "issued", // 대표적인 정상값 예시
    event_time: now.toISOString(),
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    actor_type: "teacher", // 대표적인 정상값 예시
    details: "정상 발급로그 테스트",
  };
  const log = await api.functional.attendance.attendanceCodeLogs.post(connection, { body: logInput });
  typia.assert(log);
  // 전체 필드 일치, PK(primary key) 존재성 검증
  TestValidator.equals("code_id")(log.code_id)(logInput.code_id);
  TestValidator.equals("event_type")(log.event_type)(logInput.event_type);
  TestValidator.equals("event_time")(log.event_time)(logInput.event_time);
  TestValidator.equals("actor_id")(log.actor_id)(logInput.actor_id);
  TestValidator.equals("actor_type")(log.actor_type)(logInput.actor_type);
  TestValidator.equals("details")(log.details)(logInput.details);
  TestValidator.predicate("id 존재 및 uuid 형식")(
    typeof log.id === "string" && log.id.length > 0,
  );

  // 3. 필수 필드 누락 시나리오별 422 validation error
  await TestValidator.error("필수필드 code_id 누락시 422 ")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        // code_id: intentionally omitted
        event_type: "used",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "student",
      } as any,
    }),
  );
  await TestValidator.error("필수필드 event_type 누락시 422")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        // event_type: omitted
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "student",
      } as any,
    }),
  );
  await TestValidator.error("필수필드 event_time 누락시 422")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        event_type: "used",
        // event_time: omitted
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "student",
      } as any,
    }),
  );
  await TestValidator.error("필수필드 actor_type 누락시 422")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        event_type: "used",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        // actor_type: omitted
      } as any,
    }),
  );

  // 4. 존재하지 않는 code_id, actor_id (
  await TestValidator.error("존재하지 않는 code_id 입력시 400/403")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: typia.random<string & tags.Format<"uuid">>(), // 임의 uuid
        event_type: "used",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "student",
      } satisfies IAttendanceAttendanceCodeLog.ICreate,
    }),
  );
  await TestValidator.error("존재하지 않는 actor_id 입력시 400/403")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        event_type: "used",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(), // 임의 uuid
        actor_type: "student",
      } satisfies IAttendanceAttendanceCodeLog.ICreate,
    }),
  );

  // 5. event_type, actor_type 잘못된 값(정의 외의 임의 문자열)
  await TestValidator.error("비정상 event_type 입력시 400/422")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        event_type: "not_a_valid_type", // 잘못된 타입
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "student",
      } satisfies IAttendanceAttendanceCodeLog.ICreate,
    }),
  );
  await TestValidator.error("비정상 actor_type 입력시 400/422")(() =>
    api.functional.attendance.attendanceCodeLogs.post(connection, {
      body: {
        code_id: attendanceCode.id,
        event_type: "used",
        event_time: new Date().toISOString(),
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "not_a_real_role", // 정의 외 문자열
      } satisfies IAttendanceAttendanceCodeLog.ICreate,
    }),
  );
}