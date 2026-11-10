import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTimezone1794000007000 implements MigrationInterface {
  name = 'UserTimezone1794000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'UTC'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
  }
}
