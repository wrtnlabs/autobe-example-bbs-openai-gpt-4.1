import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 특정 접근 로그 단건 삭제 API의 정상 동작 검증
 *
 * - 감사·보안 요구 혹은 데이터 정합성 이슈 대응 목적에서 단일 접근로그 식별자(id) 기반 삭제 요청을 검증
 * - 인증 등 전제조건 없이, 실제 접근로그 단건을 직접 생성 후 해당 ID로 삭제 수행
 * - 삭제 요청에 오류 없이 성공 처리되는지 검증
 * - 실제 삭제 여부(재조회/존재확인)는 관련 API 부재로 생략
 *
 * 1. 테스트용 접근로그 단건 생성
 * 2. 생성된 로그의 id로 삭제 API 호출
 * 3. (API 제공 시) 삭제 후 재조회/존재유무 확인 (현 사양 범위 내 생략)
 */
export async function test_api_attendance_accessLogs_test_delete_access_log_by_id_success(
  connection: api.IConnection,
) {
  // 1. 테스트용 접근로그 단건 생성
  const createdLog = await api.functional.attendance.accessLogs.post(connection, {
    body: {
      ip_address: "192.0.2.1",
      user_agent: "test-agent",
      accessed_at: new Date().toISOString(),
    } satisfies IAttendanceAccessLog.ICreate,
  });
  typia.assert(createdLog);

  // 2. 생성된 접근로그의 id로 삭제 API 호출
  await api.functional.attendance.accessLogs.eraseById(connection, { id: createdLog.id });

  // 3. (선택) 삭제 후 재조회/존재유무 검증은 조회 API 부재로 생략
}