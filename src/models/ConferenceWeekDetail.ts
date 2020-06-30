import mongoose from 'mongoose';
import ConferenceWeekDetailSchema, {
  IConferenceWeekDetail,
} from '../migrations/3-schemas/ConferenceWeekDetail';

export default mongoose.model<IConferenceWeekDetail>(
  'ConferenceWeekDetail',
  ConferenceWeekDetailSchema,
);
