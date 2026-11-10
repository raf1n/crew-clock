import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TimeEntryIdle1794000006000 implements MigrationInterface {
  name = 'TimeEntryIdle1794000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN "idle_seconds" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD CONSTRAINT "ck_time_entries_idle_nonnegative" CHECK ("idle_seconds" >= 0)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "ck_time_entries_idle_nonnegative"`,
    );
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN "idle_seconds"`);
  }
}
