import {
  formatStagingReadinessReport,
  getStagingReadinessReport
} from "@/lib/config/stagingReadiness";

const report = getStagingReadinessReport();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatStagingReadinessReport(report));
}

if (!report.ready) {
  process.exit(1);
}
