import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkspaceActivityRetention1794000009000 implements MigrationInterface {
  name = 'WorkspaceActivityRetention1794000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD COLUMN "activity_retention_days" integer NOT NULL DEFAULT 180`,
    );
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "ck_workspaces_activity_retention"
      CHECK ("activity_retention_days" BETWEEN 1 AND 3650)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "ck_workspaces_activity_retention"`,
    );
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "activity_retention_days"`);
  }
}
