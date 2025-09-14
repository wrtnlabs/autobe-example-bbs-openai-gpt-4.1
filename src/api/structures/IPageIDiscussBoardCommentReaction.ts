import { IPage } from "./IPage";
import { IDiscussBoardCommentReaction } from "./IDiscussBoardCommentReaction";

export namespace IPageIDiscussBoardCommentReaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardCommentReaction.ISummary[];
  };
}
