import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkspaceInvitations1794000004000 implements MigrationInterface {
  name = 'WorkspaceInvitations1794000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace_invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "email" varchar(320) NOT NULL,
        "role" varchar(16) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "invited_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        CONSTRAINT "uq_workspace_invitations_token" UNIQUE ("token_hash"),
        CONSTRAINT "uq_workspace_invitations_workspace_email" UNIQUE ("workspace_id", "email"),
        CONSTRAINT "ck_workspace_invitations_role"
          CHECK ("role" IN ('owner', 'manager', 'member'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_workspace_invitations_workspace" ON "workspace_invitations" ("workspace_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workspace_invitations_email" ON "workspace_invitations" ("email") WHERE "deleted_at" IS NULL`,
    );

    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      await queryRunner.query(`
        ALTER TABLE "workspace_invitations"
        ADD CONSTRAINT "fk_workspace_invitations_${column}"
        FOREIGN KEY ("${column}") REFERENCES "users" ("id") ON DELETE SET NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workspace_invitations"`);
  }
}
