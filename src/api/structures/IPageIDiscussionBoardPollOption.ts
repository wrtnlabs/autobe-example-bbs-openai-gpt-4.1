import { IPage } from "./IPage";
import { IDiscussionBoardPollOption } from "./IDiscussionBoardPollOption";

export namespace IPageIDiscussionBoardPollOption {
  /**
   * Paginated list of poll option summaries. This is the standard structure
   * for a paginated index or search operation response in AutoBE/OpenAPI
   * patterns.
   */
  export type ISummary = {
    /** Pagination information for option result set. */
    pagination: IPage.IPagination;

    /** Array of poll option summaries matching the query. */
    data: IDiscussionBoardPollOption.ISummary[];
  };
}
