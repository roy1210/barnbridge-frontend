import React from 'react';

import useMergeState from 'hooks/useMergeState';
import { APIVoteEntity, useFetchAbrogationVoters } from 'modules/governance/api';

import { useAbrogation } from '../AbrogationProvider';

import { InvariantContext } from 'utils/context';

type AbrogationVotersProviderState = {
  votes: APIVoteEntity[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  supportFilter?: boolean;
};

export type AbrogationVotersContextType = AbrogationVotersProviderState & {
  changeSupportFilter(supportFilter?: boolean): void;
  changePage(page: number): void;
};

const InitialState: AbrogationVotersProviderState = {
  votes: [],
  total: 0,
  page: 1,
  pageSize: 10,
  loading: false,
  supportFilter: undefined,
};

const Context = React.createContext<AbrogationVotersContextType>(InvariantContext('AbrogationVotersProvider'));

export function useAbrogationVoters(): AbrogationVotersContextType {
  return React.useContext(Context);
}

const AbrogationVotersProvider: React.FC = props => {
  const { children } = props;

  const { abrogation } = useAbrogation();
  const [state, setState] = useMergeState<AbrogationVotersProviderState>(InitialState);
  useFetchAbrogationVoters(abrogation?.proposalId ?? 0, state.page, state.supportFilter); /// TODO: DAO

  function changeSupportFilter(supportFilter?: boolean) {
    setState({
      supportFilter,
      page: 1,
    });
  }

  function changePage(page: number) {
    setState({ page });
  }

  return (
    <Context.Provider
      value={{
        ...state,
        changeSupportFilter,
        changePage,
      }}>
      {children}
    </Context.Provider>
  );
};

export default AbrogationVotersProvider;
