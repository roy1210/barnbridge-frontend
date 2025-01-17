import React from 'react';
import { ColumnsType } from 'antd/lib/table/interface';
import format from 'date-fns/format';
import { formatToken, formatUSD, shortenAddr } from 'web3/utils';

import Select from 'components/antd/select';
import Table from 'components/antd/table';
import Tooltip from 'components/antd/tooltip';
import { ExplorerAddressLink, ExplorerTxLink } from 'components/button';
import TableFilter, { TableFilterType } from 'components/custom/table-filter';
import { Text } from 'components/custom/typography';
import { useKnownTokens } from 'components/providers/knownTokensProvider';
import { useTokens } from 'components/providers/tokensProvider';
import { TokenIcon, TokenIconNames } from 'components/token-icon';
import { APISYJuniorBonds, useSyAPI } from 'modules/smart-yield/api';
import { useSYPool } from 'modules/smart-yield/providers/pool-provider';

type TableEntity = APISYJuniorBonds;

const TokenNameColumn: React.FC = () => {
  const { pool } = useSYPool();
  const { projectToken } = useKnownTokens();

  return (
    <div className="flex">
      <TokenIcon
        name={pool?.token?.icon as TokenIconNames}
        bubble1Name={projectToken.icon}
        bubble2Name={pool?.market?.icon.active as TokenIconNames}
        className="mr-16"
      />
      <div className="flex flow-row">
        <ExplorerAddressLink address={pool?.contracts.smartYield.address} className="flex flow-col mb-4">
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            {pool?.contracts.smartYield.symbol}
          </Text>
        </ExplorerAddressLink>
        <Text type="small" weight="semibold" color="secondary">
          {pool?.market?.name}
        </Text>
      </div>
    </div>
  );
};

const DepositedColumn: React.FC<{ entity: TableEntity }> = ({ entity }) => {
  const { pool } = useSYPool();
  const { getAmountInUSD } = useTokens();

  return (
    <>
      <Tooltip
        title={formatToken(entity.depositedAmount, {
          decimals: entity.underlyingTokenDecimals,
          tokenName: pool?.contracts.smartYield.symbol,
        })}>
        <Text type="p1" weight="semibold" color="primary" className="mb-4">
          {formatToken(entity.depositedAmount) ?? '-'}
        </Text>
      </Tooltip>
      <Text type="small" weight="semibold" color="secondary">
        {formatUSD(getAmountInUSD(entity.depositedAmount, pool?.contracts.smartYield.symbol!)) ?? '-'}
      </Text>
    </>
  );
};

const Columns: ColumnsType<TableEntity> = [
  {
    title: 'Token Name',
    render: (_, entity) => <TokenNameColumn />,
  },
  {
    title: 'Deposited',
    align: 'right',
    render: (_, entity) => <DepositedColumn entity={entity} />,
  },
  {
    title: 'Address',
    render: function Render(_, entity) {
      return (
        <ExplorerAddressLink address={entity.accountAddress}>
          <Text type="p1" weight="semibold" color="blue">
            {shortenAddr(entity.accountAddress)}
          </Text>
        </ExplorerAddressLink>
      );
    },
  },
  {
    title: 'Tx Hash / Timestamp',
    render: (_, entity) => (
      <>
        <ExplorerTxLink address={entity.transactionHash} className="mb-4">
          <Text type="p1" weight="semibold" color="blue">
            {shortenAddr(entity.transactionHash)}
          </Text>
        </ExplorerTxLink>
        <Text type="small" weight="semibold" color="secondary">
          {format(entity.blockTimestamp * 1_000, 'MM.dd.yyyy HH:mm')}
        </Text>
      </>
    ),
  },
  {
    title: 'Maturity Date',
    align: 'right',
    render: (_, entity) => (
      <>
        <Text type="p1" weight="semibold" color="primary" className="mb-4">
          {format(entity.maturityDate * 1_000, 'MM.dd.yyyy')}
        </Text>
        <Text type="small" weight="semibold">
          {format(entity.maturityDate * 1_000, 'HH:mm')}
        </Text>
      </>
    ),
  },
];

type State = {
  loading: boolean;
  data: TableEntity[];
  total: number;
  pageSize: number;
  page: number;
  filters: {
    redeemed: string;
    sortBy: string;
    sortDir: string;
  };
};

const InitialState: State = {
  loading: false,
  data: [],
  total: 0,
  pageSize: 10,
  page: 1,
  filters: {
    redeemed: 'all',
    sortBy: 'none',
    sortDir: 'desc',
  },
};

const Filters: TableFilterType[] = [
  {
    name: 'redeemed',
    label: 'Type',
    defaultValue: 'all',
    itemRender: () => {
      const options = [
        {
          value: 'all',
          label: 'All junior bonds',
        },
        {
          value: 'false',
          label: 'Active',
        },
        {
          value: 'true',
          label: 'Redeemed',
        },
      ];

      return <Select options={options} className="full-width" />;
    },
  },
  {
    name: 'sortBy',
    label: 'Sort by',
    defaultValue: 'none',
    itemRender: () => {
      const options = [
        {
          value: 'none',
          label: 'Default',
        },
        {
          value: 'maturityDate',
          label: 'Maturity Date',
        },
        {
          value: 'depositedAmount',
          label: 'Deposited Amount',
        },
      ];

      return <Select options={options} className="full-width" />;
    },
  },
  {
    name: 'sortDir',
    label: 'Sort direction',
    defaultValue: 'desc',
    itemRender: () => {
      const options = [
        {
          value: 'desc',
          label: 'Descending',
        },
        {
          value: 'asc',
          label: 'Ascending',
        },
      ];

      return <Select options={options} className="full-width" />;
    },
  },
];

type Props = {
  tabs: React.ReactNode;
};

const JuniorBondsTable: React.FC<Props> = ({ tabs }) => {
  const poolCtx = useSYPool();
  const { pool } = poolCtx;
  const syAPI = useSyAPI();

  const [state, setState] = React.useState<State>(InitialState);

  React.useEffect(() => {
    if (!pool) {
      return;
    }

    (async () => {
      setState(prevState => ({
        ...prevState,
        loading: true,
      }));

      try {
        const history = await syAPI.fetchSYJuniorBonds(
          pool.smartYieldAddress,
          state.page,
          state.pageSize,
          state.filters.redeemed !== 'all' ? state.filters.redeemed : undefined,
          state.filters.sortBy !== 'none' ? state.filters.sortBy : undefined,
          state.filters.sortBy !== 'none' ? state.filters.sortDir : undefined,
        );

        setState(prevState => ({
          ...prevState,
          loading: false,
          data: history.data,
          total: history.meta.count,
        }));
      } catch {
        setState(prevState => ({
          ...prevState,
          loading: false,
          data: [],
          total: 0,
        }));
      }
    })();
  }, [pool?.smartYieldAddress, state.page, state.filters]);

  function handleFilterChange(filters: Record<string, any>) {
    setState(prevState => ({
      ...prevState,
      page: 1,
      filters: {
        ...prevState.filters,
        ...filters,
      },
    }));
  }

  function handlePageChange(page: number) {
    setState(prevState => ({
      ...prevState,
      page,
    }));
  }

  return (
    <>
      <header className="card-header flex align-center justify-space-between ph-24 pv-0">
        {tabs}
        <TableFilter filters={Filters} value={state.filters} onChange={handleFilterChange} />
      </header>
      <Table<TableEntity>
        columns={Columns}
        dataSource={state.data}
        rowKey="transactionHash"
        loading={state.loading}
        pagination={{
          total: state.total,
          pageSize: state.pageSize,
          current: state.page,
          position: ['bottomRight'],
          showTotal: (total: number, [from, to]: [number, number]) => (
            <Text type="p2" weight="semibold" color="secondary">
              Showing {from} to {to} out of {total} entries
            </Text>
          ),
          onChange: handlePageChange,
        }}
        scroll={{
          x: true,
        }}
      />
    </>
  );
};

export default JuniorBondsTable;
