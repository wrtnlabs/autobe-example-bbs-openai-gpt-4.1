import { IPage } from "./IPage";
import { IUser } from "./IUser";

export namespace IPageIUser {
  /**
   * Paginated user summary list container.
   *
   * Standardized IPage<T> wrapper for user listings, as per business
   * requirements.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Paginated list of user summaries matching request filters. */
    data: IUser.ISummary[];
  };
}
