import mongoose, { Schema } from 'mongoose';

const CronJobSchema = new Schema(
  {
    name: String,
    lastStartDate: Date,
    lastErrorDate: Date,
    lastFinishDate: Date,
  },
  { timestamps: true },
);

export default mongoose.model('CronJob', CronJobSchema);
