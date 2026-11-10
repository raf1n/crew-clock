import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ActivityRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityRetentionService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    void this.cleanup();
    this.interval = setInterval(() => void this.cleanup(), CLEANUP_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      const result = (await this.dataSource.query(`
        DELETE FROM "activity_samples" AS "sample"
        USING "workspaces" AS "workspace"
        WHERE "sample"."workspace_id" = "workspace"."id"
          AND "sample"."interval_start" <
            now() - make_interval(days => "workspace"."activity_retention_days")
      `)) as { rowCount?: number } | undefined;
      if (result?.rowCount) {
        this.logger.log(`Deleted ${result.rowCount} expired activity samples`);
      }
    } catch (error) {
      this.logger.error('Activity retention cleanup failed', error);
    }
  }
}
