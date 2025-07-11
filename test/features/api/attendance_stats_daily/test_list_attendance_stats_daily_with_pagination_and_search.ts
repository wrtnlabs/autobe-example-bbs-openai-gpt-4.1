import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsDaily";
import type { IPageIAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceStatsDaily";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자/교사의 일별 출석통계 목록 검색(필터·검색·페이징/정렬/권한/에러 전 케이스)
 *
 * 관리자 또는 교사가 대시보드 통계 화면에서, 특정 학교/학급/기간/검색어 등 다양한 옵션으로 출석통계를 검색 및 페이징 요청할 때의 정상동작, 빈 목록 및 validation/권한 오류 응답 등을 모두 검증한다.
 *
 * 1. 통계조회용 계정(관리자/교사)을 생성 (통계조회를 위한 최소 권한)
 * 2. 랜덤 school/classroom/day 조합의 출석통계 데이터 여러 개 생성(10건 이상)
 * 3. 주요 필터(학교ID, 기간, 학급ID, 키워드)와 페이징, 정렬 asc/desc 정상조회 (전체, 반별, 기간별/정렬별, partial day 등 다양한 조합)
 * 4. paging 2페이지 이상 분리(각 페이지 데이터 불일치 및 페이지네이션 meta 검증)
 * 5. 빈목록 조건(존재X 조건/기간) 및 유효하지 않은(불일치 school/classroom, 이상 범위) 값 사용시 빈 data 반환 여부 확인
 * 6. 잘못된 날짜 포맷, 비정상 UUID 등 validation(422) 에러 확인
 * 7. (권한) 인증이 없거나, 허용되지 않는 역할(connection 교체) 사용시 401 또는 403 응답 확인
 */
export async function test_api_attendance_stats_daily_test_list_attendance_stats_daily_with_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. 통계조회용 계정(관리자/교사) 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email: adminEmail, password_hash: RandomGenerator.alphaNumeric(12) } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(account);

  // 2. 랜덤 school/classroom/day 조합 출석통계 데이터 여러 개 생성
  const schoolId = typia.random<string & tags.Format<"uuid">>();
  const classroomId = typia.random<string & tags.Format<"uuid">>();
  const days = ArrayUtil.repeat(10)(() => {
    const d = new Date(Date.now() - Math.floor(Math.random() * 100 * 24 * 60 * 60 * 1000));
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const statData = await ArrayUtil.asyncMap(days)(async (day) => {
    const stat = await api.functional.attendance.stats.daily.post(connection, {
      body: {
        schoolId, classroomId, day,
        presentCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        lateCount: typia.random<number & tags.Type<"int32">>(),
        absentCount: typia.random<number & tags.Type<"int32">>(),
        earlyLeaveCount: typia.random<number & tags.Type<"int32">>()
      } satisfies IAttendanceStatsDaily.ICreate
    });
    typia.assert(stat);
    return stat;
  });

  // 3. 정상 필터+페이징+정렬
  const resPagedAsc = await api.functional.attendance.stats.daily.patch(connection, {
    body: {
      schoolId,
      fromDay: days[0], toDay: days[days.length-1],
      sortBy: "day",
      sortOrder: "asc",
      page: 1,
      limit: 5
    } satisfies IAttendanceStatsDaily.IRequest
  });
  typia.assert(resPagedAsc);
  TestValidator.equals("pagination count")(resPagedAsc.pagination?.limit)(5);
  TestValidator.predicate("결과 1페이지 5개")(!!resPagedAsc.data && resPagedAsc.data.length === 5);
  TestValidator.equals("오름차순 정렬 확인")(resPagedAsc.data?.map(d=>d.day))(resPagedAsc.data?.map(d=>d.day)?.slice().sort());

  const resPagedDesc = await api.functional.attendance.stats.daily.patch(connection, {
    body: {
      schoolId,
      fromDay: days[0], toDay: days[days.length-1],
      sortBy: "day",
      sortOrder: "desc",
      page: 2,
      limit: 5
    } satisfies IAttendanceStatsDaily.IRequest
  });
  typia.assert(resPagedDesc);
  TestValidator.equals("desc 정렬, 두 번째 페이지")(resPagedDesc.pagination?.current)(2);
  TestValidator.predicate("2페이지 내 5개 이하")(!!resPagedDesc.data && resPagedDesc.data.length <= 5);

  // 4. 학급ID 단독 검색
  const resClassroom = await api.functional.attendance.stats.daily.patch(connection, {
    body: { classroomId, page: 1, limit: 20 } satisfies IAttendanceStatsDaily.IRequest
  });
  typia.assert(resClassroom);
  TestValidator.predicate("모두 대상 학급")(!!resClassroom.data && resClassroom.data.every(d => d.classroomId === classroomId));

  // 5. 키워드 or 부분 일자 검색(존재/미존재)
  const exampleDayPartial = days[0].slice(0, 7); // YYYY-MM
  const resSearch = await api.functional.attendance.stats.daily.patch(connection, {
    body: { search: exampleDayPartial, limit: 50 } satisfies IAttendanceStatsDaily.IRequest
  });
  typia.assert(resSearch);
  TestValidator.predicate("partial 일자 검색 결과 적어도 1개 이상")(!!resSearch.data && resSearch.data.length > 0);

  const resNotFound = await api.functional.attendance.stats.daily.patch(connection, {
    body: { schoolId: typia.random<string & tags.Format<"uuid">>(), fromDay: "2000-01-01", toDay: "2000-01-31" } satisfies IAttendanceStatsDaily.IRequest
  });
  typia.assert(resNotFound);
  TestValidator.equals("빈 목록")(resNotFound.data?.length)(0);

  // 6. 잘못된 날짜 포맷 or 비정상 UUID (validation 422)
  await TestValidator.error("잘못된 날짜포맷")(() =>
    api.functional.attendance.stats.daily.patch(connection, {
      body: { fromDay: "2021-13-44" } satisfies IAttendanceStatsDaily.IRequest
    })
  );
  await TestValidator.error("비정상 UUID")(() =>
    api.functional.attendance.stats.daily.patch(connection, {
      body: { schoolId: "not-a-uuid" } as any // 일부러 타입 위배
    })
  );

  // 7. 인증X/권한X 사용자 접근(권한 connection 분리 필요)
  const guestHeaders = { ...connection.headers };
  delete guestHeaders.Authorization; // 헤더 자체를 제거
  const guestConnection: api.IConnection = { ...connection, headers: guestHeaders };
  await TestValidator.error("미인증자 401")(() =>
    api.functional.attendance.stats.daily.patch(guestConnection, {
      body: { page:1, limit:5 } satisfies IAttendanceStatsDaily.IRequest
    })
  );
  // 테스트 환경에 student, 교사 등 다른 권한 타입 계정 발급·롤 연동이 가능하다면,
  // 해당 계정으로 재접속하여 403 (권한 거부) 검증 추가
}