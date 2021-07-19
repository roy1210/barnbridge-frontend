import { FC, createContext, useContext, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import BigNumber from 'bignumber.js';

import useMergeState from 'hooks/useMergeState';
import { useReload } from 'hooks/useReload';
import { APIAbrogationEntity, useFetchAbrogation } from 'modules/governance/api';
import { AbrogationProposalReceipt } from 'modules/governance/contracts/daoGovernance';
import { useDAO } from 'modules/governance/providers/daoProvider';
import { useProposal } from 'modules/governance/providers/proposalProvider';
import { useWallet } from 'wallets/walletProvider';

import { InvariantContext } from 'utils/context';

export type AbrogationProviderState = {
  abrogation?: APIAbrogationEntity;
  forRate?: number;
  againstRate?: number;
  acceptanceThreshold?: number;
  approvalRate?: number;
  votingPower?: BigNumber;
  receipt?: AbrogationProposalReceipt;
};

const InitialState: AbrogationProviderState = {
  acceptanceThreshold: 50,
};

export type AbrogationContextType = AbrogationProviderState & {
  reload(): void;
  abrogationProposalCastVote(support: boolean, gasPrice: number): Promise<void>;
  abrogationProposalCancelVote(gasPrice: number): Promise<void>;
};

const Context = createContext<AbrogationContextType>(InvariantContext('AbrogationProvider'));

export function useAbrogation(): AbrogationContextType {
  return useContext(Context);
}

const AbrogationProvider: FC = props => {
  const { children } = props;

  const history = useHistory();
  const [reload, version] = useReload();
  const wallet = useWallet();
  const daoCtx = useDAO();
  const { proposal } = useProposal();
  const { data, error } = useFetchAbrogation(proposal?.proposalId ?? 0); /// TODO: DAO

  const [state, setState] = useMergeState<AbrogationProviderState>(InitialState);

  useEffect(() => {
    /// TODO: DAO
    // if (status === 404) {
    //   Antd.notification.error({
    //     message: `Proposal with id=${proposal.proposalId} doesn't exist.`,
    //   });
    // } else {
    //   Antd.notification.error({
    //     message: `Failed to fetch proposal with id=${proposal.proposalId}. (Status: ${status})`,
    //   });
    // }
    //
    // history.push(`/governance/proposals/${proposal.proposalId}`);
  }, [error]);

  useEffect(() => {
    setState({
      forRate: undefined,
      againstRate: undefined,
    });

    if (!state.abrogation) {
      return;
    }

    const { forVotes, againstVotes, createTime } = state.abrogation;
    const total = forVotes.plus(againstVotes);

    let forRate = 0;
    let againstRate = 0;

    if (total.gt(BigNumber.ZERO)) {
      forRate = forVotes.multipliedBy(100).div(total).toNumber();
      againstRate = againstVotes.multipliedBy(100).div(total).toNumber();
    }

    setState({
      forRate,
      againstRate,
    });

    daoCtx.daoBarn.getBondStakedAtTs(createTime - 1).then(bondStakedAt => {
      let approvalRate: number | undefined;

      if (bondStakedAt?.gt(BigNumber.ZERO)) {
        approvalRate = forVotes.multipliedBy(100).div(bondStakedAt).toNumber();
        approvalRate = Math.min(approvalRate!, 100);
      }

      setState({
        approvalRate,
      });
    });
  }, [state.abrogation]);

  useEffect(() => {
    setState({
      approvalRate: undefined,
    });

    if (!state.abrogation || !wallet.account) {
      return;
    }

    const { proposalId, createTime } = state.abrogation;

    daoCtx.daoBarn.getVotingPowerAtTs(wallet.account, createTime - 1).then(votingPower => {
      setState({
        votingPower,
      });
    });

    daoCtx.daoGovernance.getAbrogationProposalReceipt(proposalId, wallet.account!).then(receipt => {
      setState({
        receipt,
      });
    });
  }, [state.abrogation, wallet.account]);

  function abrogationProposalCastVote(support: boolean, gasPrice: number): Promise<void> {
    return proposal?.proposalId
      ? daoCtx.daoGovernance.abrogationProposalCastVote(proposal?.proposalId, support, gasPrice).then(() => reload())
      : Promise.reject();
  }

  function abrogationProposalCancelVote(gasPrice: number): Promise<void> {
    return proposal?.proposalId
      ? daoCtx.daoGovernance.abrogationProposalCancelVote(proposal?.proposalId, gasPrice).then(() => reload())
      : Promise.reject();
  }

  return (
    <Context.Provider
      value={{
        ...state,
        reload,
        abrogationProposalCastVote,
        abrogationProposalCancelVote,
      }}>
      {children}
    </Context.Provider>
  );
};

export default AbrogationProvider;
