import { IPage } from "./IPage";
import { IDiscussionBoardTopics } from "./IDiscussionBoardTopics";

export namespace IPageIDiscussionBoardTopics {
  /**
   * A paginated result set for browsing topic summaries. The schema aligns
   * with IPage<T> pattern and contains page metadata plus an array of summary
   * topic records.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** The array/list of topic summaries for the requested page. */
    data: IDiscussionBoardTopics.ISummary[];
  };
}
