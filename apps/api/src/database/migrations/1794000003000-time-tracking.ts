import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TimeTracking1794000003000 implements MigrationInterface {
  name = 'TimeTracking1794000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await queryRunner.query(`
      CREATE TABLE "time_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE RESTRICT,
        "task_id" uuid REFERENCES "tasks" ("id") ON DELETE RESTRICT,
        "description" text,
        "started_at" timestamptz NOT NULL,
        "ended_at" timestamptz,
        "source" varchar(16) NOT NULL DEFAULT 'manual',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        CONSTRAINT "ck_time_entries_source" CHECK ("source" IN ('manual', 'timer')),
        CONSTRAINT "ck_time_entries_ended_after_started"
          CHECK ("ended_at" IS NULL OR "ended_at" > "started_at")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_time_entries_workspace_started" ON "time_entries" ("workspace_id", "started_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_time_entries_user_started" ON "time_entries" ("user_id", "started_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_time_entries_project" ON "time_entries" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_time_entries_task" ON "time_entries" ("task_id") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "time_entries"
        ADD CONSTRAINT "ex_time_entries_no_overlap"
        EXCLUDE USING gist (
          "user_id" WITH =,
          tstzrange("started_at", COALESCE("ended_at", 'infinity'::timestamptz), '[)') WITH &&
        )
        WHERE ("deleted_at" IS NULL)
    `);

    await queryRunner.query(`
      CREATE TABLE "timesheets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'draft',
        "submitted_at" timestamptz,
        "approved_at" timestamptz,
        "approved_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        CONSTRAINT "uq_timesheets_workspace_user_period"
          UNIQUE ("workspace_id", "user_id", "period_start"),
        CONSTRAINT "ck_timesheets_status" CHECK ("status" IN ('draft', 'submitted', 'approved')),
        CONSTRAINT "ck_timesheets_period" CHECK ("period_end" > "period_start")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_timesheets_workspace_period" ON "timesheets" ("workspace_id", "period_start") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_timesheets_user" ON "timesheets" ("user_id") WHERE "deleted_at" IS NULL`,
    );

    for (const table of ['time_entries', 'timesheets']) {
      for (const column of ['created_by', 'updated_by', 'deleted_by']) {
        await queryRunner.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "fk_${table}_${column}"
          FOREIGN KEY ("${column}") REFERENCES "users" ("id") ON DELETE SET NULL
        `);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "timesheets"`);
    await queryRunner.query(`DROP TABLE "time_entries"`);
  }
}
