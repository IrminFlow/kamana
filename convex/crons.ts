import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily("send daily profile report", { hourUTC: 18, minuteUTC: 40 }, internal.profileReports.send, {});
export default crons;
