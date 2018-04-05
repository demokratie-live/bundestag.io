/* eslint-disable no-mixed-operators */

import _ from 'lodash';
import Scraper from '@democracy-deutschland/dip21-scraper';
import prettyMs from 'pretty-ms';
import fs from 'fs-extra';
import Log from 'log';
import axios from 'axios';
import moment from 'moment';

import Procedure from './models/Procedure';
import CronJobModel from './models/CronJob';
import { mongoose } from './config/db';
import CONSTANTS from './config/constants';

const log = new Log('error', fs.createWriteStream('error-import.log'));

// require('./config/db');

const scraper = new Scraper();
let pastScrapeData = null;
const procedureStatusWhitelist = ['Überwiesen', 'Beschlussempfehlung liegt vor'];
let cronIsRunning = false;
let cronStart = null;

const parseDate = (input) => {
  const parts = input.match(/(\d+)/g);
  // note parts[1]-1
  return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
};

const ensureArray = (element) => {
  if (element) {
    if (!_.isArray(element)) {
      return [element];
    }
    return element;
  }
  return null;
};

const saveProcedure = async ({ procedureData }) => {
  const process = _.isArray(procedureData.VORGANGSABLAUF.VORGANGSPOSITION)
    ? procedureData.VORGANGSABLAUF.VORGANGSPOSITION
    : [procedureData.VORGANGSABLAUF.VORGANGSPOSITION];
  const history = process.map((e) => {
    const flow = {
      procedureId: procedureData.vorgangId.trim(),
      assignment: e.ZUORDNUNG.trim(),
      initiator: e.URHEBER.trim(),
      findSpot: e.FUNDSTELLE.trim(),
      findSpotUrl: _.trim(e.FUNDSTELLE_LINK),
      date: parseDate(e.FUNDSTELLE.substr(0, 10)),
    };
    if (e.BESCHLUSS) {
      if (!_.isArray(e.BESCHLUSS)) {
        e.BESCHLUSS = [e.BESCHLUSS];
      }
      if (e.BESCHLUSS.length > 0) {
        flow.decision = e.BESCHLUSS.map(beschluss => ({
          page: beschluss.BESCHLUSSSEITE || undefined,
          tenor: beschluss.BESCHLUSSTENOR || undefined,
          document: beschluss.BEZUGSDOKUMENT || undefined,
          type: beschluss.ABSTIMMUNGSART || undefined,
          comment: beschluss.ABSTIMMUNG_BEMERKUNG || undefined,
          majority: beschluss.MEHRHEIT || undefined,
          foundation: beschluss.GRUNDLAGE || undefined,
        }));
      }
    }
    return flow;
  });

  /* let approvalRequired;
  if (procedureData.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT) {
    if (!_.isArray(procedureData.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT)) {
      approvalRequired = [procedureData.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT];
    } else {
      approvalRequired = procedureData.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT;
    }
  } */

  const procedureObj = {
    procedureId: procedureData.vorgangId || undefined,
    type: procedureData.VORGANG.VORGANGSTYP || undefined,
    period: parseInt(procedureData.VORGANG.WAHLPERIODE, 10) || undefined,
    title: procedureData.VORGANG.TITEL || undefined,
    currentStatus: procedureData.VORGANG.AKTUELLER_STAND || undefined,
    signature: procedureData.VORGANG.SIGNATUR || undefined,
    gestOrderNumber: procedureData.VORGANG.GESTA_ORDNUNGSNUMMER || undefined,
    approvalRequired: ensureArray(procedureData.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT),
    euDocNr: procedureData.VORGANG.EU_DOK_NR || undefined,
    abstract: procedureData.VORGANG.ABSTRAKT || undefined,
    promulgation: ensureArray(procedureData.VORGANG.VERKUENDUNG),
    legalValidity: ensureArray(procedureData.VORGANG.INKRAFTTRETEN),
    tags: ensureArray(procedureData.VORGANG.SCHLAGWORT),
    subjectGroups: ensureArray(procedureData.VORGANG.SACHGEBIET),
    importantDocuments: ensureArray(procedureData.VORGANG.WICHTIGE_DRUCKSACHE || []).map(doc => ({
      editor: doc.DRS_HERAUSGEBER,
      number: doc.DRS_NUMMER,
      type: doc.DRS_TYP,
      url: doc.DRS_LINK,
    })),
    history,
  };

  await Procedure.update(
    {
      procedureId: procedureObj.procedureId,
    },
    { $set: _.pickBy(procedureObj) },
    {
      upsert: true,
    },
  );
};

const doScrape = ({ data }) => {
  const parts = data.date.match(/(\d+)/g);
  const dipDate = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));

  let scrapeData = pastScrapeData.find(({ procedureId }) => procedureId === data.id);
  if (!scrapeData) {
    scrapeData = { updatedAt: 0 };
  }
  const scrapeDate = new Date(scrapeData.updatedAt);

  const timeSpanDib = new Date() - dipDate;
  const timeSpanScrape = new Date() - scrapeDate;

  const oneDay = 1000 * 60 * 60 * 24;
  const oneWeek = oneDay * 7;
  const oneMonth = oneDay * 31;
  const oneYear = oneDay * 365;

  // TIME SCRAPE
  if (
    // always scrape when dib_date is after last scrape_date
    dipDate > scrapeDate ||
    // always scrape last 3 Months
    timeSpanDib < 3 * oneMonth ||
    // always scrape when last scrape_date is one month old
    timeSpanScrape > oneMonth ||
    // always scrape when last scrape_date is one day old and dib is up to 1 year old
    (timeSpanScrape > oneDay && timeSpanDib < oneYear) ||
    // always scrape when last scrape_date is one week old and dib is up to 4 year old
    (timeSpanScrape > oneWeek && timeSpanDib < 4 * oneYear)
  ) {
    return true;
  }

  // STATUS SCRAPE -> Whitelist
  if (procedureStatusWhitelist.find(white => white === scrapeData.currentStatus)) {
    return true;
  }

  return false;
};

let linksSum = 0;
let startDate;

const logUpdateSearchProgress = ({ hasError }) => {
  process.stdout.write(hasError ? 'e' : '.');
};

const logStartDataProgress = async ({ sum }) => {
  startDate = new Date();
  process.stdout.write('\n');
  linksSum = sum;
  console.log(`Started at ${startDate} - ${linksSum} Links found`);
};

const logUpdateDataProgress = ({ hasError }) => {
  process.stdout.write(hasError ? 'e' : '.');
};

const logFinished = () => {
  const end = Date.now();
  const elapsed = end - cronStart;
  console.log(`### Finish Cronjob! Time: ${prettyMs(_.toInteger(elapsed))}`);
  cronIsRunning = false;
};

const logError = ({ error }) => {
  log.error(error);
};

console.log('### Waiting for Cronjob');
const cronTask = async () => {
  const History = mongoose.model('History');
  if (!cronIsRunning) {
    cronIsRunning = true;
    cronStart = Date.now();
    const cron = await CronJobModel.findOneAndUpdate(
      {
        name: 'import-procedures',
      },
      {
        $set: {
          name: 'import-procedures',
          lastStartDate: cronStart,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
    console.log(`### Start Cronjob ${moment(cronStart).format()}`);
    // get old Scrape Data for cache
    pastScrapeData = await Procedure.find({}, { procedureId: 1, updatedAt: 1, currentStatus: 1 });
    let selectPeriods = ['Alle'];
    if (process.env.PERIODS) {
      selectPeriods = process.env.PERIODS.split(',');
    }
    // Do the scrape
    await scraper
      .scrape({
        // settings
        browserStackSize: 5,
        selectPeriods,
        selectOperationTypes: ['100'],
        logUpdateSearchProgress,
        logStartDataProgress,
        logStopDataProgress: () => {
          process.stdout.write('\n');
        },
        logUpdateDataProgress,
        // log
        logFinished,
        logError,
        // data
        outScraperData: saveProcedure,
        // cache(link skip logic)
        doScrape,
      })
      .then(async () => {
        // empty query for initial webhook
        const query = cron.lastFinishDate ? { createdAt: { $gte: cron.lastFinishDate } } : {};

        // Find updated procedures
        const histories = await History.find(query, { collectionId: 1 }).then(h =>
          h.map(p => p.collectionId));
        const procedures = await Procedure.find(
          { _id: { $in: histories } },
          // { updatedAt: { $gte: cronStart } },
          { procedureId: 1, type: 1, period: 1 },
        );

        // Find Counts per Period & Type before Cronstart
        let groups = await Procedure.aggregate([
          {
            // Filter by updatedAt
            $project: {
              period: 1,
              type: 1,
              cond: { $lt: ['$updatedAt', cronStart] },
            },
          },
          {
            // Group by Period & Type
            $group: {
              _id: { period: '$period', type: '$type' },
              count: { $sum: 1 },
            },
          },
          {
            // Group by Period
            $group: {
              _id: '$_id.period',
              types: { $push: { type: '$_id.type', countBefore: '$count' } },
            },
          },
          {
            // Rename _id Field to period
            $project: { _id: 0, period: '$_id', types: 1 },
          },
        ]);

        // Loop through Groups and Types - assign changed IDs
        groups = groups.map((group) => {
          const types = group.types.map((type) => {
            const changedIds = procedures
              .filter(p => p.period === group.period && p.type === type.type)
              .map(v => v.procedureId);
            return { ...type, changedIds };
          });
          return { ...group, types };
        });

        // Send Data to Hook
        axios
          .post(`${CONSTANTS.DEMOCRACY_SERVER_WEBHOOK_URL}`, {
            data: groups,
          })
          .then(async (response) => {
            console.log(response.data);
            await CronJobModel.update(
              {
                name: 'import-procedures',
              },
              {
                $set: {
                  lastFinishDate: Date.now(),
                },
              },
              {
                upsert: true,
              },
            );
          })
          .catch((error) => {
            console.log(`democracy server error: ${error}`);
          });

        console.log('#####FINISH####');
      })
      .catch(async (error) => {
        console.log(error);
        logFinished();
        await CronJobModel.update(
          {
            name: 'import-procedures',
          },
          {
            $set: {
              lastErrorDate: Date.now(),
            },
          },
          {
            upsert: true,
          },
        );
      });
  }
};

export default cronTask;
