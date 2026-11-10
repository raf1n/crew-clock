import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectsTasks1794000001000 implements MigrationInterface {
  name = 'ProjectsTasks1794000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "description" text,
        "created_by_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_projects_id_workspace" UNIQUE ("id", "workspace_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_projects_workspace_id" ON "projects" ("workspace_id") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'todo',
        "assignee_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "created_by_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "ck_tasks_status" CHECK ("status" IN ('todo', 'in_progress', 'done')),
        CONSTRAINT "fk_tasks_project_workspace" FOREIGN KEY ("project_id", "workspace_id")
          REFERENCES "projects" ("id", "workspace_id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_tasks_workspace_id" ON "tasks" ("workspace_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_project_id" ON "tasks" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee_id" ON "tasks" ("assignee_id") WHERE "deleted_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
