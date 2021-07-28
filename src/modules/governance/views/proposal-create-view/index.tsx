import { FC, useEffect, useState } from 'react';
import { Link, Redirect, useHistory } from 'react-router-dom';
import waitUntil from 'async-wait-until';

import Input from 'components/antd/input';
import Textarea from 'components/antd/textarea';
import { Form, FormArray, FormItem, useForm } from 'components/custom/form';
import Icon from 'components/custom/icon';
import { Spinner } from 'components/custom/spinner';
import { Text } from 'components/custom/typography';
import { executeFetch } from 'hooks/useFetch';
import { APIProposalEntity, APIProposalStateId } from 'modules/governance/api';
import ProposalActionCard from 'modules/governance/components/proposal-action-card';
import { useDAO } from 'modules/governance/providers/daoProvider';
import { useConfig } from 'providers/configProvider';
import { useWallet } from 'wallets/walletProvider';

import CreateProposalActionModal, { ProposalAction } from '../../modals/create-proposal-action-modal';

type FormType = {
  title: string;
  description: string;
  actions: ProposalAction[];
};

const ProposalCreateViewA: FC = () => {
  const config = useConfig();
  const daoCtx = useDAO();
  const history = useHistory();

  const form = useForm<FormType>({
    defaultValues: {
      title: '',
      description: '',
      actions: [],
    },
    validationScheme: {
      title: {
        rules: {
          required: true,
          minLength: 3,
        },
        messages: {
          required: 'Value is required.',
          minLength: 'Should be at least 3 characters.',
        },
      },
      description: {
        rules: {
          required: true,
          minLength: 3,
        },
        messages: {
          required: 'Value is required.',
          minLength: 'Should be at least 3 characters.',
        },
      },
      actions: {
        rules: {
          required: true,
          minItems: 1,
          maxItems: 10,
        },
        messages: {
          required: 'At least one action is required!',
          minItems: 'At least one action is required!',
          maxItems: 'Maximum 10 actions are allowed!',
        },
      },
    },
  });

  const [isSubmitting, setSubmitting] = useState(false);
  const [isCreateActionModal, showCreateActionModal] = useState(false);
  const [editAction, setEditAction] = useState<ProposalAction | undefined>();

  const { formState, watch } = form;
  const { isDirty } = formState;
  const [actions] = watch(['actions']);

  async function waitForProposal(proposalId: number) {
    try {
      const url = new URL(`/api/governance/proposals/${proposalId}`, config.api.baseUrl);
      await waitUntil(() => executeFetch<APIProposalEntity>(url), {
        intervalBetweenAttempts: 3_000,
        timeout: 60_000,
      });
      history.push(`/governance/proposals/${proposalId}`);
    } catch (e) {
      console.error(e);
      history.push('/governance/proposals');
    }
  }

  function handleCreateAction(action: ProposalAction) {
    const { actions } = form.getValues();
    const foundAction = actions.find(item => item.id === action.id);

    showCreateActionModal(false);

    if (!foundAction) {
      // add item
      form.updateValue('actions', [...actions, action]);
    } else {
      // replace item
      form.updateValue(
        'actions',
        actions.map(item => (item === foundAction ? action : item)),
      );
    }
  }

  async function handleSubmit(values: FormType) {
    setSubmitting(true);

    try {
      const actionTargets = values.actions.map(action => action.targetAddress);
      const actionValues = values.actions.map(action => {
        return action.addValueAttribute ? action.actionValue : '0';
      });
      const actionSignatures = values.actions.map(action => {
        return action.addFunctionCall ? action.functionSignature : '';
      });
      const actionCallDatas = values.actions.map(action => {
        return action.addFunctionCall ? action.encodedParams : '0x';
      });

      const proposalId = await daoCtx.daoGovernance.propose(
        values.title,
        values.description,
        actionTargets,
        actionValues,
        actionSignatures,
        actionCallDatas,
        1,
      );

      await waitForProposal(proposalId);
    } catch (e) {
      console.error(e);
    }

    setSubmitting(false);
  }

  return (
    <div className="container-fit">
      <Link to="/governance/proposals" className="button-back fit-width mb-16">
        <Icon name="arrow-back" width={16} height={16} className="mr-8" color="inherit" />
        Proposals
      </Link>
      <Text type="h1" weight="bold" color="primary" className="mb-32">
        Create Proposal
      </Text>
      <Form form={form} disabled={isSubmitting} onSubmit={handleSubmit}>
        <div className="flex flow-row row-gap-32">
          <div className="card">
            <div className="card-header">
              <Text type="p1" weight="semibold" color="primary">
                Proposal description
              </Text>
            </div>
            <div className="flex flow-row row-gap-32 p-24">
              <FormItem name="title" label="Title">
                {({ field }) => <Input placeholder="Proposal title" value={field.value} onChange={field.onChange} />}
              </FormItem>
              <FormItem
                name="description"
                label="Description"
                labelProps={{
                  hint:
                    'Be careful with the length of the description, this will eventually have to be stored on chain and the gas needed might make the proposal creation transaction more expensive.',
                }}>
                {({ field }) => (
                  <Textarea
                    placeholder="Please enter the goal of this proposal here"
                    rows={6}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              </FormItem>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <Text type="p1" weight="semibold" color="primary">
                Actions
              </Text>
            </div>
            <div className="p-24">
              <FormArray<FormType> name="actions" className="mb-16">
                {({ fields, remove }) =>
                  fields.map((field, index) => (
                    <ProposalActionCard
                      key={field.id}
                      className="mb-24"
                      title={`Action ${index + 1}`}
                      target={field.targetAddress}
                      signature={field.functionSignature}
                      callData={field.encodedFunction}
                      showSettings
                      onDeleteAction={() => remove(index)}
                      onEditAction={() => {
                        setEditAction(field);
                        showCreateActionModal(true);
                      }}
                    />
                  ))
                }
              </FormArray>
              <button
                type="button"
                className="button-ghost full-width"
                onClick={() => {
                  setEditAction(undefined);
                  showCreateActionModal(true);
                }}>
                <span className="mr-12">Add a new action</span>
                <Icon name="plus-circle-outlined" color="inherit" />
              </button>
            </div>
          </div>
          <div className="flex flow-col justify-space-between">
            <button type="button" className="button-ghost button-big" disabled={!isDirty} onClick={() => form.reset()}>
              Reset form
            </button>
            <button type="submit" className="button-primary button-big">
              {isSubmitting && <Spinner className="mr-8" />}
              Create proposal
            </button>
          </div>
        </div>
      </Form>

      {isCreateActionModal && (
        <CreateProposalActionModal
          actions={actions}
          value={editAction}
          onCancel={() => showCreateActionModal(false)}
          onSubmit={handleCreateAction}
        />
      )}
    </div>
  );
};

type UseCheckProposalCreationReturn = {
  hasThreshold: boolean | undefined;
  hasActiveProposal: boolean | undefined;
};

function useCheckProposalCreation(): UseCheckProposalCreationReturn {
  const wallet = useWallet();
  const { daoGovernance, thresholdRate, minThresholdRate } = useDAO();
  const [hasActiveProposal, setHasActiveProposal] = useState<boolean | undefined>();

  useEffect(() => {
    (async () => {
      if (!wallet.account) {
        return;
      }

      const latestProposalId = await daoGovernance.getLatestProposalIds(wallet.account);

      if (!latestProposalId) {
        return;
      }

      const latestProposalState = await daoGovernance.getState(latestProposalId);

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
  }, [wallet.account, daoGovernance]);

  const hasThreshold = thresholdRate ? thresholdRate >= minThresholdRate : undefined;

  return {
    hasThreshold,
    hasActiveProposal,
  };
}

const WalletCheck: FC = props => {
  const wallet = useWallet();

  if (!wallet.initialized) {
    return <Spinner />;
  }

  if (!wallet.isActive) {
    return <Redirect to="/governance/proposals" />;
  }

  return <>{props.children}</>;
};

const ProposalCreationCheck: FC = props => {
  const dao = useDAO();
  const { hasThreshold, hasActiveProposal } = useCheckProposalCreation();

  if (dao.isActive === false || hasActiveProposal || hasThreshold === false) {
    return <Redirect to="/governance/proposals" />;
  }

  if (dao.isActive === undefined || hasActiveProposal === undefined || hasThreshold === undefined) {
    return <Spinner />;
  }

  return <>{props.children}</>;
};

export default function ProposalCreateView() {
  return (
    <WalletCheck>
      <ProposalCreationCheck>
        <ProposalCreateViewA />
      </ProposalCreationCheck>
    </WalletCheck>
  );
}
