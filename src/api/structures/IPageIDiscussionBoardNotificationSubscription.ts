import { IPage } from "./IPage";
import { IDiscussionBoardNotificationSubscription } from "./IDiscussionBoardNotificationSubscription";

export namespace IPageIDiscussionBoardNotificationSubscription {
  /**
   * Paginated result containing notification subscription summaries and
   * pagination metadata.
   */
  export type ISummary = {
    /** Paging metadata for the result set. */
    pagination: IPage.IPagination;

    /** List of notification subscription summary records. */
    data: IDiscussionBoardNotificationSubscription.ISummary[];
  };
}
