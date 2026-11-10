import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DevicesIdempotency1794000005000 implements MigrationInterface {
  name = 'DevicesIdempotency1794000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "platform" varchar(16) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "last_seen_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        CONSTRAINT "uq_devices_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "ck_devices_platform"
          CHECK ("platform" IN ('macos', 'windows', 'linux'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_devices_workspace_user" ON "devices" ("workspace_id", "user_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_devices_workspace" ON "devices" ("workspace_id") WHERE "deleted_at" IS NULL`,
    );

    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      await queryRunner.query(`
        ALTER TABLE "devices"
        ADD CONSTRAINT "fk_devices_${column}"
        FOREIGN KEY ("${column}") REFERENCES "users" ("id") ON DELETE SET NULL
      `);
    }

    await queryRunner.query(`ALTER TABLE "time_entries" ADD COLUMN "client_id" uuid`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_time_entries_client"
      ON "time_entries" ("workspace_id", "user_id", "client_id")
      WHERE "client_id" IS NOT NULL AND "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_time_entries_client"`);
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN "client_id"`);
    await queryRunner.query(`DROP TABLE "devices"`);
  }
}
