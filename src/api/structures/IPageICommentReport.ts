import { IPage } from "./IPage";
import { ICommentReport } from "./ICommentReport";

export namespace IPageICommentReport {
  /**
   * Paginated result (summary) object for moderator/admin comment report
   * inbox.
   *
   * Contains both page meta and filtered report objects.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /**
     * Array of comment report object records (with key info for moderator
     * view).
     */
    data: ICommentReport[];
  };
}
