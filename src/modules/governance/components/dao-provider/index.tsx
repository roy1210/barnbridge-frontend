import React, { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import ContractListener from 'web3/components/contract-listener';
import Erc20Contract from 'web3/erc20Contract';
import { ZERO_BIG_NUMBER } from 'web3/utils';
import Web3Contract from 'web3/web3Contract';

import { BondToken } from 'components/providers/known-tokens-provider';
import config from 'config';
import useMergeState from 'hooks/useMergeState';
import { useReload } from 'hooks/useReload';
import DaoBarnContract, { DAOBarnContract, useDAOBarnContract } from 'modules/governance/contracts/daoBarn';
import DaoGovernanceContract, {
  DAOGovernanceContract,
  useDAOGovernanceContract,
} from 'modules/governance/contracts/daoGovernance';
import DaoRewardContract from 'modules/governance/contracts/daoReward';
import { useWallet } from 'wallets/wallet';

import { APIProposalStateId } from '../../api';

export type DAOProviderState = {
  minThreshold: number;
  isActive?: boolean;
  bondStaked?: BigNumber;
  activationThreshold?: BigNumber;
  activationRate?: number;
  thresholdRate?: number;
};

const InitialState: DAOProviderState = {
  minThreshold: 1,
  isActive: undefined,
  bondStaked: undefined,
  activationThreshold: undefined,
  activationRate: undefined,
  thresholdRate: undefined,
};

type DAOContextType = DAOProviderState & {
  daoGovernance: DAOGovernanceContract;
  daoBarn: DAOBarnContract;
  newDaoBarn: DaoBarnContract;
  daoReward: DaoRewardContract;
  actions: {
    activate: () => Promise<void>;
    hasActiveProposal: () => Promise<boolean>;
    hasThreshold(): boolean | undefined;
  };
};

const DAOContext = React.createContext<DAOContextType>({
  ...InitialState,
  daoGovernance: undefined as any,
  daoBarn: undefined as any,
  daoReward: undefined as any,
  newDaoBarn: undefined as any,
  actions: {
    activate: Promise.reject,
    hasActiveProposal: Promise.reject,
    hasThreshold: () => undefined,
  },
});

export function useDAO(): DAOContextType {
  return React.useContext(DAOContext);
}

const DAOProvider: React.FC = props => {
  const { children } = props;

  const [reload] = useReload();
  const walletCtx = useWallet();

  const daoBarn = useDAOBarnContract();
  const daoGovernance = useDAOGovernanceContract();
  const daoRewardContract = useMemo(() => {
    const contract = new DaoRewardContract(config.contracts.dao.reward);
    contract.on(Web3Contract.UPDATE_DATA, reload);
    contract.loadCommonData().catch(Error);
    return contract;
  }, []);
  const daoBarnContract = useMemo(() => {
    const contract = new DaoBarnContract(config.contracts.dao.barn);
    contract.on(Web3Contract.UPDATE_DATA, reload);
    contract.loadCommonData().catch(Error);
    return contract;
  }, []);
  const daoGovernanceContract = useMemo(() => {
    const contract = new DaoGovernanceContract(config.contracts.dao.governance);
    contract.on(Web3Contract.UPDATE_DATA, reload);
    contract.loadCommonData().catch(Error);
    return contract;
  }, []);

  // console.log(daoRewardContract, daoBarnContract, daoGovernanceContract);

  const [state, setState] = useMergeState<DAOProviderState>(InitialState);

  React.useEffect(() => {
    daoBarn.contract.setProvider(walletCtx.provider);
    daoGovernance.contract.setProvider(walletCtx.provider);
    daoRewardContract.setProvider(walletCtx.provider);
    daoBarnContract.setProvider(walletCtx.provider);
    daoGovernanceContract.setProvider(walletCtx.provider);
  }, [walletCtx.provider]);

  React.useEffect(() => {
    const bondContract = BondToken.contract as Erc20Contract;

    bondContract.setAccount(walletCtx.account); // ?
    daoBarn.contract.setAccount(walletCtx.account);
    daoGovernance.contract.setAccount(walletCtx.account);
    daoRewardContract.setAccount(walletCtx.account);
    daoBarnContract.setAccount(walletCtx.account);
    daoGovernanceContract.setAccount(walletCtx.account);

    if (walletCtx.account) {
      bondContract.loadAllowance(config.contracts.dao.barn).catch(Error);
      daoRewardContract.loadUserData().catch(Error);
      daoBarnContract.loadUserData().catch(Error);
      daoGovernanceContract.loadUserData().catch(Error);
    }
  }, [walletCtx.account]);

  React.useEffect(() => {
    const { isActive } = daoGovernance;
    const { bondStaked, activationThreshold, votingPower } = daoBarn;

    let activationRate: number | undefined;

    if (bondStaked && activationThreshold?.gt(ZERO_BIG_NUMBER)) {
      activationRate = bondStaked.multipliedBy(100).div(activationThreshold).toNumber();
      activationRate = Math.min(activationRate, 100);
    }

    let thresholdRate: number | undefined;

    if (votingPower && bondStaked?.gt(ZERO_BIG_NUMBER)) {
      thresholdRate = votingPower.multipliedBy(100).div(bondStaked).toNumber();
      thresholdRate = Math.min(thresholdRate, 100);
    }

    setState({
      isActive,
      bondStaked,
      activationThreshold,
      activationRate,
      thresholdRate,
    });
  }, [daoGovernance.isActive, daoBarn.bondStaked, daoBarn.activationThreshold, daoBarn.votingPower]);

  function activate() {
    return daoGovernance.actions.activate().then(() => {
      daoGovernance.reload();
      daoBarn.reload();
    });
  }

  function hasActiveProposal(): Promise<boolean> {
    return daoGovernance.actions.getLatestProposalId().then(proposalId => {
      if (!proposalId) {
        return Promise.resolve(false);
      }

      return daoGovernance.actions.getProposalState(proposalId).then(proposalState => {
        return ![
          APIProposalStateId.CANCELED,
          APIProposalStateId.EXECUTED,
          APIProposalStateId.FAILED,
          APIProposalStateId.EXPIRED,
          APIProposalStateId.ABROGATED,
        ].includes(proposalState as any);
      });
    });
  }

  function hasThreshold(): boolean | undefined {
    if (state.thresholdRate === undefined) {
      return undefined;
    }

    return state.thresholdRate >= state.minThreshold;
  }

  return (
    <DAOContext.Provider
      value={{
        ...state,
        daoBarn,
        newDaoBarn: daoBarnContract,
        daoReward: daoRewardContract,
        daoGovernance,
        actions: {
          activate,
          hasThreshold,
          hasActiveProposal,
        },
      }}>
      {children}
      <ContractListener contract={daoGovernance.contract} />
      <ContractListener contract={daoBarn.contract} />
      <ContractListener contract={daoRewardContract} />
      <ContractListener contract={daoBarnContract} />
      <ContractListener contract={daoGovernanceContract} />
    </DAOContext.Provider>
  );
};

export default DAOProvider;
