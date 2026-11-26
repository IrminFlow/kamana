import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 18:40 UTC = 12:10 a.m. India time: report the profiles added the day before.
crons.daily("send daily profile report", { hourUTC: 18, minuteUTC: 40 }, internal.profileReports.send, {});

export default crons;
