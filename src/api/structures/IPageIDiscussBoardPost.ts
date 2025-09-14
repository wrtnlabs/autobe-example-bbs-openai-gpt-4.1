import { IPage } from "./IPage";
import { IDiscussBoardPost } from "./IDiscussBoardPost";

export namespace IPageIDiscussBoardPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardPost.ISummary[];
  };
}
