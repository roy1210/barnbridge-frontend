import { FC, createContext, useContext, useMemo } from 'react';

import { useContractFactory } from 'hooks/useContract';
import DaoBarnContract from 'modules/governance/contracts/daoBarn';
import DaoGovernanceContract from 'modules/governance/contracts/daoGovernance';
import DaoRewardContract from 'modules/governance/contracts/daoReward';
import { useConfig } from 'providers/configProvider';

import { InvariantContext } from 'utils/context';
import Web3Contract from 'web3/web3Contract';
import { useReload } from 'hooks/useReload';

type DAOContextType = {
  daoBarn: DaoBarnContract;
  daoGovernance: DaoGovernanceContract;
  daoReward: DaoRewardContract;
  isActive: boolean | undefined;
  minThresholdRate: number;
  activationThreshold: number;
  activationRate: number;
  thresholdRate: number | undefined;
};

const Context = createContext<DAOContextType>(InvariantContext('DAOProvider'));

export function useDAO(): DAOContextType {
  return useContext(Context);
}

const DAOProvider: FC = props => {
  const config = useConfig();
  const [reload, version] = useReload();

  const { getOrCreateContract, Listeners } = useContractFactory();

  const daoBarn = getOrCreateContract(
    config.contracts.dao?.barn!,
    () => {
      return new DaoBarnContract(config.contracts.dao?.barn!);
    },
    {
      afterInit: contract => {
        contract.on(Web3Contract.UPDATE_DATA, reload);
        contract.loadCommonData().catch(Error);
        contract.loadUserData().catch(Error);
      },
    },
  );

  const daoGovernance = getOrCreateContract(
    config.contracts.dao?.governance!,
    () => {
      return new DaoGovernanceContract(config.contracts.dao?.governance!);
    },
    {
      afterInit: contract => {
        contract.on(Web3Contract.UPDATE_DATA, reload);
        contract.loadCommonData().catch(Error);
        contract.loadUserData().catch(Error);
      },
    },
  );

  const daoReward = getOrCreateContract(
    config.contracts.dao?.reward!,
    () => {
      return new DaoRewardContract(config.contracts.dao?.reward!);
    },
    {
      afterInit: contract => {
        contract.on(Web3Contract.UPDATE_DATA, reload);
        contract.loadCommonData().catch(Error);
        contract.loadUserData().catch(Error);
      },
    },
  );

  const activationThreshold = config.dao?.activationThreshold ?? 0;
  const minThresholdRate = config.dao?.minThresholdRate ?? 0;

  const activationRate = useMemo(() => {
    if (activationThreshold === 0 || !daoBarn.bondStaked) {
      return 0;
    }

    const rate = daoBarn.bondStaked.div(activationThreshold).multipliedBy(100);

    return Math.min(rate.toNumber(), 100);
  }, [daoBarn.bondStaked, activationThreshold, version]);

  const thresholdRate = useMemo(() => {
    if (!daoBarn.votingPower || !daoBarn.bondStaked?.gt(0)) {
      return undefined;
    }

    const rate = daoBarn.votingPower.div(daoBarn.bondStaked).multipliedBy(100);

    return Math.min(rate.toNumber(), 100);
  }, [daoBarn.bondStaked, daoBarn.votingPower, version]);

  const value: DAOContextType = {
    daoBarn,
    daoReward,
    daoGovernance,
    isActive: daoGovernance.isActive,
    minThresholdRate,
    activationThreshold,
    activationRate,
    thresholdRate,
  };

  return (
    <Context.Provider value={value}>
      {props.children}
      {Listeners}
    </Context.Provider>
  );
};

export default DAOProvider;
