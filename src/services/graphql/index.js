import { ApolloServer } from 'apollo-server-express';

// Models
import {
  ProcedureModel,
  UserModel,
  DeputyModel,
  NamedPollModel,
  HistoryModel,
  ConferenceWeekDetailModel,
} from '@democracy-deutschland/bundestagio-common';

import CONFIG from '../../config';

import typeDefs from '../../graphql/schemas';
import resolvers from '../../graphql/resolvers';
import schemaDirectives from '../../graphql/schemaDirectives';

const graphql = new ApolloServer({
  engine: CONFIG.ENGINE_API_KEY
    ? {
        apiKey: CONFIG.ENGINE_API_KEY,
        // Send params and headers to engine
        privateVariables: !CONFIG.ENGINE_DEBUG_MODE,
        privateHeaders: !CONFIG.ENGINE_DEBUG_MODE,
      }
    : false,
  typeDefs,
  resolvers,
  schemaDirectives,
  introspection: false,
  playground: false,
  context: ({ req, res }) => ({
    // Connection
    req,
    res,
    // user
    user: req.user,
    // Models
    ProcedureModel,
    UserModel,
    DeputyModel,
    NamedPollModel,
    HistoryModel,
    ConferenceWeekDetailModel,
  }),
});

module.exports = graphql;