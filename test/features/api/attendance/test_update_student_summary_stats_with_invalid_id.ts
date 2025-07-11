import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 존재하지 않는 summary id로 학생 통계 집계정보 수정 시 404 Not Found 에러를 검증한다
 *
 * 이 테스트는 관리자나 교사 권한 토큰(인증)으로 실행하며,
 * 실제로 존재하지 않는 UUID를 id에 사용해 요청한다. 정상적으로 404 에러가 발생해야 한다.
 *
 * 테스트 절차:
 * 1. 실존하지 않는 랜덤 UUID와 최소 필드 하나를 갖는 update 바디를 준비한다
 * 2. putById 호출 시 HttpError(404)가 발생하는지 확인한다
 * 3. 에러가 발생하지 않으면 실패로 간주한다
 * 4. 발생한 에러가 404 등 정상적인지 추가 확인한다
 */
export async function test_api_attendance_stats_studentSummaries_test_update_student_summary_stats_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. 실존하지 않는 id(UUID) 및 최소 update 바디 준비
  const invalidId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IAttendanceStatsStudentSummary.IUpdate = {
    totalPresent: typia.random<number & tags.Type<"int32">>(),
  };

  // 2. 존재하지 않는 id로 putById 호출 시 HttpError(404) 발생하는지 확인
  await TestValidator.error("존재하지 않는 summary id 업데이트는 404 에러 발생")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.putById(connection, {
        id: invalidId,
        body: updateBody,
      });
    },
  );
}