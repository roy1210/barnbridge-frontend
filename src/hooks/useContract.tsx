import React, { ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import useDebounce from '@rooks/use-debounce';
import isEqual from 'lodash/isEqual';
import ContractListener from 'web3/components/contract-listener';
import Erc20Contract from 'web3/erc20Contract';
import Web3Contract from 'web3/web3Contract';

import { useContractManager } from 'providers/contractManagerProvider';
import { useWeb3 } from 'providers/web3Provider';
// import { getTokenByAddress } from 'components/providers/known-tokens-provider';
import { useWallet } from 'wallets/walletProvider';

import { useReload } from './useReload';

function useDeepCompareMemoize(value: any): typeof value {
  const ref = useRef();

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

export const useContract = (
  address: string | undefined,
  {
    loadBalance,
    loadCommon,
    loadAllowance,
  }: { loadBalance?: boolean; loadCommon?: boolean; loadAllowance?: string[] } = {},
): Erc20Contract | null => {
  const { provider, account } = useWallet();
  const [reload] = useReload();
  const { getContract } = useContractManager();

  const contract = useMemo(() => {
    if (!address) {
      return null;
    }

    const contract: Erc20Contract = getContract<Erc20Contract>(address, () => {
      return new Erc20Contract([], address);
    }); // (getTokenByAddress(address)?.contract as Erc20Contract) ?? new Erc20Contract([], address);
    contract.on(Web3Contract.UPDATE_DATA, reload);

    return contract;
  }, [address, provider, reload]);

  useEffect(() => {
    if (contract && loadBalance) {
      contract.setAccount(account);
      contract.loadBalance();
    }
  }, [contract, loadBalance, account]);

  useEffect(() => {
    if (contract && loadCommon) {
      contract
        .loadCommon()
        .then(() => reload())
        .catch(Error);
    }
  }, [contract, loadCommon, reload]);

  const memoisedAllowance = useDeepCompareMemoize(loadAllowance);

  useEffect(() => {
    if (contract && memoisedAllowance) {
      if (Array.isArray(memoisedAllowance)) {
        memoisedAllowance.forEach(i => contract.loadAllowance(i));
      } else {
        contract.loadAllowance(memoisedAllowance);
      }
    }
  }, [contract, memoisedAllowance]);

  return contract;
};

export type UseContractOptions<T extends Web3Contract> = {
  afterInit?: (contract: T) => void;
};

export type UseContractFactoryType = {
  getContract<T extends Web3Contract>(address: string, factory: () => T, options?: UseContractOptions<T>): T;
  Listeners: ReactElement | null;
};

type CachedContractType = {
  address: string;
  factory: () => Web3Contract;
  options?: UseContractOptions<Web3Contract>;
  instance: Web3Contract;
};

export type UseContractFactoryOptions = {
  listeners?: boolean;
};

export function useContractFactory(options?: UseContractFactoryOptions): UseContractFactoryType {
  const { listeners = true } = options ?? {};
  const { account, initialized, event: walletEvent } = useWallet();
  const { activeProvider, event: web3Event } = useWeb3();

  const contractsRef = useRef<Map<string, CachedContractType>>(new Map());
  const [reload, version] = useReload();

  const createContract = useCallback(
    (address: string, factory: () => Web3Contract, options?: UseContractOptions<Web3Contract>): Web3Contract => {
      const contract = factory();
      contract.setProvider(activeProvider);
      contract.setCallProvider(activeProvider);
      contract.setAccount(account);

      contractsRef.current.set(address, {
        address,
        factory,
        options,
        instance: contract,
      });

      options?.afterInit?.(contract);
      reload();

      return contract;
    },
    [activeProvider, account, initialized],
  );

  const updateContracts = useDebounce(() => {
    contractsRef.current.forEach(meta => {
      createContract(meta.address, meta.factory, meta.options);
    });
  }, 250);

  useEffect(() => {
    walletEvent.on('UPDATE_ACCOUNT', updateContracts);
    web3Event.on('UPDATE_PROVIDER', updateContracts);

    return () => {
      walletEvent.off('UPDATE_ACCOUNT', updateContracts);
      web3Event.off('UPDATE_PROVIDER', updateContracts);
    };
  }, [updateContracts]);

  const getContract = useCallback(
    (address: string, factory: () => Web3Contract, options?: UseContractOptions<Web3Contract>): Web3Contract => {
      let contract: Web3Contract;

      if (contractsRef.current.has(address)) {
        contract = contractsRef.current.get(address)!.instance;
      } else {
        contract = createContract(address, factory, options);
      }

      return contract;
    },
    [createContract],
  );

  const Listeners = useMemo(
    () =>
      listeners ? (
        <>
          {Array.from(contractsRef.current).map(([key, value]) => (
            <ContractListener key={key} contract={value.instance} />
          ))}
        </>
      ) : null,
    [version, listeners],
  );

  return {
    getContract: getContract as any,
    Listeners,
  };
}

export function useWeb3Contract<T extends Web3Contract>(factory: () => T, options?: UseContractOptions<T>): T {
  return useContractFactory({ listeners: false }).getContract<T>('$address', factory, options);
}
