import { testCronTime } from './../services/cronJobs/tools';

export default {
  CRON_START_ON_INIT: process.env.CRON_START_ON_INIT === 'true',
  RUN_SCRAPER_KEY: process.env.RUN_SCRAPER_KEY,
  CRON_PROCEDURES: testCronTime(process.env.CRON_PROCEDURES) ? process.env.CRON_PROCEDURES : false,
  CRON_CONFERENCEWEEKDETAILS: testCronTime(process.env.CRON_CONFERENCEWEEKDETAILS)
    ? process.env.CRON_CONFERENCEWEEKDETAILS
    : '',
  CRON_NAMED_POLLS: testCronTime(process.env.CRON_NAMED_POLLS) ? process.env.CRON_NAMED_POLLS : '',
  CRON_NAMED_POLLS_DEPUTIES: testCronTime(process.env.CRON_NAMED_POLLS_DEPUTIES)
    ? process.env.CRON_NAMED_POLLS_DEPUTIES
    : '',
  CRON_DEPUTY_PROFILES: testCronTime(process.env.CRON_DEPUTY_PROFILES)
    ? process.env.CRON_DEPUTY_PROFILES
    : '',
};
