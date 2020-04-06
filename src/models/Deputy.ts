import mongoose from 'mongoose';
import DeputySchema, { IDeputy } from './../migrations/1-schemas/Deputy';

export default mongoose.model<IDeputy>('Deputy', DeputySchema);
