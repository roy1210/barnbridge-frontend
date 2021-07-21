import { FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useDebounce from '@rooks/use-debounce';
import BigNumber from 'bignumber.js';
import getUnixTime from 'date-fns/getUnixTime';
import { formatPercent } from 'web3/utils';

import Input from 'components/antd/input';
import Progress from 'components/antd/progress';
import Icon from 'components/custom/icon';
import { ColumnType, Table, TableFooter } from 'components/custom/table';
import { Tabs } from 'components/custom/tabs';
import { Text } from 'components/custom/typography';
import { UseLeftTime } from 'hooks/useLeftTime';
import { APILiteProposalEntity, useFetchProposals } from 'modules/governance/api';

import ProposalStatusTag from '../proposal-status-tag';

import { getFormattedDuration } from 'utils';

import s from './s.module.scss';

type ExtendedAPILiteProposalEntity = APILiteProposalEntity & {
  forRate: BigNumber | undefined;
  againstRate: BigNumber | undefined;
  stateTimeEnd: number;
};

const Columns: ColumnType<ExtendedAPILiteProposalEntity>[] = [
  {
    heading: 'Proposal',
    style: {
      width: '70%',
    },
    render: entity => (
      <div className="flex flow-row row-gap-8">
        <Link to={`proposals/${entity.proposalId}`}>
          <Text type="p1" weight="semibold" color="primary">
            PID-{entity.proposalId}: {entity.title}
          </Text>
        </Link>
        <div className="flex flow-col col-gap-16 align-center">
          <ProposalStatusTag state={entity.state} />
          <UseLeftTime end={entity.stateTimeEnd * 1_000} delay={1_000}>
            {leftTime => (
              <Text type="p2" weight="semibold" color="secondary">
                {leftTime > 0 ? getFormattedDuration(0, entity.stateTimeEnd * 1_000) : ''}
              </Text>
            )}
          </UseLeftTime>
        </div>
      </div>
    ),
  },
  {
    heading: 'Votes',
    style: {
      width: '30%',
    },
    render: entity => (
      <div className="flex flow-row row-gap-8">
        <div className="flex flow-col col-gap-24">
          <Progress
            percent={(entity.forRate?.toNumber() ?? 0) * 100}
            strokeColor="var(--theme-green-color)"
            trailColor="rgba(var(--theme-green-color-rgb), .16)"
          />
          <Text type="p2" weight="semibold" color="secondary" align="right" style={{ width: '64px' }}>
            {formatPercent(entity.forRate) ?? '-'}
          </Text>
        </div>
        <div className="flex flow-col col-gap-24">
          <Progress
            percent={(entity.againstRate?.toNumber() ?? 0) * 100}
            strokeColor="var(--theme-red-color)"
            trailColor="rgba(var(--theme-red-color-rgb), .16)"
          />
          <Text type="p2" weight="semibold" color="secondary" align="right" style={{ width: '64px' }}>
            {formatPercent(entity.againstRate) ?? '-'}
          </Text>
        </div>
      </div>
    ),
  },
];

const ProposalsTable: FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [activeTab, setActiveTab] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const { data, loading } = useFetchProposals(page, activeTab, searchFilter);
  const proposals = data?.data ?? [];
  const proposalsCount = data?.meta.count ?? 0;

  const mappedProposals = useMemo(() => {
    return proposals.map(proposal => {
      const total = proposal.forVotes.plus(proposal.againstVotes);

      let forRate: BigNumber | undefined;
      let againstRate: BigNumber | undefined;

      if (total.gt(BigNumber.ZERO)) {
        forRate = proposal.forVotes.div(total);
        againstRate = proposal.againstVotes.div(total);
      }

      const stateTimeEnd = getUnixTime(Date.now()) + (proposal.stateTimeLeft ?? 0);

      return {
        ...proposal,
        forRate,
        againstRate,
        stateTimeEnd,
      };
    });
  }, [proposals]);

  const handleSearchChange = useDebounce((value: string) => {
    setSearchFilter(value);
    setPage(1);
  }, 1_000);

  return (
    <div className="card">
      <div className="card-header flex flow-col col-gap-24 align-center justify-space-between pv-0">
        <Tabs
          tabs={[
            {
              id: 'all',
              children: 'All proposals',
              onClick: () => {
                setActiveTab('all');
                setPage(1);
              },
            },
            {
              id: 'active',
              children: 'Active',
              onClick: () => {
                setActiveTab('active');
                setPage(1);
              },
            },
            {
              id: 'executed',
              children: 'Executed',
              onClick: () => {
                setActiveTab('executed');
                setPage(1);
              },
            },
            {
              id: 'failed',
              children: 'Failed',
              onClick: () => {
                setActiveTab('failed');
                setPage(1);
              },
            },
          ]}
          activeKey={activeTab}
          onClick={setActiveTab}
        />
        <Input
          className={s.search}
          prefix={<Icon name="search-outlined" width={16} height={16} />}
          placeholder="Search proposal"
          onChange={ev => handleSearchChange(ev.target.value)}
        />
      </div>
      <Table<ExtendedAPILiteProposalEntity>
        columns={Columns}
        data={mappedProposals}
        rowKey={row => String(row.proposalId)}
        loading={loading}
        // locale={{
        //   emptyText: 'No proposals', // TODO: Add support of empty result to Table component
        // }}
      />
      <TableFooter total={proposalsCount} current={page} pageSize={pageSize} onChange={setPage}>
        {({ total, from, to }) => (
          <>
            Showing {from} to {to} out of {total} proposals
          </>
        )}
      </TableFooter>
    </div>
  );
};

export default ProposalsTable;
