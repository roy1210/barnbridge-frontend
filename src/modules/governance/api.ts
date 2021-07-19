import BigNumber from 'bignumber.js';

import { PaginatedResult, UseFetchReturn, queryfy, useFetch } from 'hooks/useFetch';
import { useConfig } from 'providers/configProvider';

export enum APIProposalState {
  CREATED = 'CREATED',
  WARMUP = 'WARMUP',
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  ACCEPTED = 'ACCEPTED',
  QUEUED = 'QUEUED',
  GRACE = 'GRACE',
  EXPIRED = 'EXPIRED',
  EXECUTED = 'EXECUTED',
  ABROGATED = 'ABROGATED',
}

export enum APIProposalStateId {
  WARMUP = 0,
  ACTIVE,
  CANCELED,
  FAILED,
  ACCEPTED,
  QUEUED,
  GRACE,
  EXPIRED,
  EXECUTED,
  ABROGATED,
}

export const APIProposalStateMap = new Map<APIProposalState, string>([
  [APIProposalState.CREATED, 'Created'],
  [APIProposalState.WARMUP, 'Warm-Up'],
  [APIProposalState.ACTIVE, 'Voting'],
  [APIProposalState.CANCELED, 'Canceled'],
  [APIProposalState.FAILED, 'Failed'],
  [APIProposalState.ACCEPTED, 'Accepted'],
  [APIProposalState.QUEUED, 'Queued for execution'],
  [APIProposalState.GRACE, 'Pending execution'],
  [APIProposalState.EXPIRED, 'Expired'],
  [APIProposalState.EXECUTED, 'Executed'],
  [APIProposalState.ABROGATED, 'Abrogated'],
]);

export type APIOverview = {
  avgLockTimeSeconds: number;
  totalDelegatedPower: BigNumber;
  totalVbond: BigNumber;
  holders: number;
  holdersStakingExcluded: number;
  voters: number;
  barnUsers: number;
};

export function useFetchOverview(): UseFetchReturn<APIOverview> {
  const config = useConfig();
  const url = new URL(`/api/governance/overview`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data }) => ({
      ...data,
      totalDelegatedPower: BigNumber.from(data.totalDelegatedPower)?.unscaleBy(18),
      totalVbond: BigNumber.from(data.totalVbond)?.unscaleBy(18),
    }),
  });
}

export type APIVoterEntity = {
  address: string;
  bondStaked: BigNumber;
  lockedUntil: number;
  delegatedPower: BigNumber;
  votes: number;
  proposals: number;
  votingPower: BigNumber;
  hasActiveDelegation: boolean;
};

export function useFetchVoters(page: number = 1): UseFetchReturn<PaginatedResult<APIVoterEntity>> {
  const config = useConfig();
  const query = queryfy({
    limit: 10,
    page,
  });
  const url = new URL(`/api/governance/voters?${query}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data = [], meta }) => ({
      meta,
      data: data.map((item: APIVoterEntity) => ({
        ...item,
        bondStaked: BigNumber.from(item.bondStaked)?.unscaleBy(18), // bond decimals
        delegatedPower: BigNumber.from(item.delegatedPower)?.unscaleBy(18),
        votingPower: BigNumber.from(item.votingPower)?.unscaleBy(18),
      })),
    }),
  });
}

export type APILiteProposalEntity = {
  proposalId: number;
  proposer: string;
  title: string;
  description: string;
  createTime: number;
  state: APIProposalState;
  stateTimeLeft: number | null;
  forVotes: BigNumber;
  againstVotes: BigNumber;
};

export function useFetchProposals(
  page: number = 1,
  state?: string,
  search?: string,
): UseFetchReturn<PaginatedResult<APILiteProposalEntity>> {
  const config = useConfig();
  const query = queryfy({
    limit: 10,
    page,
    state,
    title: search,
  });

  const url = new URL(`/api/governance/proposals?${query}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data = [], meta }) => ({
      meta,
      data: data.map((item: APILiteProposalEntity) => ({
        ...item,
        forVotes: BigNumber.from(item.forVotes)?.unscaleBy(18),
        againstVotes: BigNumber.from(item.againstVotes)?.unscaleBy(18),
      })),
    }),
  });
}

export type APIProposalHistoryEntity = {
  name: string;
  startTimestamp: number;
  endTimestamp: number;
  txHash: string;
};

export type APIProposalEntity = APILiteProposalEntity & {
  blockTimestamp: number;
  warmUpDuration: number;
  activeDuration: number;
  queueDuration: number;
  gracePeriodDuration: number;
  minQuorum: number;
  acceptanceThreshold: number;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  history: APIProposalHistoryEntity[];
};

export function useFetchProposal(proposalId: number | undefined): UseFetchReturn<APIProposalEntity> {
  const config = useConfig();
  const url = new URL(`/api/governance/proposals/${proposalId}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data }) => ({
      ...data,
      forVotes: BigNumber.from(data.forVotes)?.unscaleBy(18),
      againstVotes: BigNumber.from(data.againstVotes)?.unscaleBy(18),
    }),
  });
}

export type APIVoteEntity = {
  address: string;
  power: BigNumber;
  support: boolean;
  blockTimestamp: number;
};

export function useFetchProposalVoters(
  proposalId: number,
  page: number = 1,
  support?: boolean,
): UseFetchReturn<PaginatedResult<APIVoteEntity>> {
  const config = useConfig();
  const query = queryfy({
    limit: 10,
    page,
    support,
  });

  const url = new URL(`/api/governance/proposals/${proposalId}/votes?${query}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data = [], meta }) => ({
      meta,
      data: data.map((item: APIVoteEntity) => ({
        ...item,
        power: BigNumber.from(item.power)?.unscaleBy(18),
      })),
    }),
  });
}

export type APIAbrogationEntity = {
  proposalId: number;
  caller: string;
  createTime: number;
  description: string;
  forVotes: BigNumber;
  againstVotes: BigNumber;
};

export function useFetchAbrogation(proposalId: number | undefined): UseFetchReturn<APIAbrogationEntity> {
  const config = useConfig();
  const url = new URL(`/api/governance/abrogation-proposals/${proposalId}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data }) => ({
      ...data,
      forVotes: BigNumber.from(data.forVotes)?.unscaleBy(18),
      againstVotes: BigNumber.from(data.againstVotes)?.unscaleBy(18),
    }),
  });
}

export type APIAbrogationVoteEntity = {
  address: string;
  power: BigNumber;
  support: boolean;
  blockTimestamp: number;
};

export function useFetchAbrogationVoters(
  proposalId: number,
  page: number = 1,
  support?: boolean,
): UseFetchReturn<PaginatedResult<APIAbrogationVoteEntity>> {
  const config = useConfig();
  const query = queryfy({
    limit: 10,
    page,
    support,
  });

  const url = new URL(`/api/governance/abrogation-proposals/${proposalId}/votes?${query}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data = [], meta }) => ({
      meta,
      data: data.map((item: APIAbrogationVoteEntity) => ({
        ...item,
        power: BigNumber.from(item.power)?.unscaleBy(18),
      })),
    }),
  });
}

export type APITreasuryToken = {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
};

export function useFetchTreasuryTokens(): UseFetchReturn<APITreasuryToken[]> {
  const config = useConfig();
  const url = new URL(
    `/api/governance/treasury/tokens?address=${config.contracts.dao?.governance}`,
    config.api.baseUrl,
  );

  return useFetch(url);
}

export type APITreasuryHistory = {
  accountAddress: string;
  accountLabel: string;
  counterpartyAddress: string;
  counterpartyLabel: string;
  amount: number;
  transactionDirection: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  transactionHash: string;
  blockTimestamp: number;
  blockNumber: number;
};

export function useFetchTreasuryHistory(
  page: number = 1,
  tokenFilter: string,
  directionFilter: string,
): UseFetchReturn<PaginatedResult<APITreasuryHistory>> {
  const config = useConfig();
  const query = queryfy({
    address: config.contracts.dao?.governance,
    limit: 10,
    page,
    tokenAddress: tokenFilter,
    transactionDirection: directionFilter,
  });

  const url = new URL(`/api/governance/treasury/transactions?${query}`, config.api.baseUrl);

  return useFetch(url, {
    transform: ({ data = [], meta }) => ({
      meta,
      data: data.map((item: APITreasuryHistory) => ({
        ...item,
        amount: Number(item.amount),
      })),
    }),
  });
}
