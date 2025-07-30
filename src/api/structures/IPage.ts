import { tags } from "typia";

export namespace IPage {
  /**
   * Standard paging request object for all paginated API endpoints. Includes
   * optional page number ('page') and optional page size ('limit').
   * Referenced by search and list request schemas throughout the API. This
   * enables consistent pagination handling in API requests.
   */
  export type IRequest = {
    /**
     * Page number. Indicates which page of results to return. Optional;
     * when omitted, defaults to first page.
     */
    page?: number & tags.Type<"int32">;

    /**
     * Records per page. Controls how many items appear on each page.
     * Optional; when omitted, default behavior applies (e.g., 100).
     */
    limit?: number & tags.Type<"int32">;
  };

  /**
   * Page information following the IPage.IPagination interface for all paged
   * result containers.
   */
  export type IPagination = {
    /** Current page number (uint32). */
    current: number & tags.Type<"int32">;

    /** Records per page (uint32, default 100). */
    limit: number & tags.Type<"int32">;

    /** Total records in the database (uint32). */
    records: number & tags.Type<"int32">;

    /** Total pages of records (uint32, ceil(records / limit)). */
    pages: number & tags.Type<"int32">;
  };
}
