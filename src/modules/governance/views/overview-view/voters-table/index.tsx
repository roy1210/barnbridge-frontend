import { useState } from 'react';
import classnames from 'classnames';
import { formatToken, shortenAddr } from 'web3/utils';

import { ExplorerAddressLink } from 'components/custom/externalLink';
import Identicon from 'components/custom/identicon';
import { ColumnType, Table, TableFooter } from 'components/custom/table';
import { Text } from 'components/custom/typography';
import { FCx } from 'components/types.tx';
import { APIVoterEntity, useFetchVoters } from 'modules/governance/api';

const Columns: ColumnType<APIVoterEntity>[] = [
  {
    heading: 'Address',
    render: (item: APIVoterEntity) => (
      <div className="flex col-gap-16 align-center">
        <Identicon address={item.address} width={32} height={32} />
        <ExplorerAddressLink address={item.address} className="link-blue">
          <Text type="p1" weight="semibold" ellipsis className="hidden-mobile hidden-tablet">
            {item.address}
          </Text>
          <Text type="p1" weight="semibold" wrap={false} className="hidden-desktop">
            {shortenAddr(item.address)}
          </Text>
        </ExplorerAddressLink>
      </div>
    ),
  },
  {
    heading: <div className="text-right">Staked Balance</div>,
    render: (item: APIVoterEntity) => (
      <Text type="p1" weight="semibold" color="primary" className="text-right">
        {formatToken(item.bondStaked, { decimals: 2, minDecimals: 2 })}
      </Text>
    ),
  },
  {
    heading: <div className="text-right">Voting Power</div>,
    render: (item: APIVoterEntity) => (
      <Text type="p1" weight="semibold" color="primary" className="text-right">
        {formatToken(item.votingPower, { decimals: 2, minDecimals: 2 })}
      </Text>
    ),
  },
  {
    heading: <div className="text-right">Votes</div>,
    render: (item: APIVoterEntity) => (
      <Text type="p1" weight="semibold" color="primary" className="text-right">
        {item.votes}
      </Text>
    ),
  },
  {
    heading: <div className="text-right">Proposals</div>,
    render: (item: APIVoterEntity) => (
      <Text type="p1" weight="semibold" color="primary" className="text-right">
        {item.proposals}
      </Text>
    ),
  },
];

const VotersTable: FCx = props => {
  const { className } = props;

  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const { data, loading } = useFetchVoters(page, pageSize);
  const voters = data?.data ?? [];
  const totalVoters = data?.meta?.count ?? 0;

  return (
    <div className={classnames('card', className)}>
      <div className="card-header">
        <Text type="p1" weight="semibold" color="primary">
          Voter weights
        </Text>
      </div>
      <Table<APIVoterEntity> columns={Columns} data={voters} rowKey={row => row.address} loading={loading} />
      <TableFooter total={totalVoters} current={page} pageSize={pageSize} onChange={setPage}>
        {({ total, from, to }) => (
          <>
            Showing {from} to {to} out of {total} stakers
          </>
        )}
      </TableFooter>
    </div>
  );
};

export default VotersTable;
