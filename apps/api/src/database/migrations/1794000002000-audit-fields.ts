import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditFields1794000002000 implements MigrationInterface {
  name = 'AuditFields1794000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "updated_by" uuid,
        ADD COLUMN "deleted_by" uuid,
        ADD COLUMN "deleted_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "workspaces"
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "updated_by" uuid,
        ADD COLUMN "deleted_by" uuid,
        ADD COLUMN "deleted_at" timestamptz,
        ADD COLUMN "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "workspaces"
      SET "created_by" = "created_by_user_id", "updated_by" = "created_by_user_id"
    `);
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "created_by_user_id"`);

    await queryRunner.query(`
      ALTER TABLE "members"
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "updated_by" uuid,
        ADD COLUMN "deleted_by" uuid,
        ADD COLUMN "deleted_at" timestamptz,
        ADD COLUMN "is_active" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "updated_by" uuid,
        ADD COLUMN "deleted_by" uuid,
        ADD COLUMN "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "projects"
      SET "created_by" = "created_by_user_id", "updated_by" = "created_by_user_id"
    `);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "created_by_user_id"`);

    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN "created_by" uuid,
        ADD COLUMN "updated_by" uuid,
        ADD COLUMN "deleted_by" uuid,
        ADD COLUMN "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "tasks"
      SET "created_by" = "created_by_user_id", "updated_by" = "created_by_user_id"
    `);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "created_by_user_id"`);

    for (const table of ['users', 'workspaces', 'members', 'projects', 'tasks']) {
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
    for (const table of ['users', 'workspaces', 'members', 'projects', 'tasks']) {
      for (const column of ['created_by', 'updated_by', 'deleted_by']) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "fk_${table}_${column}"`);
      }
    }

    await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN "created_by_user_id" uuid`);
    await queryRunner.query(`UPDATE "tasks" SET "created_by_user_id" = "created_by"`);
    await queryRunner.query(`
      ALTER TABLE "tasks" ALTER COLUMN "created_by_user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD CONSTRAINT "tasks_created_by_user_id_fkey"
        FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        DROP COLUMN "created_by",
        DROP COLUMN "updated_by",
        DROP COLUMN "deleted_by",
        DROP COLUMN "is_active"
    `);

    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN "created_by_user_id" uuid`);
    await queryRunner.query(`UPDATE "projects" SET "created_by_user_id" = "created_by"`);
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "created_by_user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "projects_created_by_user_id_fkey"
        FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN "created_by",
        DROP COLUMN "updated_by",
        DROP COLUMN "deleted_by",
        DROP COLUMN "is_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "members"
        DROP COLUMN "created_by",
        DROP COLUMN "updated_by",
        DROP COLUMN "deleted_by",
        DROP COLUMN "deleted_at",
        DROP COLUMN "is_active"
    `);

    await queryRunner.query(`ALTER TABLE "workspaces" ADD COLUMN "created_by_user_id" uuid`);
    await queryRunner.query(`UPDATE "workspaces" SET "created_by_user_id" = "created_by"`);
    await queryRunner.query(`
      ALTER TABLE "workspaces" ALTER COLUMN "created_by_user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
        ADD CONSTRAINT "workspaces_created_by_user_id_fkey"
        FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
        DROP COLUMN "created_by",
        DROP COLUMN "updated_by",
        DROP COLUMN "deleted_by",
        DROP COLUMN "deleted_at",
        DROP COLUMN "is_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "created_by",
        DROP COLUMN "updated_by",
        DROP COLUMN "deleted_by",
        DROP COLUMN "deleted_at"
    `);
  }
}
