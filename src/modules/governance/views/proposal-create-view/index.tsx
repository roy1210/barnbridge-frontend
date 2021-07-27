import { FC, useEffect, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';

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

import CreateProposalActionModal, { ProposalAction } from '../../components/create-proposal-action-modal';
import DeleteProposalActionModal from '../../components/delete-proposal-action-modal';

type FormType = {
  title: string;
  description: string;
  actions: ProposalAction[];
};

const ProposalCreateViewA: FC = () => {
  const config = useConfig();
  const daoCtx = useDAO();

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
    },
  });

  const [isSubmitting, setSubmitting] = useState(false);
  const [isCreateActionModal, showCreateActionModal] = useState(false);
  const [isDeleteActionModal, showDeleteActionModal] = useState(false);

  const { formState, watch } = form;
  const { isDirty } = formState;
  const [actions] = watch(['actions']);

  function fetchProposal(proposalId: number): Promise<APIProposalEntity> {
    const url = new URL(`/api/governance/proposals/${proposalId}`, config.api.baseUrl);
    return executeFetch<APIProposalEntity>(url);
  }

  function handleCreateAction(action: ProposalAction) {
    showCreateActionModal(false);
    form.updateValue('actions', [...actions, action]);
    // let actions = form.getFieldValue('actions');
    //
    // if (state.selectedAction) {
    //   actions = actions.map((action: CreateProposalActionForm) => (action === state.selectedAction ? payload : action));
    // } else {
    //   actions.push(payload);
    // }
    //
    // form.setFieldsValue({
    //   actions,
    // });
  }

  function handleActionDelete() {}

  async function handleSubmit(values: FormType) {
    setSubmitting(true);

    try {
      await daoCtx.daoGovernance.propose(values.title, values.description, [], [], [], [], 1);
    } catch (e) {
      console.error(e);
    }

    setSubmitting(false);
    // setState({ submitting: true });
    //
    // try {
    //   await form.validateFields();
    //
    //   const payload = {
    //     title: values.title,
    //     description: values.description,
    //     ...values.actions.reduce(
    //       (a, c) => {
    //         if (!c.targetAddress) {
    //           return a;
    //         }
    //
    //         a.targets.push(c.targetAddress);
    //
    //         if (c.addFunctionCall) {
    //           a.signatures.push(c.functionSignature!);
    //           a.calldatas.push(c.functionEncodedParams || '0x');
    //         } else {
    //           a.signatures.push('');
    //           a.calldatas.push('0x');
    //         }
    //
    //         if (c.addValueAttribute) {
    //           a.values.push(c.actionValue!);
    //         } else {
    //           a.values.push('0');
    //         }
    //
    //         return a;
    //       },
    //       {
    //         targets: [] as string[],
    //         signatures: [] as string[],
    //         calldatas: [] as string[],
    //         values: [] as string[],
    //       },
    //     ),
    //   };
    //
    //   const proposalId = await daoCtx.daoGovernance.propose(
    //     payload.title,
    //     payload.description,
    //     payload.targets,
    //     payload.values,
    //     payload.signatures,
    //     payload.calldatas,
    //     1,
    //   ); /// TODO: GAS PRICE
    //
    //   await waitUntil(() => fetchProposal(proposalId), { intervalBetweenAttempts: 3_000, timeout: Infinity });
    //
    //   form.resetFields();
    //   history.push(`/governance/proposals/${proposalId}`);
    // } catch (e) {
    //   console.error(e);
    // }
    //
    // setState({ submitting: false });
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
              <FormArray<FormType> name="actions">
                {({ fields, remove }) =>
                  fields.map((field, index) => (
                    <ProposalActionCard
                      className="mb-24"
                      title={`Action ${index + 1}`}
                      target={field.targetAddress}
                      signature={field.functionSignature}
                      callData={'0x'}
                      showSettings
                      onDeleteAction={() => remove(index)}
                      onEditAction={() => null}
                    />
                  ))
                }
              </FormArray>
              {/*<Form.List*/}
              {/*  name="actions"*/}
              {/*  rules={[*/}
              {/*    {*/}
              {/*      validator: (_, value: StoreValue) => {*/}
              {/*        return value.length === 0 ? Promise.reject() : Promise.resolve();*/}
              {/*      },*/}
              {/*      message: 'At least one action is required!',*/}
              {/*    },*/}
              {/*    {*/}
              {/*      validator: (_, value: StoreValue) => {*/}
              {/*        return value.length > 10 ? Promise.reject() : Promise.resolve();*/}
              {/*      },*/}
              {/*      message: 'Maximum 10 actions are allowed!',*/}
              {/*    },*/}
              {/*  ]}>*/}
              {/*  {(fields, _, { errors }) => (*/}
              {/*    <>*/}
              {/*      {fields.map((field, index) => {*/}
              {/*        const fieldData: CreateProposalActionForm = form.getFieldValue(['actions', index]);*/}
              {/*        const { targetAddress, functionSignature, functionEncodedParams } = fieldData;*/}

              {/*        return (*/}
              {/*          <Form.Item key={field.key} noStyle>*/}
              {/*            <ProposalActionCard*/}
              {/*              className="mb-24"*/}
              {/*              title={`Action ${index + 1}`}*/}
              {/*              target={targetAddress}*/}
              {/*              signature={functionSignature!}*/}
              {/*              callData={functionEncodedParams!}*/}
              {/*              showSettings*/}
              {/*              onDeleteAction={() => {*/}
              {/*                setState({*/}
              {/*                  showDeleteActionModal: true,*/}
              {/*                  selectedAction: fieldData,*/}
              {/*                });*/}
              {/*              }}*/}
              {/*              onEditAction={() => {*/}
              {/*                setState({*/}
              {/*                  showCreateActionModal: true,*/}
              {/*                  selectedAction: fieldData,*/}
              {/*                });*/}
              {/*              }}*/}
              {/*            />*/}
              {/*          </Form.Item>*/}
              {/*        );*/}
              {/*      })}*/}

              {/*      {fields.length < 10 && (*/}
              {/*        <Button*/}
              {/*          type="ghost"*/}
              {/*          icon={<Icon name="plus-circle-outlined" color="inherit" />}*/}
              {/*          disabled={state.submitting}*/}
              {/*          className={s.addActionBtn}*/}
              {/*          onClick={() => setState({ showCreateActionModal: true })}>*/}
              {/*          Add new action*/}
              {/*        </Button>*/}
              {/*      )}*/}

              {/*      {fields.length >= 10 && <Alert type="info" message="Maximum 10 actions are allowed." />}*/}

              {/*      <AntdForm.ErrorList errors={errors} />*/}
              {/*    </>*/}
              {/*  )}*/}
              {/*</Form.List>*/}
              <button type="button" className="button-ghost full-width" onClick={() => showCreateActionModal(true)}>
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
          value={undefined}
          onCancel={() => showCreateActionModal(false)}
          onSubmit={handleCreateAction}
        />
      )}

      {isDeleteActionModal && (
        <DeleteProposalActionModal
          onCancel={() => {
            showDeleteActionModal(false);
          }}
          onOk={handleActionDelete}
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
