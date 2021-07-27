import { FC } from 'react';

import Modal, { ModalProps } from 'components/antd/modal';
import Icon from 'components/custom/icon';
import { Text } from 'components/custom/typography';

import ProposalActionCard from 'modules/governance/components/proposal-action-card';

type Props = ModalProps & {
  targetAddress: any;
  functionSignature: any;
  functionEncodedParams: any;
};

const SimulatedProposalActionModal: FC<Props> = props => {
  const { targetAddress, functionSignature, functionEncodedParams, ...modalProps } = props;

  return (
    <Modal width={560} {...modalProps}>
      <div className="flex flow-row">
        <Icon name="warning-outlined" width={40} height={40} color="red" className="mb-24" />
        <Text type="h3" weight="bold" color="primary" className="mb-16">
          Action could not be simulated
        </Text>
        <Text type="p2" weight="semibold" color="secondary" className="mb-32">
          We run a simulation for every action before adding it to the proposal. The following action failed to
          simulate:
        </Text>
        <ProposalActionCard
          className="mb-32"
          title=""
          target={targetAddress}
          signature={functionSignature}
          callData={functionEncodedParams}
        />
        <Text type="p2" weight="semibold" color="secondary" className="mb-32">
          If you think this is a mistake, you can still add this action to the proposal.
        </Text>
        <div className="flex flow-col justify-space-between">
          <button type="button" className="button-secondary" onClick={modalProps.onOk}>
            Continue anyway
          </button>
          <button type="button" className="button-primary" onClick={modalProps.onCancel}>
            Delete action
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SimulatedProposalActionModal;
