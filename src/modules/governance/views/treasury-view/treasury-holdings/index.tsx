import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import format from 'date-fns/format';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken, formatUSD, shortenAddr } from 'web3/utils';
import Web3Contract from 'web3/web3Contract';

import Select from 'components/antd/select';
import Tooltip from 'components/antd/tooltip';
import { ExplorerAddressLink } from 'components/custom/externalLink';
import Icon, { IconNames, TokenIconNames } from 'components/custom/icon';
import { ColumnType, Table, TableFooter } from 'components/custom/table';
import TableFilter, { TableFilterType } from 'components/custom/table-filter';
import { Text } from 'components/custom/typography';
import { useContractFactory } from 'hooks/useContract';
import { useReload } from 'hooks/useReload';
import {
  APITreasuryHistory,
  APITreasuryToken,
  useFetchTreasuryHistory,
  useFetchTreasuryTokens,
} from 'modules/governance/api';
import { MarketMeta } from 'modules/smart-yield/providers/markets';
import { useConfig } from 'providers/configProvider';
import { TokenType, useTokens } from 'providers/tokensProvider';

type ExtendedAPITreasuryToken = APITreasuryToken & {
  balanceAmount: BigNumber | undefined;
  balanceAmountUSD: BigNumber | undefined;
  market: MarketMeta | undefined;
  token: TokenType | undefined;
};

type ExtendedAPITreasuryHistory = APITreasuryHistory & {
  token: TokenType | undefined;
  amount: BigNumber | undefined;
  amountUSD: BigNumber | undefined;
};

type HistoryFilterType = {
  token: string;
  direction: string;
};

const Columns: ColumnType<ExtendedAPITreasuryHistory>[] = [
  {
    heading: 'Token Name',
    render: entity => (
      <div className="flex flow-col align-center">
        <Icon name={(entity.token?.icon ?? 'token-unknown') as TokenIconNames} className="mr-16" />
        <Text type="p1" weight="semibold" color="primary" className="mr-4">
          {entity.tokenSymbol}
        </Text>
      </div>
    ),
  },
  {
    heading: 'Transaction Hash',
    render: entity => (
      <ExplorerAddressLink address={entity.transactionHash}>
        <Text type="p1" weight="semibold" color="blue">
          {shortenAddr(entity.transactionHash)}
        </Text>
      </ExplorerAddressLink>
    ),
  },
  {
    heading: 'Date',
    render: entity => (
      <>
        <Text type="p1" weight="semibold" color="primary" className="mb-4">
          {format(entity.blockTimestamp * 1_000, 'MM.dd.yyyy')}
        </Text>
        <Text type="small" weight="semibold">
          {format(entity.blockTimestamp * 1_000, 'HH:mm')}
        </Text>
      </>
    ),
  },
  {
    heading: 'Amount',
    render: entity => (
      <Tooltip
        placement="bottomRight"
        title={formatToken(entity.amount, {
          decimals: entity.tokenDecimals,
          tokenName: entity.tokenSymbol,
        })}>
        <Text type="p1" weight="semibold" color={entity.transactionDirection === 'IN' ? 'green' : 'red'}>
          {entity.transactionDirection === 'IN' ? '+' : '-'} {formatToken(entity.amount) ?? '-'}
        </Text>
        <Text type="small" weight="semibold">
          {formatUSD(entity.amountUSD) ?? '-'}
        </Text>
      </Tooltip>
    ),
  },
  {
    heading: 'From',
    render: entity => (
      <ExplorerAddressLink
        address={entity.transactionDirection === 'IN' ? entity.counterpartyAddress : entity.accountAddress}>
        <Text type="p1" weight="semibold" color="blue">
          {entity.transactionDirection === 'IN'
            ? entity.counterpartyLabel || shortenAddr(entity.counterpartyAddress)
            : entity.accountLabel || shortenAddr(entity.accountAddress)}
        </Text>
      </ExplorerAddressLink>
    ),
  },
  {
    heading: 'To',
    render: entity => (
      <ExplorerAddressLink
        address={entity.transactionDirection === 'OUT' ? entity.counterpartyAddress : entity.accountAddress}>
        <Text type="p1" weight="semibold" color="blue">
          {entity.transactionDirection === 'OUT'
            ? entity.counterpartyLabel || shortenAddr(entity.counterpartyAddress)
            : entity.accountLabel || shortenAddr(entity.accountAddress)}
        </Text>
      </ExplorerAddressLink>
    ),
  },
];

const TreasuryHoldings: FC = () => {
  const config = useConfig();
  const [reload, version] = useReload();
  const { getAmountInUSD, getToken } = useTokens();
  const { getOrCreateContract, getContract } = useContractFactory();

  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;
  const [tokenFilter, setTokenFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const filterValue = useMemo<HistoryFilterType>(
    () => ({
      token: tokenFilter,
      direction: directionFilter,
    }),
    [tokenFilter, directionFilter],
  );

  const { data: treasuryTokens = [] } = useFetchTreasuryTokens();
  const { data: historyResult, loading: historyLoading } = useFetchTreasuryHistory(
    historyPage,
    tokenFilter,
    directionFilter,
  );
  const historyItems = historyResult?.data ?? [];
  const historyItemsCount = historyResult?.meta.count ?? 0;

  const tokensSource = useMemo(() => {
    const tokens = treasuryTokens
      ?.map<ExtendedAPITreasuryToken | undefined>(treasuryToken => {
        const token = getToken(treasuryToken.tokenSymbol);

        if (!token) {
          return undefined;
        }

        const tokenContract = getContract<Erc20Contract>(treasuryToken.tokenAddress);
        const balanceAmount = tokenContract
          ?.getBalanceOf(config.contracts.dao?.governance)
          ?.unscaleBy(treasuryToken.tokenDecimals);
        const balanceAmountUSD = getAmountInUSD(balanceAmount, treasuryToken.tokenSymbol);

        return {
          ...treasuryToken,
          balanceAmount,
          balanceAmountUSD,
          token,
        } as ExtendedAPITreasuryToken;
      })
      .filter(Boolean) as ExtendedAPITreasuryToken[];

    tokens.sort((a, b) =>
      a.balanceAmountUSD && b.balanceAmountUSD ? b.balanceAmountUSD.minus(a.balanceAmountUSD).toNumber() : 0,
    );

    return tokens;
  }, [getAmountInUSD, getContract, treasuryTokens, version]);

  const totalHoldingsUSD = useMemo(() => {
    return BigNumber.sumEach(tokensSource, item => item.balanceAmountUSD ?? BigNumber.ZERO);
  }, [tokensSource]);

  const historySource = useMemo(() => {
    return (historyItems?.map(item => {
      const token = getToken(item.tokenSymbol);
      const amount = BigNumber.from(item.amount);
      const amountUSD = getAmountInUSD(amount, item.tokenSymbol);

      return {
        ...item,
        token,
        amount,
        amountUSD,
      };
    }) ?? []) as ExtendedAPITreasuryHistory[];
  }, [historyItems]);

  const historyFilters = useMemo(() => {
    return [
      {
        name: 'token',
        label: 'Token address',
        defaultValue: 'all',
        itemRender: () => {
          const tokenOpts = [
            {
              value: 'all',
              label: 'All tokens',
            },
            ...tokensSource.map(token => ({
              value: token.tokenAddress,
              label: token.token?.name ?? token.tokenSymbol,
            })),
          ];

          return <Select options={tokenOpts} className="full-width" />;
        },
      },
      {
        name: 'direction',
        label: 'Transaction direction',
        defaultValue: 'all',
        itemRender: () => {
          const options = [
            {
              value: 'all',
              label: 'All pool transactions',
            },
            {
              value: 'in',
              label: 'In',
            },
            {
              value: 'out',
              label: 'Out',
            },
          ];

          return <Select options={options} className="full-width" />;
        },
      },
    ] as TableFilterType<HistoryFilterType>[];
  }, [tokensSource]);

  useEffect(() => {
    treasuryTokens?.forEach(token => {
      getOrCreateContract(token.tokenAddress, () => new Erc20Contract([], token.tokenAddress), {
        afterInit: contract => {
          contract.on(Web3Contract.UPDATE_DATA, reload);
          contract.loadCommon().catch(Error);
          contract.loadBalance(config.contracts.dao?.governance).catch(Error);
        },
      });
    });
  }, [treasuryTokens]);

  function handleFilterChange(filters: HistoryFilterType) {
    setHistoryPage(1);
    setTokenFilter(filters.token);
    setDirectionFilter(filters.direction);
  }

  return (
    <>
      <Text type="p1" weight="semibold" color="secondary" className="mb-8">
        Total holdings balance
      </Text>
      <Text type="h2" weight="bold" color="primary" className="mb-40">
        {formatUSD(totalHoldingsUSD) ?? '-'}
      </Text>
      <div className="flexbox-list mb-32" style={{ '--gap': '32px' } as CSSProperties}>
        {tokensSource.map(item => (
          <div key={item.tokenAddress} className="card p-24" style={{ minWidth: 195 }}>
            <div className="flex mb-16">
              <Icon name={(item.token?.icon ?? 'token-unknown') as IconNames} className="mr-8" />
              <Text type="p1" weight="semibold" color="primary">
                {item.tokenSymbol ?? '-'}
              </Text>
            </div>
            <Tooltip
              overlayStyle={{ maxWidth: 'inherit' }}
              title={formatToken(item.balanceAmount, {
                decimals: item.tokenDecimals,
                tokenName: item.tokenSymbol,
              })}>
              <Text type="h3" weight="bold" color="primary" className="mb-4">
                {formatToken(item.balanceAmount) ?? '-'}
              </Text>
            </Tooltip>
            <Text type="small" weight="semibold" color="secondary">
              {formatUSD(item.balanceAmountUSD) ?? '-'}
            </Text>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header flex flow-col align-center justify-space-between pv-12">
          <Text type="p1" weight="semibold" color="primary">
            Transaction history
          </Text>
          <TableFilter<HistoryFilterType> filters={historyFilters} value={filterValue} onChange={handleFilterChange} />
        </div>
        <Table<ExtendedAPITreasuryHistory>
          columns={Columns}
          data={historySource}
          rowKey={row => `${row.transactionHash}_${row.tokenSymbol}`}
          loading={historyLoading}
          // locale={{
          //   emptyText: 'No entries', // TODO: Add support of empty result to Table component
          // }}
        />
        <TableFooter
          total={historyItemsCount}
          current={historyPage}
          pageSize={historyPageSize}
          onChange={setHistoryPage}>
          {({ total, from, to }) => (
            <>
              Showing {from} to {to} out of {total} entries
            </>
          )}
        </TableFooter>
      </div>
    </>
  );
};

export default TreasuryHoldings;
