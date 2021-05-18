import React from 'react';
import BigNumber from 'bignumber.js';
import { AbiItem } from 'web3-utils';
import { getGasValue, getHumanValue, getNonHumanValue } from 'web3/utils';
import Web3Contract, { Web3ContractAbiItem, createAbiItem } from 'web3/web3Contract';

import { BondToken } from 'components/providers/known-tokens-provider';
import config from 'config';
import useMergeState from 'hooks/useMergeState';
import { useReload } from 'hooks/useReload';
import { useWallet } from 'wallets/wallet';

import DAO_BARN_ABI from './daoBarn.json';

import { getNowTs } from 'utils';

const Contract = new Web3Contract(DAO_BARN_ABI as Web3ContractAbiItem[], config.contracts.dao.barn, 'DAO Barn');

function loadCommonData(): Promise<any> {
  return Contract.batch([
    {
      method: 'bondStaked',
      transform: (value: string) => getHumanValue(new BigNumber(value), BondToken.decimals),
    },
  ]).then(([bondStaked]) => {
    return {
      bondStaked,
    };
  });
}

function loadUserData(userAddress?: string): Promise<any> {
  if (!userAddress) {
    return Promise.reject();
  }

  return Contract.batch([
    {
      method: 'balanceOf',
      methodArgs: [userAddress],
      transform: (value: string) => getHumanValue(new BigNumber(value), BondToken.decimals),
    },
    {
      method: 'votingPower',
      methodArgs: [userAddress],
      transform: (value: string) => getHumanValue(new BigNumber(value), BondToken.decimals),
    },
    {
      method: 'multiplierAtTs',
      methodArgs: [userAddress, getNowTs()],
      transform: (value: string) => getHumanValue(new BigNumber(value), BondToken.decimals)?.toNumber(),
    },
    {
      method: 'userLockedUntil',
      methodArgs: [userAddress],
      transform: (value: string) => Number(value) * 1_000,
    },
    {
      method: 'delegatedPower',
      methodArgs: [userAddress],
      transform: (value: string) => getHumanValue(new BigNumber(value), BondToken.decimals),
    },
    {
      method: 'userDelegatedTo',
      methodArgs: [userAddress],
    },
  ]).then(([balance, votingPower, multiplier, userLockedUntil, delegatedPower, userDelegatedTo]) => ({
    balance,
    votingPower,
    multiplier,
    userLockedUntil,
    delegatedPower,
    userDelegatedTo,
  }));
}

function bondStakedAtTsCall(timestamp: number): Promise<BigNumber | undefined> {
  return Contract.call('bondStakedAtTs', [timestamp], {}).then((value: string) =>
    getHumanValue(new BigNumber(value), BondToken.decimals),
  );
}

function votingPowerCall(address: string): Promise<BigNumber | undefined> {
  return Contract.call('votingPower', [address], {}).then((value: string) => getHumanValue(new BigNumber(value), 18));
}

function votingPowerAtTsCall(address: string, timestamp: number): Promise<BigNumber | undefined> {
  return Contract.call('votingPowerAtTs', [address, timestamp], {}).then((value: string) =>
    getHumanValue(new BigNumber(value), 18),
  );
}

function depositSend(amount: BigNumber, from: string, gasPrice: number): Promise<void> {
  return Contract.send('deposit', [getNonHumanValue(amount, 18)], {
    from,
    gasPrice: getGasValue(gasPrice),
  });
}

function withdrawSend(amount: BigNumber, from: string, gasPrice: number): Promise<void> {
  return Contract.send('withdraw', [getNonHumanValue(amount, 18)], {
    from,
    gasPrice: getGasValue(gasPrice),
  });
}

function delegateSend(to: string, from: string, gasPrice: number): Promise<void> {
  return Contract.send('delegate', [to], {
    from,
    gasPrice: getGasValue(gasPrice),
  });
}

function stopDelegateSend(from: string, gasPrice: number): Promise<void> {
  return Contract.send('stopDelegate', [], {
    from,
    gasPrice: getGasValue(gasPrice),
  });
}

function lockSend(timestamp: number, from: string, gasPrice: number): Promise<void> {
  return Contract.send('lock', [timestamp], {
    from,
    gasPrice: getGasValue(gasPrice),
  });
}

export type DAOBarnContractData = {
  contract: Web3Contract;
  activationThreshold?: BigNumber;
  bondStaked?: BigNumber;
  balance?: BigNumber;
  votingPower?: BigNumber;
  multiplier?: number;
  userLockedUntil?: number;
  delegatedPower?: BigNumber;
  userDelegatedTo?: string;
};

const InitialState: DAOBarnContractData = {
  contract: Contract,
  activationThreshold: new BigNumber(400_000),
  bondStaked: undefined,
  balance: undefined,
  votingPower: undefined,
  multiplier: undefined,
  userLockedUntil: undefined,
  delegatedPower: undefined,
  userDelegatedTo: undefined,
};

export type DAOBarnContract = DAOBarnContractData & {
  reload(): void;
  actions: {
    bondStakedAtTs(timestamp: number): Promise<BigNumber | undefined>;
    votingPower(address: string): Promise<BigNumber | undefined>;
    votingPowerAtTs(timestamp: number): Promise<BigNumber | undefined>;
    deposit(amount: BigNumber, gasPrice: number): Promise<any>;
    withdraw(amount: BigNumber, gasPrice: number): Promise<any>;
    delegate(to: string, gasPrice: number): Promise<any>;
    stopDelegate(gasPrice: number): Promise<any>;
    lock(timestamp: number, gasPrice: number): Promise<any>;
  };
};

export function useDAOBarnContract(): DAOBarnContract {
  const wallet = useWallet();

  const [state, setState] = useMergeState<DAOBarnContractData>(InitialState);
  const [reload, version] = useReload();

  React.useEffect(() => {
    setState({
      bondStaked: undefined,
    });

    loadCommonData().then(setState).catch(Error);
  }, [version, setState]);

  React.useEffect(() => {
    setState({
      balance: undefined,
      votingPower: undefined,
      multiplier: undefined,
      userLockedUntil: undefined,
      delegatedPower: undefined,
      userDelegatedTo: undefined,
    });

    loadUserData(wallet.account).then(setState).catch(Error);
  }, [wallet.account, version, setState]);

  return {
    ...state,
    reload,
    actions: {
      bondStakedAtTs(timestamp: number): Promise<BigNumber | undefined> {
        return bondStakedAtTsCall(timestamp);
      },
      votingPower(address: string): Promise<BigNumber | undefined> {
        return votingPowerCall(address);
      },
      votingPowerAtTs(timestamp: number): Promise<BigNumber | undefined> {
        return wallet.isActive ? votingPowerAtTsCall(wallet.account!, timestamp) : Promise.reject();
      },
      deposit(amount: BigNumber, gasPrice: number): Promise<void> {
        return wallet.isActive ? depositSend(amount, wallet.account!, gasPrice) : Promise.reject();
      },
      withdraw(amount: BigNumber, gasPrice: number): Promise<void> {
        return wallet.isActive ? withdrawSend(amount, wallet.account!, gasPrice) : Promise.reject();
      },
      delegate(to: string, gasPrice: number): Promise<void> {
        return wallet.isActive ? delegateSend(to, wallet.account!, gasPrice) : Promise.reject();
      },
      stopDelegate(gasPrice: number): Promise<void> {
        return wallet.isActive ? stopDelegateSend(wallet.account!, gasPrice) : Promise.reject();
      },
      lock(timestamp: number, gasPrice: number): Promise<void> {
        return wallet.isActive ? lockSend(timestamp, wallet.account!, gasPrice) : Promise.reject();
      },
    },
  };
}

const DaoBarnABI: AbiItem[] = [
  // call
  createAbiItem('bondStaked', [], ['uint256']),
  createAbiItem('balanceOf', ['address'], ['uint256']),
  createAbiItem('votingPower', ['address'], ['uint256']),
  createAbiItem('userLockedUntil', ['address'], ['uint256']),
  createAbiItem('delegatedPower', ['address'], ['uint256']),
  createAbiItem('userDelegatedTo', ['address'], ['address']),
  createAbiItem('bondStakedAtTs', ['uint256'], ['uint256']),
  createAbiItem('votingPowerAtTs', ['address', 'uint256'], ['uint256']),
  createAbiItem('multiplierAtTs', ['address', 'uint256'], ['uint256']),
  // send
  createAbiItem('deposit', ['uint256'], []),
  createAbiItem('withdraw', ['uint256'], []),
  createAbiItem('delegate', ['address'], []),
  createAbiItem('stopDelegate', [], []),
  createAbiItem('lock', ['uint256'], []),
];

class DaoBarnContract extends Web3Contract {
  constructor(address: string) {
    super(DaoBarnABI, address, 'DAO Barn');

    this.on(Web3Contract.UPDATE_ACCOUNT, () => {
      this.balance = undefined;
      this.votingPower = undefined;
      this.userLockedUntil = undefined;
      this.delegatedPower = undefined;
      this.userDelegatedTo = undefined;
    });
  }

  // common data
  bondStaked?: BigNumber;

  // user data
  balance?: BigNumber;
  votingPower?: BigNumber;
  userLockedUntil?: number;
  delegatedPower?: BigNumber;
  userDelegatedTo?: string;

  // computed data
  get isUserLocked(): boolean {
    return (this.userLockedUntil ?? 0) > Date.now() / 1_000;
  }

  async loadCommonData(): Promise<void> {
    const [bondStaked] = await this.batch([{ method: 'bondStaked' }]);

    this.bondStaked = new BigNumber(bondStaked);
    this.emit(Web3Contract.UPDATE_DATA);
  }

  async loadUserData(): Promise<void> {
    const account = this.account;
    this.assertAccount();

    const [balance, votingPower, userLockedUntil, delegatedPower, userDelegatedTo] = await this.batch([
      { method: 'balanceOf', methodArgs: [account] },
      { method: 'votingPower', methodArgs: [account] },
      { method: 'userLockedUntil', methodArgs: [account] },
      { method: 'delegatedPower', methodArgs: [account] },
      { method: 'userDelegatedTo', methodArgs: [account] },
    ]);

    this.balance = new BigNumber(balance);
    this.votingPower = new BigNumber(votingPower);
    this.userLockedUntil = Number(userLockedUntil);
    this.delegatedPower = new BigNumber(delegatedPower);
    this.userDelegatedTo = userDelegatedTo;
    this.emit(Web3Contract.UPDATE_DATA);
  }

  getBondStakedAtTs(timestamp: number): Promise<BigNumber> {
    return this.call('bondStakedAtTs', [timestamp]).then(value => new BigNumber(value));
  }

  getVotingPowerAtTs(address: string, timestamp: number): Promise<BigNumber> {
    return this.call('votingPowerAtTs', [address, timestamp]).then(value => new BigNumber(value));
  }

  getMultiplierAtTs(address: string, timestamp: number): Promise<BigNumber> {
    return this.call('votingPowerAtTs', [address, timestamp]).then(value => new BigNumber(value));
  }

  deposit(amount: BigNumber, gasPrice?: number): Promise<void> {
    return this.send('deposit', [amount], {}, gasPrice);
  }

  withdraw(amount: BigNumber, gasPrice?: number): Promise<void> {
    return this.send('withdraw', [amount], {}, gasPrice);
  }

  delegate(to: string, gasPrice?: number): Promise<void> {
    return this.send('delegate', [to], {}, gasPrice);
  }

  stopDelegate(gasPrice?: number): Promise<void> {
    return this.send('stopDelegate', [], {}, gasPrice);
  }

  lock(timestamp: number, gasPrice?: number): Promise<void> {
    return this.send('lock', [timestamp], {}, gasPrice);
  }
}

export default DaoBarnContract;
