import axios from 'axios';
import CONSTANTS from '../../config/constants';

const deputiesNumber = {
  19: {
    Linke: 69,
    SPD: 153,
    Grüne: 67,
    CDU: 246,
    FDP: 80,
    AFD: 92,
    Andere: 2,
  },
};

export default {
  Query: {
    procedures: (
      parent,
      {
        IDs, period = [19], type = ['Gesetzgebung', 'Antrag'], status,
      },
      { ProcedureModel },
    ) => {
      let match = { period: { $in: period }, type: { $in: type } };
      if (status) {
        match = { ...match, currentStatus: { $in: status } };
      }
      if (IDs) {
        match = { ...match, procedureId: { $in: IDs } };
      }
      return ProcedureModel.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'histories',
            localField: '_id',
            foreignField: 'collectionId',
            as: 'objectHistory',
          },
        },
        {
          $addFields: {
            bioUpdateAt: {
              $max: '$objectHistory.createdAt',
            },
          },
        },
        { $project: { objectHistory: false } },
      ]);
    },

    allProcedures: async (
      parent,
      { period = [19], type = ['Gesetzgebung', 'Antrag'] },
      { ProcedureModel },
    ) =>
      ProcedureModel.aggregate([
        { $match: { period: { $in: period }, type: { $in: type } } },
        {
          $lookup: {
            from: 'histories',
            localField: '_id',
            foreignField: 'collectionId',
            as: 'objectHistory',
          },
        },
        {
          $addFields: {
            bioUpdateAt: {
              $max: '$objectHistory.createdAt',
            },
          },
        },
        { $project: { objectHistory: false } },
      ]),

    procedureUpdates: async (parent, { period, type }, { ProcedureModel }) =>
      ProcedureModel.aggregate([
        { $match: { period: { $in: period }, type: { $in: type } } },
        {
          $lookup: {
            from: 'histories',
            localField: '_id',
            foreignField: 'collectionId',
            as: 'objectHistory',
          },
        },
        {
          $addFields: {
            bioUpdateAt: {
              $max: '$objectHistory.createdAt',
            },
          },
        },
        { $project: { objectHistory: false } },
      ]),
  },
  Mutation: {
    saveProcedureCustomData: async (
      parent,
      { procedureId, partyVotes, decisionText },
      { ProcedureModel, user },
    ) => {
      if (!user || user.role !== 'BACKEND') {
        throw new Error('Authentication required');
      }
      const procedure = await ProcedureModel.findOne({ procedureId });

      let voteResults = {
        partyVotes,
        decisionText,
      };

      if (deputiesNumber[procedure.period]) {
        const sumResults = {
          yes: 0,
          abstination: 0,
          no: 0,
        };
        partyVotes.forEach(({ party, main, deviants }) => {
          switch (main) {
            case 'YES':
              sumResults.yes +=
                deputiesNumber[procedure.period][party] -
                deviants.yes -
                deviants.abstination -
                deviants.no;
              break;
            case 'ABSTINATION':
              sumResults.abstination +=
                deputiesNumber[procedure.period][party] -
                deviants.yes -
                deviants.abstination -
                deviants.no;
              break;
            case 'NO':
              sumResults.no +=
                deputiesNumber[procedure.period][party] -
                deviants.yes -
                deviants.abstination -
                deviants.no;
              break;

            default:
              break;
          }
          sumResults.yes += deviants.yes;
          sumResults.abstination += deviants.abstination;
          sumResults.no += deviants.no;
        });
        voteResults = { ...voteResults, ...sumResults };
      }

      await ProcedureModel.update(
        { procedureId },
        {
          $set: {
            'customData.voteResults': { ...voteResults },
          },
        },
      );

      axios.post(`${CONSTANTS.DEMOCRACY_SERVER_WEBHOOK_URL}`, {
        data: [{period: procedure.period, types: [{type: procedure.type, changedIds: [ procedure.procedureId ]}]}],
      }).then(async (response) => {
        console.log(response.data);
      }).catch((error) => {
        console.log(`democracy server error: ${error}`);
      });

      return ProcedureModel.findOne({ procedureId });
    },
  },
};
