import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IAttendanceAttendanceCodeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCodeLog";
import type { IPageAttendanceAttendanceCodeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceCodeLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 코드 로그 이력 검색 대시보드 다양한 조건 테스트
 *
 * - 다양한 조건(code_id, event_type, actor_type, 기간 등)으로 출석 코드 로그를 검색
 * - 조건에 맞는 리스트와 페이지네이션 정보가 정확히 반환되어야 함
 * - 필터 조합/미조합 케이스, 정렬, 페이징 block(total, page count 등) 점검
 * - 잘못된(code_id 미존재) 입력 시 0건 반환과 block의 정확성 검증
 */
export async function test_api_attendance_test_search_attendance_code_logs_with_various_filters(
  connection: api.IConnection,
) {
  // 1. 테스트용 출석코드 신규 생성
  const code = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: typia.random<string & tags.Format<"uuid">>() ,
      teacher_id: typia.random<string & tags.Format<"uuid">>() ,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2시간 후
      is_active: true,
    } satisfies IAttendanceAttendanceCode.ICreate,
  });
  typia.assert(code);

  // 2. 코드별 다양한 event_type/actor_type/시간 분포 로그 bulk 생성
  const eventTypes = ["issued", "used", "expired", "failure"];
  const actorTypes = ["teacher", "student", "system"];
  const now = new Date();
  // 12건 bulk 입력, logging index로 분기
  const logs: IAttendanceAttendanceCodeLog[] = [];
  for (let e = 0; e < eventTypes.length; ++e) {
    for (let a = 0; a < actorTypes.length; ++a) {
      const event_type = eventTypes[e];
      const actor_type = actorTypes[a];
      const event_time = new Date(now.getTime() - (1000 * 60 * 60 * (eventTypes.length * a + e))).toISOString();
      const actor_id = typia.random<string & tags.Format<"uuid">>();
      const details = ((e * actorTypes.length + a) % 2 === 0) ? `log-${e*actorTypes.length+a}-details` : null;
      const log = await api.functional.attendance.attendanceCodeLogs.post(connection, {
        body: {
          code_id: code.id,
          event_type,
          actor_type,
          event_time,
          actor_id,
          details,
        } satisfies IAttendanceAttendanceCodeLog.ICreate,
      });
      typia.assert(log);
      logs.push(log);
    }
  }

  // 3. 조건조합 검색: event_type+actor_type
  const event_type_to_find = eventTypes[1]; // "used"
  const actor_type_to_find = actorTypes[2]; // "system"
  {
    const output = await api.functional.attendance.attendanceCodeLogs.patch(connection, {
      body: {
        code_id: code.id,
        event_type: event_type_to_find,
        actor_type: actor_type_to_find,
      } satisfies IAttendanceAttendanceCodeLog.IRequest,
    });
    typia.assert(output);
    TestValidator.predicate("조건 필터=event_type+actor_type")(output.data.every(d => d.event_type === event_type_to_find && d.actor_type === actor_type_to_find));
    TestValidator.equals("필터 적용 시 record 개수")(output.pagination.records)(output.data.length);
    TestValidator.equals("block limit 기본(10)")(output.pagination.limit)(10);
  }

  // 4. 기간(event_from, event_to) + sort desc/asc 테스트 및 페이징
  const sortedLogs = [...logs].sort((a,b) => a.event_time.localeCompare(b.event_time));
  const event_from = sortedLogs[3].event_time;
  const event_to = sortedLogs[8].event_time;
  {
    // desc(최신→오래된)
    const output = await api.functional.attendance.attendanceCodeLogs.patch(connection, {
      body: {
        code_id: code.id,
        event_from,
        event_to,
        sort: "event_time desc",
      },
    });
    typia.assert(output);
    TestValidator.predicate("desc 정렬 시간역순")(output.data.every((item, idx, arr) => idx === 0 || arr[idx-1].event_time >= item.event_time));
  }
  {
    // asc(오래된→최신)
    const output = await api.functional.attendance.attendanceCodeLogs.patch(connection, {
      body: {
        code_id: code.id,
        event_from,
        event_to,
        sort: "event_time asc",
      },
    });
    typia.assert(output);
    TestValidator.predicate("asc 정렬 시간순")(output.data.every((item, idx, arr) => idx === 0 || arr[idx-1].event_time <= item.event_time));
  }
  // 페이징 테스트(limit=5)
  {
    const output = await api.functional.attendance.attendanceCodeLogs.patch(connection, {
      body: {
        code_id: code.id,
        limit: 5,
        sort: "event_time desc",
      }
    });
    typia.assert(output);
    TestValidator.equals("limit=5")(output.data.length)(5);
    TestValidator.equals("pagination limit")(output.pagination.limit)(5);
    TestValidator.equals("pagination.pages")(output.pagination.pages)(Math.ceil(logs.length / 5));
  }

  // 5. 미존재 code_id로 검색(data=[]) & block info 체크
  {
    const output = await api.functional.attendance.attendanceCodeLogs.patch(connection, {
      body: {
        code_id: typia.random<string & tags.Format<"uuid">>(), // 존재X
      },
    });
    typia.assert(output);
    TestValidator.equals("존재X code_id시, data=[]")(output.data.length)(0);
    TestValidator.equals("존재X code_id시, records=0")(output.pagination.records)(0);
  }
}