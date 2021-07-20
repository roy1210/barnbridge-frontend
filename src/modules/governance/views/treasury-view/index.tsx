import { FC, useEffect, useState } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';

import { Tabs } from 'components/custom/tabs';
import SyAPIProvider from 'modules/smart-yield/api';

import TreasuryFees from './treasury-fees';
import TreasuryHoldings from './treasury-holdings';

type RouteParams = {
  tab: string;
};

const TreasuryView: FC = () => {
  const {
    params: { tab = 'holdings' },
  } = useRouteMatch<RouteParams>();
  const history = useHistory();

  const [activeTab, setActiveTab] = useState(tab);

  function handleTabChange(tabKey: string) {
    // setActiveTab(tabKey);
    history.push(`/governance/treasury/${tabKey}`);
  }

  useEffect(() => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);

  return (
    <>
      <Tabs
        tabs={[
          {
            id: 'holdings',
            children: 'Holdings',
            onClick: () => {
              handleTabChange('holdings');
            },
          },
          {
            id: 'fees',
            children: 'Fees',
            onClick: () => {
              handleTabChange('fees');
            },
          },
        ]}
        activeKey={activeTab}
        onClick={setActiveTab}
        variation="elastic"
        className="mb-40"
        style={{
          width: 248,
          height: 40,
        }}
      />
      <Switch>
        <Route path="/governance/treasury/holdings" exact component={TreasuryHoldings} />
        <Route path="/governance/treasury/fees" exact component={TreasuryFees} />
      </Switch>
    </>
  );
};

export default TreasuryView;
