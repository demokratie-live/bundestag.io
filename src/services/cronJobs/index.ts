import { CronJob, CronCommand } from 'cron';

import CONFIG from '../../config';

import importProcedures, {
  CRON_NAME as CRON_NAME_PROCEDURES,
} from './../../importer/importProcedures';
import importConferenceWeekDetails, {
  CRON_NAME as CRON_NAME_CONFERENCE_WEEK_DETAILS,
} from './../../importer/importConferenceWeekDetails';
import importNamedPolls, {
  CRON_NAME as CRON_NAME_NAMED_POLLS,
} from './../../importer/importNamedPolls';
import importNamedPollDeputies, {
  CRON_NAME as CRON_NAME_NAMED_POLLS_DEPUTIES,
} from './../../importer/importNamedPollDeputies';
import importDeputyProfiles, {
  CRON_NAME as CRON_NAME_DEPUTY_PROFILES,
} from './../../importer/importDeputyProfiles';

import { resetCronRunningState } from './tools';

// global variable to store cronjobs
const jobs: CronJob[] = [];

const registerCronJob = ({
  name,
  cronTime,
  cronTask,
  startOnInit,
}: {
  name: string;
  cronTime?: string;
  cronTask: CronCommand;
  startOnInit: boolean;
}) => {
  if (cronTime) {
    jobs.push(new CronJob(cronTime, cronTask, null, true, 'Europe/Berlin', null, startOnInit));
    global.Log.info(`[Cronjob][${name}] registered: ${cronTime}`);
  } else {
    global.Log.warn(`[Cronjob][${name}] disabled`);
  }
};

const cronJobs = async () => {
  // Server freshly started -> Reset all cron states
  // This assumes that only one instance is running on the same database
  await resetCronRunningState();
  // Procedures
  registerCronJob({
    name: CRON_NAME_PROCEDURES,
    cronTime: CONFIG.CRON_PROCEDURES,
    cronTask: importProcedures,
    startOnInit: CONFIG.CRON_START_ON_INIT,
  });
  // ConferenceWeekDetails
  registerCronJob({
    name: CRON_NAME_CONFERENCE_WEEK_DETAILS,
    cronTime: CONFIG.CRON_CONFERENCEWEEKDETAILS,
    cronTask: importConferenceWeekDetails,
    startOnInit: CONFIG.CRON_START_ON_INIT,
  });
  // NamedPolls
  registerCronJob({
    name: CRON_NAME_NAMED_POLLS,
    cronTime: CONFIG.CRON_NAMED_POLLS,
    cronTask: importNamedPolls,
    startOnInit: CONFIG.CRON_START_ON_INIT,
  });
  // NamedPollsDeputies
  registerCronJob({
    name: CRON_NAME_NAMED_POLLS_DEPUTIES,
    cronTime: CONFIG.CRON_NAMED_POLLS_DEPUTIES,
    cronTask: importNamedPollDeputies,
    startOnInit: CONFIG.CRON_START_ON_INIT,
  });
  // DeputyProfiles
  registerCronJob({
    name: CRON_NAME_DEPUTY_PROFILES,
    cronTime: CONFIG.CRON_DEPUTY_PROFILES,
    cronTask: importDeputyProfiles,
    startOnInit: CONFIG.CRON_START_ON_INIT,
  });
  // Return
  return jobs;
};

module.exports = cronJobs;
