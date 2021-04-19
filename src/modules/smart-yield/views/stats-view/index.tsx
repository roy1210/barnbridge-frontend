import React from 'react';
import { Link } from 'react-router-dom';
import cn from 'classnames';

import Icon from 'components/custom/icon';
import { Tabs } from 'components/custom/tabs';
import { useSYPool } from 'modules/smart-yield/providers/pool-provider';
import { useWallet } from 'wallets/wallet';

import DepositHeader from '../deposit-view/deposit-header';
import ApyTrend from './apy';
import JuniorBondsTable from './junior-bonds-table';
import Liquidity from './liquidity';
import MarketDetails from './market';
import PoolTxTable from './pool-tx-table';
import SeniorBondsTable from './senior-bonds-table';

import s from './s.module.scss';

const tabs = [
  {
    children: 'Transaction history',
    id: 'th',
  },
  {
    children: 'Senior bonds',
    id: 'sb',
  },
  {
    children: 'Junior bonds',
    id: 'jb',
  },
];

const StatsView: React.FC = () => {
  const wallet = useWallet();
  const syPool = useSYPool();

  const [activeTab, setActiveTab] = React.useState('th');

  const tabsComponent = <Tabs tabs={tabs} active={activeTab} onClick={setActiveTab} variation="normal" size="small" />;

  return (
    <div className="container-limit">
      <div className="mb-16">
        <Link to="/smart-yield/markets" className="button-text">
          <Icon name="arrow-back" className="mr-8" color="inherit" />
          Markets
        </Link>
      </div>
      <div className="flex align-start mb-40">
        <DepositHeader />
        <Link
          to={{
            pathname: `/smart-yield/deposit`,
            search: `?m=${syPool.marketId}&t=${syPool.tokenId}`,
          }}
          className="button-primary ml-auto"
          {...{ disabled: !wallet.isActive }}>
          Deposit
        </Link>
      </div>

      <div className={cn(s.apyMarketRow, 'mb-32')}>
        <ApyTrend />
        <MarketDetails />
      </div>
      <Liquidity className="mb-32" />
      <section className="card">
        {activeTab === 'th' && <PoolTxTable tabs={tabsComponent} />}
        {activeTab === 'sb' && <SeniorBondsTable tabs={tabsComponent} />}
        {activeTab === 'jb' && <JuniorBondsTable tabs={tabsComponent} />}
      </section>
    </div>
  );
};

export default StatsView;