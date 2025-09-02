import { IPage } from "./IPage";
import { IDiscussionBoardVisitorISummary } from "./IDiscussionBoardVisitorISummary";

export namespace IPageIDiscussionBoardVisitor {
  /**
   * A paginated set of summary visitor records
   * (session/token/created_at/user_agent) according to search/filter options.
   * Conforms to IPage<IVisitor.ISummary> structure.
   */
  export type ISummary = {
    /** Pagination metadata: current/limit/records/pages */
    pagination: IPage.IPagination;

    /** Array of visitor summary records for pagination page. */
    data: IDiscussionBoardVisitorISummary[];
  };
}
