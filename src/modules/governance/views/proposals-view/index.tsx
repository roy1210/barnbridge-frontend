import { FC, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import AntdSpin from 'antd/lib/spin';

import Popover from 'components/antd/popover';
import ExternalLink from 'components/custom/externalLink';
import Grid from 'components/custom/grid';
import Icon from 'components/custom/icon';
import { Text } from 'components/custom/typography';
import { APIProposalStateId } from 'modules/governance/api';
import { useDAO } from 'modules/governance/providers/daoProvider';
import { ProjectToken } from 'providers/tokensProvider';
import { useWallet } from 'wallets/walletProvider';

import ActivationThreshold from '../overview-view/activation-threshold';
import ProposalsTable from './components/proposals-table';

const ProposalsView: FC = () => {
  const history = useHistory();
  const { daoGovernance, isActive, thresholdRate, minThresholdRate } = useDAO();
  const wallet = useWallet();

  const [whyReasonVisible, showWhyReason] = useState(false);
  const [hasActiveProposal, setHasActiveProposal] = useState<boolean | undefined>();

  useEffect(() => {
    (async () => {
      if (!wallet.account) {
        return;
      }

      const latestProposalId = await daoGovernance.getLatestProposalIds(wallet.account);
      console.log({ latestProposalId });

      if (!latestProposalId) {
        return;
      }

      const latestProposalState = await daoGovernance.getState(latestProposalId);
      console.log({ latestProposalState });
      if (!latestProposalState) {
        return;
      }

      const isCompleted = [
        APIProposalStateId.CANCELED,
        APIProposalStateId.EXECUTED,
        APIProposalStateId.FAILED,
        APIProposalStateId.EXPIRED,
        APIProposalStateId.ABROGATED,
      ].includes(latestProposalState as any);

      setHasActiveProposal(!isCompleted);
    })();
  }, []);

  const hasThreshold = thresholdRate >= minThresholdRate;
  const hasCreateRestrictions = hasActiveProposal !== undefined && hasThreshold;
  const canCreateProposal = hasActiveProposal === false && hasThreshold;

  function handleBackClick() {
    history.push('/governance/overview');
  }

  if (isActive === undefined) {
    return <AntdSpin />;
  }

  if (!isActive) {
    return (
      <Grid flow="row" gap={24} align="start">
        <button type="button" onClick={handleBackClick} className="button-text">
          <Icon name="arrow-back" width={16} height={16} className="mr-8" color="inherit" />
          Overview
        </button>
        <ActivationThreshold className="full-width" />
      </Grid>
    );
  }

  return (
    <div className="flex flow-row row-gap-32">
      <div className="flex flow-col align-center justify-space-between">
        <Text type="h1" weight="bold" color="primary">
          Proposals
        </Text>
        {wallet.isActive && (
          <div className="flex flow-row row-gap-8 align-end justify-end">
            <button
              type="button"
              className="button-primary"
              disabled={!canCreateProposal}
              onClick={() => history.push('proposals/create')}>
              Create proposal
            </button>

            {hasCreateRestrictions && !canCreateProposal && (
              <div className="flex flow-col col-gap-8 align-center">
                <Text type="small" weight="semibold" color="secondary">
                  You are not able to create a proposal.
                </Text>
                <Popover
                  title="Why you can’t create a proposal"
                  placement="bottomLeft"
                  overlayStyle={{ width: 520 }}
                  content={
                    <div className="flex flow-row row-gap-8">
                      <Text type="p2" weight="semibold">
                        There are 2 possible reasons for why you can’t create a proposal:
                      </Text>
                      <ul>
                        <li>
                          <Text type="p2" weight="semibold">
                            You already are the creator of an ongoing proposal
                          </Text>
                        </li>
                        <li>
                          <Text type="p2" weight="semibold">
                            You don’t have enough voting power to create a proposal. The creator of a proposal needs to
                            have a voting power of at least {minThresholdRate}% of the amount of ${ProjectToken.symbol}{' '}
                            staked in the DAO.
                          </Text>
                        </li>
                      </ul>

                      <ExternalLink href="https://integrations.barnbridge.com/specs/dao-specifications#proposals-and-voting">
                        Learn more
                      </ExternalLink>
                    </div>
                  }
                  visible={whyReasonVisible}
                  onVisibleChange={visible => showWhyReason(visible)}>
                  <button type="button" className="link-blue">
                    See why
                  </button>
                </Popover>
              </div>
            )}
          </div>
        )}
      </div>
      <ProposalsTable />
    </div>
  );
};

export default ProposalsView;
