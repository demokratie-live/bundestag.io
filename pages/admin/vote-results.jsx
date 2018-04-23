import React from 'react';

import withData from '../../lib/withData';

import Layout from '../../components/layouts/Admin';
import ProceduresList from '../../components/admin/ProceduresList';

const VoteResults = () => (
  <Layout>
    <div>
      <h2>Abstimmungsergebnisse</h2>
      <ProceduresList />
    </div>
  </Layout>
);

export default withData(VoteResults);
