import { tags } from "typia";

export namespace IPage {
  /**
   * 모든 리스트 API에 사용되는 공통 페이지 요청 구조체.
   *
   * Page(페이지 번호), limit(페이지 크기) 입력.
   *
   * 기본값은 page=1, limit=100.
   */
  export type IRequest = {
    /** 페이지 번호(1~n). */
    page?: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;

    /** 한 페이지당 최대 레코드 개수. 기본 100. */
    limit?: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "int32";
      }>;
  };

  /**
   * Pagination information object for paged list responses.
   *
   * Standardized for IPage<T> containers across all entities, provides
   * metadata for page navigation and display.
   */
  export type IPagination = {
    /**
     * Current page number of the result set.
     *
     * Default is 1, increments with deeper paging.
     */
    current: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /**
     * Number of records returned per page, settable by client or defaulted
     * by API (e.g., 100).
     *
     * Used for UI/UX to scale list responses.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /**
     * Total record count (before pagination).
     *
     * Used to calculate total pages and display record ranges in the UI.
     */
    records: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /**
     * Total number of pages available in the result set.
     *
     * Calculated from record and limit count, ceiling applied as needed.
     */
    pages: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;
  };
}
