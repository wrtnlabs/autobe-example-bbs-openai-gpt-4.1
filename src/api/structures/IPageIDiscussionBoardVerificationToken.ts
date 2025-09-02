import { IPage } from "./IPage";
import { IDiscussionBoardVerificationToken } from "./IDiscussionBoardVerificationToken";

export namespace IPageIDiscussionBoardVerificationToken {
  /**
   * Paginated page of verification token summary objects for display in audit
   * or admin UI.
   */
  export type ISummary = {
    /** Pagination information (see global IPage.IPagination for structure). */
    pagination: IPage.IPagination;

    /** Summary records of verification tokens for the current page. */
    data: IDiscussionBoardVerificationToken.ISummary[];
  };
}
