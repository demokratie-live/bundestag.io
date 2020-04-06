import mongoose from 'mongoose';
import CronJobSchema, { ICronJob } from './../migrations/7-schemas/CronJob';

export default mongoose.model<ICronJob>('CronJob', CronJobSchema);
