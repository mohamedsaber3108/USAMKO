-- AlterTable
ALTER TABLE "report_schedules" ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'JSON';

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'JSON';
