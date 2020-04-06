import mongoose from 'mongoose';
import NamedPollSchema, { INamedPoll } from './../migrations/2-schemas/NamedPoll';

export default mongoose.model<INamedPoll>('NamedPoll', NamedPollSchema);
