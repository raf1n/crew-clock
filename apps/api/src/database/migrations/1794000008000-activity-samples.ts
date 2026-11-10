import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivitySamples1794000008000 implements MigrationInterface {
  name = 'ActivitySamples1794000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "activity_samples" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "interval_start" timestamptz NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "device_id" uuid NOT NULL REFERENCES "devices" ("id") ON DELETE CASCADE,
        "client_sample_id" uuid NOT NULL,
        "interval_end" timestamptz NOT NULL,
        "source" varchar(16) NOT NULL,
        "active_seconds" integer NOT NULL DEFAULT 0,
        "idle_seconds" integer NOT NULL DEFAULT 0,
        "keyboard_events" integer NOT NULL DEFAULT 0,
        "mouse_events" integer NOT NULL DEFAULT 0,
        "app_name" varchar(255),
        "app_id" varchar(255),
        "window_title" varchar(512),
        "url" text,
        "page_title" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        PRIMARY KEY ("id", "interval_start"),
        CONSTRAINT "ck_activity_samples_source" CHECK ("source" IN ('desktop', 'browser')),
        CONSTRAINT "ck_activity_samples_interval" CHECK ("interval_end" > "interval_start"),
        CONSTRAINT "ck_activity_samples_seconds" CHECK (
          "active_seconds" >= 0 AND "idle_seconds" >= 0
          AND "keyboard_events" >= 0 AND "mouse_events" >= 0
        )
      ) PARTITION BY RANGE ("interval_start")
    `);

    await queryRunner.query(
      `CREATE TABLE "activity_samples_default" PARTITION OF "activity_samples" DEFAULT`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_activity_samples_client"
      ON "activity_samples" ("device_id", "client_sample_id", "interval_start")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_samples_workspace_interval"
      ON "activity_samples" ("workspace_id", "interval_start")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_samples_user_interval"
      ON "activity_samples" ("user_id", "interval_start")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_samples_device_interval"
      ON "activity_samples" ("device_id", "interval_start")
      WHERE "deleted_at" IS NULL
    `);

    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      await queryRunner.query(`
        ALTER TABLE "activity_samples"
        ADD CONSTRAINT "fk_activity_samples_${column}"
        FOREIGN KEY ("${column}") REFERENCES "users" ("id") ON DELETE SET NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_samples" CASCADE`);
  }
}
