import { IPage } from "./IPage";
import { IDiscussBoardPostReaction } from "./IDiscussBoardPostReaction";

export namespace IPageIDiscussBoardPostReaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardPostReaction.ISummary[];
  };
}
