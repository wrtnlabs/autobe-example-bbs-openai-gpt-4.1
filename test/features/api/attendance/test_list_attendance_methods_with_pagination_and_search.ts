import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";
import type { IPageAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceMethod";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 방식 조회(검색/페이징/필터) 정상 동작 시나리오 테스트
 *
 * 관리자 권한으로 여러 건의 출석 방식(CODE, QR, MANUAL 등)을 등록한 후,
 * 1. 빈 데이터 판별 (등록 전)
 * 2. 전체 리스트 불러오기(기본값)
 * 3. 키워드 검색(method_name 및 description 포함)으로 조건별 필터 확인
 * 4. 페이징 (page, limit) 조작결과 검증
 * 5. description 및 method_name 각각 컬럼별 검색 결과 검증
 *
 * 각 조건별로 반환 데이터(count, page, records, pages, data array)가 실제 데이터와 일치하는지,
 * 필터·검색이 제대로 동작하는지 검증합니다.
 * 만약 데이터가 없다면 빈 배열로 반환되는지도 체크합니다.
 */
export async function test_api_attendance_test_list_attendance_methods_with_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. 등록된 출석 방식 없는 상태에서 빈 리스트 조회 검증
  const emptyList = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: {}, // 검색조건 없음
  });
  typia.assert(emptyList);
  TestValidator.equals("빈 데이터 count=0")(emptyList.pagination.records)(0);
  TestValidator.equals("빈 데이터 data.length=0")(emptyList.data.length)(0);

  // 2. 다양한 출석 방식 데이터 등록
  const testMethods = [
    { method_name: "CODE", description: "학생 임의코드 입력" },
    { method_name: "QR", description: "QR 스캔 출석" },
    { method_name: "MANUAL", description: "관리자 직접 입력" },
    { method_name: "NFC", description: "NFC 터치 출석" },
    { method_name: "FACE", description: "얼굴 인식 출석" },
  ];
  const createdMethods = [];
  for (const input of testMethods) {
    const created = await api.functional.attendance.attendanceMethods.post(connection, {
      body: input,
    });
    typia.assert(created);
    createdMethods.push(created);
  }

  // 3. 전체 리스트 조회 및 데이터 검증
  const fullList = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: {}, // 검색조건 없이 전체 조회
  });
  typia.assert(fullList);
  TestValidator.equals("전체 등록건수 일치")(fullList.data.length)(createdMethods.length);
  TestValidator.equals("pagination.records 일치")(fullList.pagination.records)(createdMethods.length);

  // 4. method_name 키워드 검색 (예: 'CODE'만 조회되는지)
  const codeFilter = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: { method_name: "CODE" },
  });
  typia.assert(codeFilter);
  TestValidator.equals("CODE 검색 1건")(codeFilter.data.length)(1);
  TestValidator.equals("CODE method_name")(codeFilter.data[0]?.method_name)("CODE");

  // 5. description 키워드 검색 (예: 'QR' 포함 description)
  const qrDescFilter = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: { description: "QR" },
  });
  typia.assert(qrDescFilter);
  TestValidator.equals("QR 스캔 포함 description 1건")(qrDescFilter.data.length)(1);
  TestValidator.equals("QR method_name")(qrDescFilter.data[0]?.method_name)("QR");

  // 6. 페이징 테스트 (limit 2, page 2)
  const pagingTest = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: { limit: 2, page: 2 },
  });
  typia.assert(pagingTest);
  TestValidator.equals("2페이지는 2건 이하")(pagingTest.data.length <= 2)(true);
  TestValidator.equals("pagination.current")(pagingTest.pagination.current)(2);
  TestValidator.equals("pagination.limit")(pagingTest.pagination.limit)(2);

  // 7. method_name 부분검색 (예: 'C' 들어가는 케이스 여러건)
  const partialFilter = await api.functional.attendance.attendanceMethods.patch(connection, {
    body: { method_name: "C" },
  });
  typia.assert(partialFilter);
  TestValidator.predicate("'C' 포함 method_name 2건 이상")(
    partialFilter.data.filter(item => item.method_name.includes("C")).length >= 2
  );

  // 8. 데이터 전체 삭제 후 빈 리스트 응답 검증 - 삭제 API 없으므로 생략
}