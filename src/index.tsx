import 'styles/index.scss';
import 'utils/bignumber';
import 'utils';
import 'web3/utils';

import { FC } from 'react';
import { render } from 'react-dom';
import { createProviderTreeFromList } from 'react-provider-tree';
import { BrowserRouter as Router } from 'react-router-dom';

import ErrorBoundary from 'components/custom/error-boundary';
import LayoutView from 'layout';
import ConfigProvider from 'providers/configProvider';
import ContractManagerProvider from 'providers/contractManagerProvider';
import GeneralProvider from 'providers/generalProvider';
import KnownTokensProvider from 'providers/knownTokensProvider';
import NetworkProvider from 'providers/networkProvider';
import NotificationsProvider from 'providers/notificationsProvider';
import Web3Provider from 'providers/web3Provider';
import { ReactComponent as StaticSprite } from 'resources/svg/static-sprite.svg';
import WalletProvider from 'wallets/walletProvider';

import { checkFlexGapSupport } from './checkFlexGap';
import * as sw from './serviceWorker';

const ProviderTree = createProviderTreeFromList(
  [GeneralProvider, {}],
  [NetworkProvider, {}],
  [ConfigProvider, {}],
  [WalletProvider, {}],
  [Web3Provider, {}],
  [ContractManagerProvider, {}],
  [KnownTokensProvider, {}],
  [NotificationsProvider, {}],
);

const App: FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <ProviderTree>
          <StaticSprite />
          <LayoutView />
        </ProviderTree>
      </Router>
    </ErrorBoundary>
  );
};

render(<App />, document.getElementById('root'));

sw.unregister();

document.body.addEventListener('mousedown', () => {
  document.body.classList.add('using-mouse');
});

document.body.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    document.body.classList.remove('using-mouse');
  }
});

if (checkFlexGapSupport()) {
  // document.documentElement.classList.add('flexbox-gap');
} else {
  document.documentElement.classList.add('no-flexbox-gap');
}
