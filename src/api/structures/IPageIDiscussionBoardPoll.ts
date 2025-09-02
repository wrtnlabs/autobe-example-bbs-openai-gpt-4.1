import { IPage } from "./IPage";
import { IDiscussionBoardPollSummary } from "./IDiscussionBoardPollSummary";

export namespace IPageIDiscussionBoardPoll {
  /**
   * Paginated result set of poll summaries for poll listings and search
   * endpoints. Uses standard IPage structure with ISummary detail records.
   * See also: IDiscussionBoardPollSummary, IPage.IPagination.
   */
  export type ISummary = {
    /** Pagination metadata (current page, limit, total records, pages). */
    pagination: IPage.IPagination;

    /** List of poll summaries for this page. */
    data: IDiscussionBoardPollSummary[];
  };
}
