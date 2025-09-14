import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardForbiddenWords";
import { IPageIDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardForbiddenWords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * List/search forbidden word rules for content moderation
 * (discuss_board_forbidden_words table)
 *
 * Returns a paginated and filterable list of forbidden keyword filtering rules
 * from the discuss_board_forbidden_words table. This includes support for
 * searching by expression or description, filtering by creation date window,
 * filtering by status (active/deleted), and paginating results, for
 * administrator audit and policy management purposes. Only administrators may
 * use this endpoint.
 *
 * @param props - Object containing authentication and filter parameters
 * @param props.administrator - The authenticated administrator requesting the
 *   forbidden words list
 * @param props.body - The filter and pagination parameters (see
 *   IDiscussBoardForbiddenWords.IRequest)
 * @returns Paginated result set of forbidden keyword rules (current page,
 *   limit, total, all matching records)
 * @throws {Error} If database query or mapping fails
 */
export async function patch__discussBoard_administrator_forbiddenWords(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardForbiddenWords.IRequest;
}): Promise<IPageIDiscussBoardForbiddenWords> {
  const { body } = props;
  // Pagination config (backend default page: 1, limit: 20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build Prisma where filter for forbidden words
  const where = {
    // Full-text search (matches expression or description; contains, case-sensitive to match both sqlite/postgres)
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { expression: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
    // Created_at window filtering
    ...(body.created_after || body.created_before
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && { gte: body.created_after }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && { lte: body.created_before }),
          },
        }
      : {}),
    // Status: active = deleted_at is null; deleted = deleted_at is not null;
    ...(body.status === "deleted"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
  };

  // Query the forbidden words table for paged data/results and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_forbidden_words.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.discuss_board_forbidden_words.count({ where }),
  ]);

  const data = rows.map(
    (fw): IDiscussBoardForbiddenWords => ({
      id: fw.id,
      expression: fw.expression,
      description: fw.description ?? null,
      created_at: toISOStringSafe(fw.created_at),
      updated_at: toISOStringSafe(fw.updated_at),
      deleted_at: fw.deleted_at ? toISOStringSafe(fw.deleted_at) : null,
    }),
  );

  // Pagination structure (use Number() to ensure correct types)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
