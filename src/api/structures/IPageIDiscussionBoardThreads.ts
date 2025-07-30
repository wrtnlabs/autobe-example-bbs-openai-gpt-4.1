import { IPage } from "./IPage";
import { IDiscussionBoardThreads } from "./IDiscussionBoardThreads";

export namespace IPageIDiscussionBoardThreads {
  /**
   * A page of thread summary objects, including page metadata for UI and
   * navigation.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** List of thread summaries on the page. */
    data: IDiscussionBoardThreads.ISummary[];
  };
}
