import { tags } from "typia";

export namespace IPage {
  /** 페이지네이션 메타데이터. 현재 페이지/페이지당 데이터수/전체레코드수/총페이지수 등 포함. */
  export type IPagination = {
    /** 현재 페이지 번호 (1부터 시작). */
    current: number & tags.Type<"int32">;

    /** 페이지 당 데이터 갯수(최소 1) */
    limit: number & tags.Type<"int32">;

    /** 전체 레코드 개수 */
    records: number & tags.Type<"int32">;

    /** 전체 페이지 수 (총 레코드수 / 페이지당 개수, 올림) */
    pages: number & tags.Type<"int32">;
  };
}
