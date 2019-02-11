import { ApolloServer } from 'apollo-server-express';
import CONFIG from './../../config';

import typeDefs from './../../graphql/schemas';
import resolvers from './../../graphql/resolvers';
import schemaDirectives from './../../graphql/schemaDirectives';

// Models
import ProcedureModel from './../../models/Procedure';
import UserModel from './../../models/User';
import DeputyModel from './../../models/Deputy';
import HistoryModel from './../../models/History';

const graphql = new ApolloServer({
  engine: CONFIG.ENGINE_API_KEY
    ? {
        apiKey: CONFIG.ENGINE_API_KEY,
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
    HistoryModel,
  }),
});

module.exports = graphql;