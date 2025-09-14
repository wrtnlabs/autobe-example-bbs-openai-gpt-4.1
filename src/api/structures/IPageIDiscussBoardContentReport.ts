import { IPage } from "./IPage";
import { IDiscussBoardContentReport } from "./IDiscussBoardContentReport";

export namespace IPageIDiscussBoardContentReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussBoardContentReport.ISummary[];
  };
}
