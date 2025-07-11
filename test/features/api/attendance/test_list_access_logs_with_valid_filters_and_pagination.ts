import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";
import type { IPageIAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAccessLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 접근 로그 페이징/필터 정상 조회 시나리오 (운영 대시보드, 시스템 감사 등)
 *
 * - teacher, student, parent, admin, classroom 등 역할/분류별 다양한 접근 로그 데이터를 사전에 생성한다
 * - 실제 생성된 로그의 FK, ip, user_agent, accessed_at, classroom_id 등 필드를 random하게 필터로 활용해 검색
 * - 단일/복합 필터, 날짜 범위, IP/userAgent 텍스트, 페이지네이션 동작 등 전방위 테스트
 * - 조건과 페이징에 맞는 결과 리스트, 전체 카운트, pagination 정보 검증
 * - 데이터 미존재 조건/범위 초과 요청시 빈 리스트 및 올바른 페이지 정보 반환도 확인
 *
 * Business Rule:
 *   - 모든 조회/리스트 응답 타입: typia.assert로 type 완전 검증
 *   - 결과 내 pagination, records, data.length, 조건에 맞는 FK 매칭 등 TestValidator로 철저 검증
 */
export async function test_api_attendance_test_list_access_logs_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. 여러 타입의 접근 로그 다수 batch 생성
  const accessLogs: IAttendanceAccessLog[] = await ArrayUtil.asyncRepeat(10)(async (index: number) => {
    const log: IAttendanceAccessLog = await api.functional.attendance.accessLogs.post(
      connection,
      {
        body: {
          teacher_id: index % 4 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
          student_id: index % 4 === 1 ? typia.random<string & tags.Format<"uuid">>() : null,
          parent_id: index % 4 === 2 ? typia.random<string & tags.Format<"uuid">>() : null,
          admin_id: index % 4 === 3 ? typia.random<string & tags.Format<"uuid">>() : null,
          classroom_id: index % 2 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
          ip_address: `192.168.0.${index}`,
          user_agent: `test-agent-${(index % 3) + 1}`,
          device_id: index % 2 === 1 ? `dev-${index}` : null,
          accessed_at:
            index < 4
              ? new Date(Date.now() - 86400 * 1000 * 2).toISOString() // 2일전
              : index < 8
              ? new Date(Date.now() - 86400 * 1000).toISOString() // 1일전
              : new Date().toISOString(), // 오늘
        } satisfies IAttendanceAccessLog.ICreate,
      },
    );
    typia.assert(log);
    return log;
  });
  // 생성 로그 집계 - 필터 조건에 직접 활용 위해 FK/기타 값 indexing
  const fkMap = {
    teacher_ids: accessLogs.filter((l) => l.teacher_id).map((l) => l.teacher_id!),
    student_ids: accessLogs.filter((l) => l.student_id).map((l) => l.student_id!),
    parent_ids: accessLogs.filter((l) => l.parent_id).map((l) => l.parent_id!),
    admin_ids: accessLogs.filter((l) => l.admin_id).map((l) => l.admin_id!),
    classroom_ids: accessLogs.filter((l) => l.classroom_id).map((l) => l.classroom_id!),
    ip_addresses: accessLogs.map((l) => l.ip_address),
    user_agents: Array.from(new Set(accessLogs.map((l) => l.user_agent))),
    accessed_at_values: accessLogs.map((l) => l.accessed_at),
  };
  // 2. 단일 필드별/복합 필드별 다양한 필터 조합 조회 테스트
  const fkFields = ["teacher_id", "student_id", "parent_id", "admin_id"] as const;
  for (const fkName of fkFields) {
    const ids = fkMap[`${fkName}s` as const] as (string & import("typia").tags.Format<"uuid">)[];
    for (const id of ids.slice(0, 1)) {
      const req: IAttendanceAccessLog.IRequest = {
        [fkName]: id,
        page: 1,
        limit: 10,
      };
      const res = await api.functional.attendance.accessLogs.patch(connection, { body: req });
      typia.assert(res);
      TestValidator.predicate(`${fkName}: 필터 FK 일치 여부`)(res.data.every((log) => (log[fkName] === id)));
      TestValidator.equals("page=1")(res.pagination.current)(1);
      TestValidator.equals("limit")(res.pagination.limit)(10);
      TestValidator.equals("data length < limit")(res.data.length <= 10)(true);
    }
  }
  // [classroom_id, ip_address, user_agent 단일 필터]
  if (fkMap.classroom_ids[0]) {
    const req: IAttendanceAccessLog.IRequest = {
      classroom_id: fkMap.classroom_ids[0],
      page: 1,
      limit: 5,
    };
    const res = await api.functional.attendance.accessLogs.patch(connection, { body: req });
    typia.assert(res);
    TestValidator.predicate(`classroom_id 필터 FK 일치 여부`)(res.data.every((log) => log.classroom_id === fkMap.classroom_ids[0]));
  }
  const ipReq: IAttendanceAccessLog.IRequest = {
    ip_address: fkMap.ip_addresses[0],
    page: 1, limit: 3,
  };
  const ipRes = await api.functional.attendance.accessLogs.patch(connection, { body: ipReq });
  typia.assert(ipRes);
  TestValidator.predicate('ip_address 필터')(ipRes.data.every((log) => log.ip_address === fkMap.ip_addresses[0]));
  const uaReq: IAttendanceAccessLog.IRequest = {
    user_agent: fkMap.user_agents[0],
    page: 1, limit: 3,
  };
  const uaRes = await api.functional.attendance.accessLogs.patch(connection, { body: uaReq });
  typia.assert(uaRes);
  TestValidator.predicate('user_agent 필터')(uaRes.data.every((log) => log.user_agent === fkMap.user_agents[0]));
  // accessed_at 기간(범위) 필터
  const minDate = fkMap.accessed_at_values.reduce((a, b) => (a < b ? a : b));
  const maxDate = fkMap.accessed_at_values.reduce((a, b) => (a > b ? a : b));
  const rangeReq: IAttendanceAccessLog.IRequest = {
    accessed_at_start: minDate,
    accessed_at_end: maxDate,
    page: 1,
    limit: 20,
  };
  const rangeRes = await api.functional.attendance.accessLogs.patch(connection, { body: rangeReq });
  typia.assert(rangeRes);
  TestValidator.predicate('accessed_at 범위 필터')(rangeRes.data.every((log) => minDate <= log.accessed_at && log.accessed_at <= maxDate));
  // 복합 필터
  const compositeReq: IAttendanceAccessLog.IRequest = {
    teacher_id: fkMap.teacher_ids[0],
    classroom_id: fkMap.classroom_ids[0],
    ip_address: fkMap.ip_addresses[0],
    page: 1, limit: 10,
  };
  const compositeRes = await api.functional.attendance.accessLogs.patch(connection, { body: compositeReq });
  typia.assert(compositeRes);
  TestValidator.predicate('복합 AND 필터')(compositeRes.data.every(
    (log) => (
      log.teacher_id === fkMap.teacher_ids[0] &&
      log.classroom_id === fkMap.classroom_ids[0] &&
      log.ip_address === fkMap.ip_addresses[0]
    )));
  // 3. 페이지네이션 경계/범위 테스트 (1페이지, 마지막, 초과 페이지)
  const allReq: IAttendanceAccessLog.IRequest = { page: 1, limit: 4 };
  const allRes = await api.functional.attendance.accessLogs.patch(connection, { body: allReq });
  typia.assert(allRes);
  TestValidator.equals('1페이지 current')(allRes.pagination.current)(1);
  TestValidator.equals('limit')(allRes.pagination.limit)(4);
  TestValidator.equals('records = 전체 accessLogs 개수')(allRes.pagination.records)(accessLogs.length);
  TestValidator.equals('pages = 올림')(allRes.pagination.pages)(Math.ceil(accessLogs.length / 4));
  // 마지막 페이지 요청
  const lastPage = allRes.pagination.pages;
  const lastReq: IAttendanceAccessLog.IRequest = { page: lastPage, limit: 4 };
  const lastRes = await api.functional.attendance.accessLogs.patch(connection, { body: lastReq });
  typia.assert(lastRes);
  TestValidator.equals('마지막 페이지 current')(lastRes.pagination.current)(lastPage);
  TestValidator.predicate('last page length <= limit')(lastRes.data.length <= 4);
  // 범위를 벗어난 페이지(존재하지 않는 page) 요청 → 빈 리스트
  const overReq: IAttendanceAccessLog.IRequest = { page: lastPage + 1, limit: 4 };
  const overRes = await api.functional.attendance.accessLogs.patch(connection, { body: overReq });
  typia.assert(overRes);
  TestValidator.equals('초과 페이지 current')(overRes.pagination.current)(lastPage + 1);
  TestValidator.equals('초과 페이지 data []')(overRes.data.length)(0);
  // 4. 완전 미존재 조건(랜덤 uuid) - 빈 리스트 + 정상 pagination
  const unknownReq: IAttendanceAccessLog.IRequest = {
    teacher_id: typia.random<string & tags.Format<'uuid'>>(),
    parent_id: typia.random<string & tags.Format<'uuid'>>(),
    page: 1,
    limit: 5,
  };
  const unknownRes = await api.functional.attendance.accessLogs.patch(connection, { body: unknownReq });
  typia.assert(unknownRes);
  TestValidator.equals('unknown teacher_id/parent_id - 빈 data')(unknownRes.data.length)(0);
  TestValidator.equals('unknown teacher_id/parent_id 페이징 current')(unknownRes.pagination.current)(1);
  TestValidator.equals('unknown teacher_id/parent_id 페이징 records')(unknownRes.pagination.records)(0);
  TestValidator.equals('unknown teacher_id/parent_id 페이징 pages')(unknownRes.pagination.pages)(0);
}