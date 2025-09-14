import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

export async function post__auth_administrator_refresh(props: {
  body: IDiscussBoardAdministrator.IRefresh;
}): Promise<IDiscussBoardAdministrator.IAuthorized> {
  const { refresh_token } = props.body;
  let payload: Record<string, unknown>;

  // Fix: Accept only payload as object, ensure not string/null
  const decodedJwt = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });
  if (!decodedJwt || typeof decodedJwt !== "object") {
    throw new Error("Invalid refresh token structure");
  }
  payload = decodedJwt;

  const jwtId = typeof payload.jti === "string" ? payload.jti : undefined;
  const userAccountId =
    typeof payload.sub === "string" ? payload.sub : undefined;
  if (!jwtId || !userAccountId) {
    throw new Error("Missing or malformed token jti/sub");
  }

  const session = await MyGlobal.prisma.discuss_board_jwt_sessions.findFirst({
    where: {
      jwt_id: jwtId,
      user_account_id: userAccountId,
      revoked_at: null,
      deleted_at: null,
    },
  });
  if (!session) throw new Error("Refresh session invalid, revoked, or expired");

  // Validate provided refresh token matches stored hash
  const hashOK = await MyGlobal.password.verify(
    refresh_token,
    session.refresh_token_hash,
  );
  if (!hashOK)
    throw new Error("Session hash mismatch - possibly already rotated");

  // Compare expiry using ISO string date comparison on session.expires_at
  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expires_at) <= nowISO) {
    throw new Error("Refresh token expired");
  }

  // User account lookup (must be valid and not deleted)
  const user = await MyGlobal.prisma.discuss_board_user_accounts.findFirst({
    where: { id: userAccountId, deleted_at: null },
  });
  if (!user) throw new Error("User account does not exist or is deleted");

  // Administrator record lookup (must be active, not revoked/deleted)
  const admin = await MyGlobal.prisma.discuss_board_administrators.findFirst({
    where: { member_id: user.id, deleted_at: null },
  });
  if (!admin) throw new Error("Administrator privileges not found");

  // Issue new access/refresh tokens and rotate session
  const nextJwtId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const accessExp = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExp);
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExp);

  const accessToken = jwt.sign(
    {
      sub: user.id,
      type: "administrator",
      id: admin.id,
      jti: nextJwtId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
      subject: user.id,
      jwtid: nextJwtId,
    },
  );
  const newRefreshToken = jwt.sign(
    {
      sub: user.id,
      type: "administrator",
      id: admin.id,
      jti: nextJwtId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
      subject: user.id,
      jwtid: nextJwtId,
    },
  );
  const newRefreshHash = await MyGlobal.password.hash(newRefreshToken);

  await MyGlobal.prisma.discuss_board_jwt_sessions.update({
    where: { id: session.id },
    data: {
      jwt_id: nextJwtId,
      refresh_token_hash: newRefreshHash,
      issued_at: accessExpiresIso,
      expires_at: refreshExpiresIso,
      updated_at: accessExpiresIso,
    },
  });

  const escalateAt = admin.escalated_at
    ? toISOStringSafe(admin.escalated_at)
    : toISOStringSafe(now);
  const revokeAt = admin.revoked_at
    ? toISOStringSafe(admin.revoked_at)
    : undefined;
  const createdAt = toISOStringSafe(admin.created_at);
  const updatedAt = toISOStringSafe(admin.updated_at);
  const deletedAt = admin.deleted_at
    ? toISOStringSafe(admin.deleted_at)
    : undefined;

  return {
    id: admin.id,
    member_id: admin.member_id,
    escalated_by_administrator_id: admin.escalated_by_administrator_id,
    escalated_at: escalateAt,
    revoked_at: revokeAt,
    status: admin.status,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
    administrator: {
      id: admin.id,
      member_id: admin.member_id,
      escalated_by_administrator_id: admin.escalated_by_administrator_id,
      escalated_at: escalateAt,
      revoked_at: revokeAt,
      status: admin.status,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
    },
  };
}
