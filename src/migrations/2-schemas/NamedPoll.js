import { Schema } from 'mongoose';
import diffHistory from 'mongoose-diff-history/diffHistory';

import NamedPollVotes from './NamedPoll/Votes';
import NamedPollSpeech from './NamedPoll/Speech';
import NamedPollMedia from './NamedPoll/Media';

const NamedPollSchema = new Schema(
  {
    URL: { type: String, default: null },
    webId: { type: String, required: true, unique: true, index: true },
    procedureId: { type: String, default: null },
    date: { type: Date },
    title: { type: String },
    description: { type: String },
    detailedDescription: { type: String },
    documents: [{ type: String }],
    deputyVotesURL: { type: String },
    plenarProtocolURL: { type: String },
    votes: NamedPollVotes,
    media: NamedPollMedia,
    speeches: [NamedPollSpeech],
  },
  { timestamps: true },
);

NamedPollSchema.plugin(diffHistory.plugin, { omit: ['updatedAt'] });

export default NamedPollSchema;