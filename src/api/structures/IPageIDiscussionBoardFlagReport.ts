import { IPage } from "./IPage";
import { IDiscussionBoardFlagReport } from "./IDiscussionBoardFlagReport";

export namespace IPageIDiscussionBoardFlagReport {
  /**
   * Paginated response schema for flag report summaries in
   * moderation/administrative review views.
   */
  export type ISummary = {
    /**
     * Pagination info for the paginated response. Includes current page,
     * page size, record count, and total pages.
     */
    pagination: IPage.IPagination;

    /**
     * Summaries of flag reports matching the search/filter criteria for the
     * current page.
     */
    data: IDiscussionBoardFlagReport.ISummary[];
  };
}
