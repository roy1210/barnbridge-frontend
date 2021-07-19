import { FC } from 'react';

import { useDAO } from 'modules/governance/providers/daoProvider';

import ActivationThreshold from './activation-threshold';
import VotersTable from './voters-table';
import VotingStatList from './voting-stat-list';

const OverviewView: FC = () => {
  const daoCtx = useDAO();

  return (
    <>
      {daoCtx.isActive === false && <ActivationThreshold className="full-width mb-32" />}
      <VotingStatList className="mb-32" />
      <VotersTable />
    </>
  );
};

export default OverviewView;
