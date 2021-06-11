﻿import React, { useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import cn from 'classnames';
import Erc20Contract from 'web3/erc20Contract';
import { formatPercent, formatToken, formatUSD } from 'web3/utils';
import Web3Contract from 'web3/web3Contract';

import Divider from 'components/antd/divider';
import Icon from 'components/custom/icon';
import { Tabs } from 'components/custom/tabs';
import { Text } from 'components/custom/typography';
import { getTokenByAddress, getTokenBySymbol } from 'components/providers/known-tokens-provider';
import { useContract } from 'hooks/useContract';
import { useReload } from 'hooks/useReload';
import { TrancheApiType } from 'modules/smart-exposure/api';
import { useWallet } from 'wallets/wallet';

import { calcTokensRatio } from 'modules/smart-exposure/utils';
import { getRelativeTime, numberFormat } from 'utils';

import s from './s.module.scss';

const tabs = [
  {
    id: 'rebalancing',
    children: 'Rebalancing details',
  },
  {
    id: 'pool',
    children: 'Pool details',
  },
];

type Props = {
  tranche: TrancheApiType;
};

export const TrancheDetails: React.FC<Props> = ({ tranche }) => {
  const [activeTab, setActiveTab] = React.useState('rebalancing');

  return (
    <section className="card">
      <header className={cn('card-header flex align-center', s.header)}>
        <Tabs tabs={tabs} activeKey={activeTab} onClick={setActiveTab} variation="normal" />
      </header>
      {activeTab === 'rebalancing' && <RebalancingDetails tranche={tranche} />}
      {activeTab === 'pool' && <PoolDetails tranche={tranche} />}
    </section>
  );
};

const RebalancingDetails = ({ tranche }: { tranche: TrancheApiType }) => {
  const tokenA = getTokenBySymbol(tranche.tokenA.symbol);
  const tokenB = getTokenBySymbol(tranche.tokenB.symbol);

  const [tokenARatio, tokenBRatio] = calcTokensRatio(tranche.targetRatio);

  return (
    <>
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Target ratio
          </Text>
          <Text type="p1" weight="semibold" color="primary" className=" flex align-center col-gap-4">
            <Icon name={tokenA?.icon!} width={16} height={16} />{' '}
            {numberFormat(tokenARatio, { minimumFractionDigits: 2 })}% <span className="ph-4">:</span>{' '}
            <Icon name={tokenB?.icon!} width={16} height={16} />{' '}
            {numberFormat(tokenBRatio, { minimumFractionDigits: 2 })}%
          </Text>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Current ratio
          </Text>
          <Text type="p1" weight="semibold" color="primary" className=" flex align-center col-gap-4">
            <Icon name={tokenA?.icon!} width={16} height={16} />{' '}
            {numberFormat(Number(tranche.tokenARatio) * 100, { minimumFractionDigits: 2 })}%{' '}
            <span className="ph-4">:</span> <Icon name={tokenB?.icon!} width={16} height={16} />{' '}
            {numberFormat(Number(tranche.tokenBRatio) * 100, { minimumFractionDigits: 2 })}%
          </Text>
        </div>
      </div>
      <Divider />
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Rebalancing strategies
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="flex align-center">
            {getRelativeTime(tranche.rebalancingInterval)}
            <span className="middle-dot ph-16 color-border" /> {'>'}{' '}
            {formatPercent(BigNumber.from(tranche.rebalancingCondition)?.dividedBy(tranche.sFactorE) ?? 0)} deviation
            from target
          </Text>
        </div>
      </div>
      <Divider />
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Last rebalance
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            11.25.2020
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            16:32
          </Text>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Conversion rate
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            $ 13,872.0007
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            per eToken
          </Text>
        </div>
      </div>
    </>
  );
};

const PoolDetails = ({ tranche }: { tranche: TrancheApiType }) => {
  const wallet = useWallet();

  const tokenAContract = useContract(tranche.tokenA.address, { loadBalance: true });
  const tokenBContract = useContract(tranche.tokenB.address, { loadBalance: true });

  const tokenABalance = BigNumber.from(tokenAContract.getBalanceOf(wallet.account)?.unscaleBy(tranche.tokenA.decimals));

  const tokenBBalance = BigNumber.from(tokenBContract.getBalanceOf(wallet.account)?.unscaleBy(tranche.tokenB.decimals));

  return (
    <>
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            {tranche.tokenA.symbol} price
          </Text>
          <Text type="p1" weight="semibold" color="primary">
            {formatUSD(tranche.tokenA.state.price)}
          </Text>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            {tranche.tokenB.symbol} price
          </Text>
          <Text type="p1" weight="semibold" color="primary">
            {formatUSD(tranche.tokenB.state.price)}
          </Text>
        </div>
      </div>
      <Divider />
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Wallet {tranche.tokenA.symbol} balance
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            {formatToken(tokenABalance) ?? '-'}
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            {formatUSD(tokenABalance?.multipliedBy(tranche.tokenA.state.price) ?? 0)}
          </Text>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Wallet {tranche.tokenB.symbol} balance
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            {formatToken(tokenBBalance) ?? '-'}
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            {formatUSD(tokenBBalance?.multipliedBy(tranche.tokenB.state.price) ?? 0)}
          </Text>
        </div>
      </div>
      <Divider />
      <div className="flexbox-grid p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Pool {tranche.tokenA.symbol} balance
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            {formatToken(BigNumber.from(tranche.state.tokenALiquidity))}
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            {formatUSD(BigNumber.from(tranche.state.tokenALiquidity)?.multipliedBy(tranche.tokenA.state.price) ?? 0)}
          </Text>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Pool {tranche.tokenB.symbol} balance
          </Text>
          <Text type="p1" weight="semibold" color="primary" className="mb-4">
            {formatToken(BigNumber.from(tranche.state.tokenBLiquidity))}
          </Text>
          <Text type="small" weight="semibold" color="secondary">
            {formatUSD(BigNumber.from(tranche.state.tokenBLiquidity)?.multipliedBy(tranche.tokenB.state.price) ?? 0)}
          </Text>
        </div>
      </div>
    </>
  );
};
