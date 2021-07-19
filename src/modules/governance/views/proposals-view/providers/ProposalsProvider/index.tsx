import { FC, createContext, useContext, useState } from 'react';

import { APILiteProposalEntity, useFetchProposals } from 'modules/governance/api';

import { InvariantContext } from 'utils/context';

export type LiteProposalEntity = APILiteProposalEntity & {
  stateTimeLeftTs: number;
};

type ContextType = {
  proposals: LiteProposalEntity[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  stateFilter: string | undefined;
  searchFilter: string | undefined;
  changeStateFilter(stateFilter: string): void;
  changeSearchFilter(searchFilter: string): void;
  changePage(page: number): void;
};

const Context = createContext<ContextType>(InvariantContext('ProposalsProvider'));

export function useProposals(): ContextType {
  return useContext(Context);
}

const ProposalsProvider: FC = props => {
  const { children } = props;

  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const [searchFilter, setSearchFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, loading } = useFetchProposals(page, stateFilter, searchFilter);
  const proposals = data?.data.map(item => ({
    ...item,
    stateTimeLeftTs: Date.now() + (item.stateTimeLeft ?? 0) * 1_000,
  }));
  const totalProposals = data?.meta.count ?? 0;

  function changeStateFilter(value: string) {
    setStateFilter(value);
  }

  function changeSearchFilter(value: string) {
    setSearchFilter(value);
  }

  function changePage(page: number) {
    setPage(page);
  }

  const value: ContextType = {
    loading,
    proposals: proposals as LiteProposalEntity[],
    total: totalProposals,
    stateFilter,
    searchFilter,
    pageSize: 10,
    page,
    changeStateFilter,
    changeSearchFilter,
    changePage,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default ProposalsProvider;
