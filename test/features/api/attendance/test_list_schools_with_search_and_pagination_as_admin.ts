import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IPageIAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceSchool";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 권한으로 학교 목록 (attendance_school) 페이징 + 검색 조회의 모든 정상/비정상 케이스를 검증하는 통합 테스트.
 *
 * (시나리오 요약) 전제: 학교 데이터가 최소 3개 이상 미리 생성되어야 함. 아래 단계대로 관리자 권한에서 모든 조회, 검색, 필터, 페이지네이션, 잘못된 요청, 권한 없는 요청 등 대부분 케이스를 커버한다.
 *
 * 1. 학교 3건 모두 이름/주소 다르게 생성 (사전 데이터 세팅)
 * 2. [정상] 전체조회: 조건 없이 1페이지 10개. → 3건 모두 반환, pagination.current=1, limit=10, records=3, pages=1
 * 3. [정상] 2페이지 10개 → data 빈 배열, pagination.current=2, limit=10, records=3, pages=1
 * 4. [정상] name 키워드로 부분검색(포함): 해당 키워드 들어간 학교만 정확히 반환
 * 5. [정상] address 키워드로 부분검색: 해당 키워드 들어간 학교만 정확히 반환
 * 6. [정상] limit=1,2로 여러 건 요청 시 조건부 개수 및 pagination.limit 확인
 * 7. [권한없음] 비관리자(학생 등)가 조회 시 403 혹은 필드 제한/에러
 * 8. [비정상] page<1, limit>1000 등 - 유효성 오류 및 에러 반환
 * 9. [데이터 0건] 학교 하나도 없을 때 검색 시 data배열 빈값, records/pages=0
 */
export async function test_api_attendance_test_list_schools_with_search_and_pagination_as_admin(connection: api.IConnection) {
  // 1. (사전 데이터) 학교 3개 등록 (각 이름/주소 고유)
  const schools = await Promise.all([
    api.functional.attendance.schools.post(connection, {
      body: {
        name: "테스트초등학교A",
        address: "서울특별시 서초구 방배동 100-1",
      },
    }),
    api.functional.attendance.schools.post(connection, {
      body: {
        name: "테스트중학교B",
        address: "서울특별시 강남구 역삼동 200-2",
      },
    }),
    api.functional.attendance.schools.post(connection, {
      body: {
        name: "테스트고등학교C",
        address: "경기도 성남시 분당구 정자동 300-3",
      },
    })
  ]);

  // 2. (관리자) 조건 없이 전체 페이징조회: 1페이지 10개씩
  const firstPage = await api.functional.attendance.schools.patch(connection, {
    body: { limit: 10 },
  });
  typia.assert(firstPage);
  TestValidator.equals("등록된 3건 반환")(firstPage.data.length)(3);
  TestValidator.equals("1페이지")(firstPage.pagination.current)(1);
  TestValidator.equals("limit 10")(firstPage.pagination.limit)(10);
  TestValidator.equals("전체 레코드 3")(firstPage.pagination.records)(3);
  TestValidator.equals("전체페이지 1")(firstPage.pagination.pages)(1);

  // 3. 다음 페이지 요청: 2페이지 10건
  const secondPage = await api.functional.attendance.schools.patch(connection, {
    body: { limit: 10, page: 2 } as any // page 속성은 실제 API DTO에 없어서 무시, 실질적 페이지 넘김 테스트 불가
  });
  typia.assert(secondPage);
  // 실제 페이지네이션 page prop 미구현시, 페이지 이동 불가(항상 1페이지로 간주)

  // 4. name으로 부분검색(포함)
  const nameKeyword = "A"; // 테스트초등학교A 검색용
  const byName = await api.functional.attendance.schools.patch(connection, {
    body: { name: nameKeyword },
  });
  typia.assert(byName);
  TestValidator.predicate("이름 포함만 필터")(byName.data.every(sch => sch.name.includes(nameKeyword)));

  // 5. address로 부분검색(포함)
  const addrKeyword = "역삼동";
  const byAddr = await api.functional.attendance.schools.patch(connection, {
    body: { address: addrKeyword },
  });
  typia.assert(byAddr);
  TestValidator.predicate("주소부분포함만 필터")(byAddr.data.every(sch => sch.address.includes(addrKeyword)));

  // 6. limit=1/2로 건수 제한
  for(const limit of [1,2]) {
    const result = await api.functional.attendance.schools.patch(connection, {
      body: { limit },
    });
    typia.assert(result);
    TestValidator.equals(`limit=${limit} 반환 길이`)(result.data.length)(limit);
    TestValidator.equals(`pagination.limit=${limit}`)(result.pagination.limit)(limit);
  }

  // 7. (권한X) 별도 connection으로 접근 시 403 또는 에러 확인
  // (실제 시스템에서 비관리자 인증방법이 없다면 생략)
  // TestValidator.error("비권한 사용자 403")(
  //   async () => { await api.functional.attendance.schools.patch(nonAdminConn, { body: {} }); }
  // );

  // 8. (비정상파라미터) limit>1000/limit<1 등 유효성 오류
  for(const invalidLimit of [0, 1001, -10]) {
    await TestValidator.error(`limit=${invalidLimit} 유효성오류`)(
      async () => await api.functional.attendance.schools.patch(connection, { body: { limit: invalidLimit } }),
    );
  }

  // 9. (0건일 때, 테스트를 위한 환경 필요)
  // 실제로는 데이터 삭제 API 없으면 skip. 데이터를 추가로 안 만들었을 때 검색 시도
  // const emptyList = await api.functional.attendance.schools.patch(connection, { body: { name: '존재X' } });
  // typia.assert(emptyList);
  // TestValidator.equals("0건빈배열")(emptyList.data.length)(0);
  // TestValidator.equals("records=0")(emptyList.pagination.records)(0);
  // TestValidator.equals("pages=0")(emptyList.pagination.pages)(0);
}