import { tags } from "typia";

export namespace IPage {
  /**
   * 페이지네이션 정보입니다. 현재 페이지, 해당 쿼리의 limit, 전체 레코드 수, 계산된 전체 페이지 수 등 제공합니다.
   *
   * Prisma 스키마에 의한 표준 IPage 구조를 따릅니다.
   */
  export type IPagination = {
    current: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** 페이지당 최대 레코드 수. 디폴트 100 */
    limit: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** 전체 레코드 수(조건 적용 후) */
    records: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** 전체 페이지 수. records/limit 올림 */
    pages: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;
  };

  /**
   * 페이지네이션 및 리스트 요청용 표준 타입.
   *
   * 다수 리소스의 검색, 필터, 페이지 정보 바디에 활용.
   */
  export type IRequest = {
    /** 목록 요청시 페이지 번호. 1 이상 정수. (기본값 1) */
    page?: (number & tags.Type<"int32">) | null;

    /** 페이지당 레코드 개수(최대값 제한 필요). 기본값 100. */
    limit?: (number & tags.Type<"int32">) | null;
  };
}
