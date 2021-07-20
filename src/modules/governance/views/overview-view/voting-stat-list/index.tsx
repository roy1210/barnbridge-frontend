import { FC, ReactNode } from 'react';
import classnames from 'classnames';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken, formatUSD } from 'web3/utils';

import ExternalLink from 'components/custom/externalLink';
import { Hint, Text } from 'components/custom/typography';
import { FCx } from 'components/types.tx';
import { useWeb3Contract } from 'hooks/useContract';
import { UseLeftTime } from 'hooks/useLeftTime';
import { useFetchOverview } from 'modules/governance/api';
import { useDAO } from 'modules/governance/providers/daoProvider';
import { ProjectToken, useTokens } from 'providers/tokensProvider';

import { getFormattedDuration } from 'utils';

import s from './s.module.scss';

type VotingStatCardProps = {
  label: ReactNode;
  labelHint?: ReactNode;
  content: ReactNode;
  extra?: ReactNode;
};

const VotingStatCard: FC<VotingStatCardProps> = props => {
  const { label, labelHint, content, extra } = props;

  return (
    <div className="card p-24">
      <div className="flex flow-row row-gap-48">
        <Hint text={labelHint ? <Text type="p2">{labelHint}</Text> : undefined}>
          <Text type="lb2" weight="semibold" color="red">
            {label}
          </Text>
        </Hint>
        <div className="flex flow-row row-gap-4">
          <div className="flex flow-col align-end">{content}</div>
          {extra && (
            <Text type="p1" color="secondary">
              {extra}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

const VotingStatList: FCx = props => {
  const { className } = props;

  const { getAmountInUSD } = useTokens();
  const { daoBarn, daoReward } = useDAO();
  const { data: overview } = useFetchOverview();

  const projectContract = useWeb3Contract(() => new Erc20Contract([], ProjectToken.address), {
    afterInit: contract => {
      contract.loadCommon().catch(Error);
    },
  });

  return (
    <div className={classnames(s.cards, className)}>
      <VotingStatCard
        label={`${ProjectToken.symbol} Staked`}
        labelHint={
          <>This number shows the amount of ${ProjectToken.symbol} (and their USD value) currently staked in the DAO.</>
        }
        content={
          <>
            <Text type="h2" weight="bold" color="primary" className="mr-4">
              {formatToken(daoBarn.bondStaked)}
            </Text>
            <Text type="p1" color="secondary">
              {ProjectToken.symbol}
            </Text>
          </>
        }
        extra={formatUSD(getAmountInUSD(daoBarn.bondStaked, ProjectToken.symbol))}
      />

      <VotingStatCard
        label={`v${ProjectToken.symbol}`}
        labelHint={
          <div className="flex flow-row row-gap-8 align-start">
            <Text type="p2">
              This number shows the amount of v{ProjectToken.symbol} currently minted. This number may differ from the
              amount of ${ProjectToken.symbol} staked because of the multiplier mechanic
            </Text>
            <ExternalLink
              href="https://integrations.barnbridge.com/specs/dao-specifications#multiplier-and-voting-power"
              className="link-blue"
              style={{ fontWeight: 600 }}>
              Learn more
            </ExternalLink>
          </div>
        }
        content={
          <Text type="h2" weight="bold" color="primary">
            {formatToken(overview?.totalVbond)}
          </Text>
        }
      />

      <VotingStatCard
        label="Avg. Lock Time"
        labelHint={
          <div className="flex flow-row row-gap-8 align-start">
            <Text type="p2">
              This counter shows the average amount of time ${ProjectToken.symbol} stakers locked their deposits in
              order to take advantage of the voting power bonus.
            </Text>
            <ExternalLink
              href="https://integrations.barnbridge.com/specs/dao-specifications#users-can-lock-bond-for-vbond"
              className="link-blue"
              style={{ fontWeight: 600 }}>
              Learn more
            </ExternalLink>
          </div>
        }
        content={
          <Text type="h2" weight="bold" color="primary">
            {overview?.avgLockTimeSeconds ? getFormattedDuration(overview?.avgLockTimeSeconds) : '-'}
          </Text>
        }
        extra="average time"
      />

      <VotingStatCard
        label={`${ProjectToken.symbol} Rewards`}
        labelHint={
          <>
            This number shows the ${ProjectToken.symbol} token rewards distributed so far out of the total of{' '}
            {formatToken(daoReward.pullFeature?.totalAmount)} that are going to be available for the DAO Staking.
          </>
        }
        content={
          <UseLeftTime end={(daoReward.pullFeature?.endTs ?? 0) * 1000} delay={5_000}>
            {() => (
              <Text type="h2" weight="bold" color="primary">
                {formatToken(daoReward.bondRewards)}
              </Text>
            )}
          </UseLeftTime>
        }
        extra={<>out of {formatToken(daoReward.pullFeature?.totalAmount)}</>}
      />

      <VotingStatCard
        label="Delegated"
        labelHint={
          <div className="flex flow-row row-gap-8 align-start">
            <Text type="p2">
              This number shows the amount of v{ProjectToken.symbol} that is delegated to other addresses.
            </Text>
            <ExternalLink
              href="https://integrations.barnbridge.com/specs/dao-specifications#users-can-delegate-vbond-to-other-users"
              className="link-blue"
              style={{ fontWeight: 600 }}>
              Learn more
            </ExternalLink>
          </div>
        }
        content={
          <Text type="h2" weight="bold" color="primary">
            {formatToken(overview?.totalDelegatedPower)}
          </Text>
        }
        extra={<>out of {formatToken(projectContract.totalSupply?.unscaleBy(ProjectToken.decimals))}</>}
      />

      <VotingStatCard
        label="Addresses"
        labelHint={
          <>
            This card shows the number of holders of ${ProjectToken.symbol} and compares it to the number of stakers and
            voters in the DAO.
          </>
        }
        content={
          <>
            <Text type="h2" weight="bold" color="primary" className="mr-4">
              {overview?.holdersStakingExcluded}
            </Text>
            <Text type="p1" color="secondary">
              holders
            </Text>
          </>
        }
        extra={
          <>
            {overview?.barnUsers} stakers & {overview?.voters} voters
          </>
        }
      />
    </div>
  );
};

export default VotingStatList;
