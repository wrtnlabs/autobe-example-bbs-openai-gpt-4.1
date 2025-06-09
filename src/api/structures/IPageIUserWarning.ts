import { IPage } from "./IPage";
import { IUserWarning } from "./IUserWarning";

export namespace IPageIUserWarning {
  /**
   * Paginated object containing metadata and summaries of user warnings for
   * moderator/admin UI review.
   *
   * Follows Prisma schema for normalized, non-duplicated evidence records.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Array of warning summary objects for moderation dashboard listing. */
    data: IUserWarning[];
  };
}
