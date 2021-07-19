import cn from 'classnames';

import { Text } from 'components/custom/typography';
import { FCx } from 'components/types.tx';
import { APIProposalState, APIProposalStateMap } from 'modules/governance/api';

import s from './s.module.scss';

type Props = {
  state: APIProposalState;
};

const ProposalStatusTag: FCx<Props> = props => {
  const { state, className } = props;

  return (
    <div className={cn(s.component, className, s[state])}>
      <Text type="lb2" weight="bold">
        {APIProposalStateMap.get(state)}
      </Text>
    </div>
  );
};

export default ProposalStatusTag;
