export namespace IPage {
  /**
   * Paging metadata for all IPage-based paginated result types; used to
   * efficiently slice large record sets and provide UX navigation
   * information.
   */
  export type IPagination = {
    /** Current page number (starting at 1). */
    current: number;

    /** Page size: number of records per page. */
    limit: number;

    /** Total records returned in the full query. */
    records: number;

    /** Total number of pages for the complete query result. */
    pages: number;
  };
}
