import { IPage } from "./IPage";
import { IDiscussBoardPostTag } from "./IDiscussBoardPostTag";

export namespace IPageIDiscussBoardPostTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardPostTag.ISummary[];
  };
}
