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

  const [activeTab, setActiveTab] = useState<string>(tab);

  function handleTabChange(tabKey: string) {
    setActiveTab(tabKey);
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
            onClick: () => {
              handleTabChange('holdings');
            },
            children: 'Holdings',
          },
          {
            id: 'fees',
            onClick: () => {
              handleTabChange('fees');
            },
            children: 'Fees',
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
        <Route path="/governance/treasury/holdings" component={TreasuryHoldings} />
        <Route
          path="/governance/treasury/fees"
          render={() => (
            <SyAPIProvider>
              <TreasuryFees />
            </SyAPIProvider>
          )}
        />
      </Switch>
    </>
  );
};

export default TreasuryView;
