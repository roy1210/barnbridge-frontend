import { FC, Suspense, lazy, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';

import Tabs from 'components/antd/tabs';
import ExternalLink from 'components/custom/externalLink';
import Icon from 'components/custom/icon';
import { Spinner } from 'components/custom/spinner';
import { Text } from 'components/custom/typography';
import DAOProvider from 'modules/governance/providers/daoProvider';
import { useWallet } from 'wallets/walletProvider';

import VotingHeader from './components/voting-header';

import { injectProvider } from 'utils/component';

import s from './s.module.scss';

const OverviewView = lazy(() => import('./views/overview-view'));
const PortfolioView = lazy(() => import('./views/portfolio-view'));
const ProposalCreateView = lazy(() => import('./views/proposal-create-view'));
const ProposalDetailView = lazy(() => import('./views/proposal-detail-view'));
const ProposalsView = lazy(() => import('./views/proposals-view'));
const TreasuryView = lazy(() => import('./views/treasury-view'));

type RouteParams = {
  vt: string;
};

const GovernanceView: FC = injectProvider(() => {
  const history = useHistory();
  const {
    params: { vt = 'overview' },
  } = useRouteMatch<RouteParams>();

  const wallet = useWallet();

  const [activeTab, setActiveTab] = useState<string>(vt);

  function handleTabChange(tabKey: string) {
    if (tabKey) {
      setActiveTab(tabKey);
      history.push(`/governance/${tabKey}`);
    }
  }

  useEffect(() => {
    if (vt !== activeTab) {
      setActiveTab(vt);
    }
  }, [vt]);

  return (
    <div className="flex flow-row">
      {wallet.account && <VotingHeader />}

      <Tabs className={s.tabs} activeKey={activeTab} onChange={handleTabChange}>
        <Tabs.Tab
          key="overview"
          tab={
            <>
              <Icon name="bar-charts-outlined" /> Overview
            </>
          }
        />
        <Tabs.Tab
          key="portfolio"
          disabled={!wallet.account}
          tab={
            <>
              <Icon name="wallet-outlined" /> Portfolio
            </>
          }
        />
        <Tabs.Tab
          key="proposals"
          tab={
            <>
              <Icon name="proposal-outlined" /> Proposals
            </>
          }
        />
        <Tabs.Tab
          key="treasury"
          tab={
            <>
              <Icon name="treasury-outlined" /> Treasury
            </>
          }
        />
        <Tabs.Tab
          key="signal"
          tab={
            <ExternalLink href="https://signal.barnbridge.com/" style={{ color: 'inherit' }}>
              <div className="flex flow-col col-gap-8 align-center">
                <Icon name="chats-outlined" />
                <Text type="p1" weight="semibold">
                  Signal
                </Text>
                <Icon name="arrow-top-right" width={8} height={8} style={{ alignSelf: 'start', color: 'inherit' }} />
              </div>
            </ExternalLink>
          }
        />
        <Tabs.Tab
          key="forum"
          tab={
            <ExternalLink href="https://forum.barnbridge.com/" style={{ color: 'inherit' }}>
              <div className="flex flow-col col-gap-8 align-center">
                <Icon name="forum-outlined" />
                <Text type="p1" weight="semibold">
                  Forum
                </Text>
                <Icon name="arrow-top-right" width={8} height={8} style={{ alignSelf: 'start', color: 'inherit' }} />
              </div>
            </ExternalLink>
          }
        />
      </Tabs>
      <div className="content-container-fix content-container">
        <Suspense fallback={<Spinner />}>
          <Switch>
            <Route path="/governance/overview" exact component={OverviewView} />
            <Redirect exact from="/governance/portfolio" to="/governance/portfolio/deposit" />
            <Route path="/governance/portfolio/:action(\w+)" component={PortfolioView} />
            <Redirect exact from="/governance/treasury" to="/governance/treasury/holdings" />
            <Route path="/governance/treasury/:tab(\w+)" exact component={TreasuryView} />
            <Route path="/governance/proposals/create" exact component={ProposalCreateView} />
            <Route path="/governance/proposals/:id(\d+)" exact component={ProposalDetailView} />
            <Route path="/governance/proposals" exact component={ProposalsView} />
            <Redirect from="/governance" to="/governance/overview" />
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}, DAOProvider);

export default GovernanceView;
