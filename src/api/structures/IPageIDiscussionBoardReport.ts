import { IPage } from "./IPage";
import { IDiscussionBoardReport } from "./IDiscussionBoardReport";

export namespace IPageIDiscussionBoardReport {
  /**
   * Paginated result for search/listing of discussion board content reports.
   * Used in moderation and admin review tools. Includes page info and an
   * array of report summaries.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: IDiscussionBoardReport.ISummary[];
  };
}
