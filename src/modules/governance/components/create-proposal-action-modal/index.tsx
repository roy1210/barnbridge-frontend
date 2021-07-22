import { FC, useState } from 'react';
import AntdSwitch from 'antd/lib/switch';
import { AbiFunctionFragment, AbiInterface } from 'web3/abiInterface';

import Alert from 'components/antd/alert';
import Input from 'components/antd/input';
import Modal, { ModalProps } from 'components/antd/modal';
import YesNoSelector from 'components/antd/yes-no-selector';
import { Form, FormItem, useForm } from 'components/custom/form';
import Grid from 'components/custom/grid';
import { Spinner } from 'components/custom/spinner';
import { Hint, Text } from 'components/custom/typography';

import AddZerosPopup from '../add-zeros-popup';
import SimulatedProposalActionModal from '../simulated-proposal-action-modal';

import s from './s.module.scss';

export type CreateProposalActionForm = {
  targetAddress: string;
  isProxyAddress: boolean;
  implementationAddress: string;
  addValueAttribute?: boolean;
  actionValue: string;
  addFunctionCall?: boolean;
  abiLoading: boolean;
  abiInterface?: AbiInterface;
  functionSignature?: string;
  functionMeta?: AbiFunctionFragment;
  functionParams: Record<string, any>;
  functionStrParams: string;
  functionEncodedParams: string;
};

const InitialFormValues: CreateProposalActionForm = {
  targetAddress: '',
  isProxyAddress: false,
  implementationAddress: '',
  addValueAttribute: false,
  actionValue: '',
  addFunctionCall: false,
  abiLoading: false,
  abiInterface: undefined,
  functionSignature: '',
  functionMeta: undefined,
  functionParams: {},
  functionStrParams: '',
  functionEncodedParams: '',
};

type CreateProposalActionModalState = {
  showSimulatedActionModal: boolean;
  simulatedAction?: CreateProposalActionForm;
  simulationResolve?: () => void;
  simulationReject?: () => void;
  formDirty: boolean;
  submitting: boolean;
};

const InitialState: CreateProposalActionModalState = {
  showSimulatedActionModal: false,
  simulatedAction: undefined,
  simulationResolve: undefined,
  simulationReject: undefined,
  formDirty: false,
  submitting: false,
};

type Props = ModalProps & {
  edit?: boolean;
  actions: CreateProposalActionForm[];
  initialValues?: CreateProposalActionForm;
  onSubmit: (values: CreateProposalActionForm) => void;
};

type FormType = {
  targetAddress: string;
  isProxyAddress: boolean;
  implementationAddress: string;
  addValueAttribute?: boolean;
  actionValue: string;
  addFunctionCall?: boolean;
  abiLoading: boolean;
  abiInterface?: AbiInterface;
  functionSignature?: string;
  functionMeta?: AbiFunctionFragment;
  functionParams: Record<string, any>;
  functionStrParams: string;
  functionEncodedParams: string;
};

const CreateProposalActionModal: FC<Props> = props => {
  const { edit = false } = props;

  const form = useForm<FormType>({
    defaultValues: {
      targetAddress: '',
      isProxyAddress: false,
      implementationAddress: '',
      addValueAttribute: undefined,
    },
    validationScheme: {
      targetAddress: {
        rules: {
          required: true,
        },
        messages: {
          required: 'Value is required.',
        },
      },
    },
    onSubmit: async values => {
    },
  });

  const [isSubmitting, setSubmitting] = useState(false);
  const [isSimulatedActionModal, showSimulatedActionModal] = useState(false);
  const [simulatedAction, setSimulatedAction] = useState({
    targetAddress: '',
    functionSignature: '',
    functionEncodedParams: '',
  });

  const { formState, watch } = form;
  // @ts-ignore
  const isProxyAddress = watch('isProxyAddress');
  const addValueAttribute = watch('addValueAttribute');
  const addFunctionCall = watch('addFunctionCall');

  function loadAbiInterface(address: string) {
    /*form.setFieldsValue({
      abiLoading: true,
    });

    const url = `${activeNetwork.explorer.apiUrl}/api?module=contract&action=getabi&address=${address}&apikey=${activeNetwork.explorer.key}`;

    fetch(url)
      .then(result => result.json())
      .then(({ status, result }: { status: string; result: string }) => {
        if (status === '1') {
          return JSON.parse(result);
        }

        return Promise.reject(result);
      })
      .then((abi: any[]) => {
        form.setFieldsValue({
          abiInterface: new AbiInterface(abi),
        });
      })
      .catch(Error)
      .then(() => {
        form.setFieldsValue({
          abiLoading: false,
        });
      });*/
  }

  function handleFormValuesChange(values: Partial<CreateProposalActionForm>, allValues: CreateProposalActionForm) {
    /*const {
      targetAddress,
      isProxyAddress,
      implementationAddress,
      addFunctionCall,
      abiInterface,
      functionSignature,
      functionMeta,
      functionParams,
    } = allValues;

    Object.keys(values).forEach((fieldName: string) => {
      if (fieldName === 'targetAddress' || fieldName === 'implementationAddress') {
        form.setFieldsValue({
          abiLoading: false,
          abiInterface: undefined,
          functionSignature: '',
          functionMeta: undefined,
          functionParams: {},
          functionStrParams: '',
          functionEncodedParams: '',
        });

        const address = implementationAddress || targetAddress;

        if (addFunctionCall === true && address) {
          loadAbiInterface(address);
        }
      } else if (fieldName === 'isProxyAddress') {
        if (!isProxyAddress && implementationAddress) {
          form.setFieldsValue({
            abiLoading: false,
            abiInterface: undefined,
            functionSignature: '',
            functionMeta: undefined,
            functionParams: {},
            functionStrParams: '',
            functionEncodedParams: '',
          });

          if (addFunctionCall === true && targetAddress) {
            loadAbiInterface(targetAddress);
          }
        }
      } else if (fieldName === 'addValueAttribute') {
        form.setFieldsValue({
          actionValue: '',
        });
      } else if (fieldName === 'addFunctionCall') {
        form.setFieldsValue({
          abiLoading: false,
          abiInterface: undefined,
          functionSignature: '',
          functionMeta: undefined,
          functionParams: {},
          functionStrParams: '',
          functionEncodedParams: '',
        });

        const address = implementationAddress || targetAddress;

        if (addFunctionCall === true && address) {
          loadAbiInterface(address);
        }
      } else if (fieldName === 'functionSignature') {
        const selectedFunctionMeta = (abiInterface?.writableFunctions ?? []).find(
          fn => fn.format() === functionSignature,
        );
        let functionStrParams = '';

        if (selectedFunctionMeta) {
          const params = selectedFunctionMeta.inputs.map(({ name, type }) => ({
            name,
            type,
          }));
          const paramsStr = JSON.stringify(params, null, 2);
          functionStrParams = `Parameters:\n${paramsStr}`;
        }

        form.setFieldsValue({
          functionMeta: selectedFunctionMeta,
          functionParams: {},
          functionStrParams,
          functionEncodedParams: '',
        });
      } else if (fieldName === 'functionParams') {
        if (functionMeta) {
          const paramsValues = Object.values(functionParams);
          const encodedParams = AbiInterface.encodeFunctionData(functionMeta, paramsValues);

          form.setFieldsValue({
            functionEncodedParams: encodedParams,
          });
        }
      }
    });

    setState({
      formDirty: form.isFieldsTouched(),
    });*/
  }

  async function handleSubmit(values: CreateProposalActionForm) {
    /*const existsSimilar = props.actions.some(action => {
      return (
        action !== values &&
        action.addFunctionCall &&
        action.targetAddress === values.targetAddress &&
        action.functionSignature === values.functionSignature &&
        action.functionEncodedParams === values.functionEncodedParams
      );
    });

    if (existsSimilar) {
      AntdNotification.error({
        message: 'Duplicate actions are disallowed!',
      });
      return;
    }

    setState({ submitting: true });

    let cancel = false;

    try {
      await form.validateFields();

      if (values.addFunctionCall) {
        const encodedFunction = values.abiInterface?.encodeFunctionData(
          values.functionMeta!,
          Object.values(values.functionParams ?? {}),
        );

        try {
          await web3.tryCall(
            values.targetAddress,
            config.contracts.dao?.governance!,
            encodedFunction!,
            values.actionValue,
          );
        } catch {
          await new Promise<void>((resolve, reject) => {
            setState({
              showSimulatedActionModal: true,
              simulatedAction: values,
              simulationResolve: resolve,
              simulationReject: reject,
            });
          });
        }
      }

      await props.onSubmit(values);
      form.resetFields();
      cancel = true;
    } catch (e) {
      if (e?.message) {
        AntdNotification.error({
          message: e?.message,
        });
      }
    }

    setState({ submitting: false });

    if (cancel) {
      props.onCancel?.();
    }*/
  }

  function handleSimulatedAction(answer: boolean) {
    /*if (answer) {
      state.simulationResolve?.();
    } else {
      state.simulationReject?.();
    }

    setState({
      showSimulatedActionModal: false,
      simulationResolve: undefined,
      simulationReject: undefined,
    });*/
  }

  return (
    <Modal
      className={s.component}
      confirmClose={formState.isDirty}
      confirmText="Are you sure you want to close this form?"
      {...props}>
      <div className={s.wrap}>
        <Text type="h2" weight="semibold" className={s.headerLabel} color="primary">
          {edit ? 'Edit action' : 'Add new action'}
        </Text>

        <Form form={form}>
          <FormItem
            name="targetAddress"
            label="Target address"
            labelProps={{
              hint: 'This is the address to which the transaction will be sent.',
            }}>
            {({ field }) => <Input value={field.value} onChange={field.onChange} />}
          </FormItem>

          <Grid flow="col" align="center" justify="space-between">
            <Hint
              text="In case you are using a proxy address as the target, please specify the address where the function implementation is found.">
              <Text type="small" weight="semibold" color="secondary">
                Is this a proxy address?
              </Text>
            </Hint>
            <FormItem name="isProxyAddress">
              {({ field }) => <AntdSwitch checked={field.value} onChange={field.onChange} />}
            </FormItem>
          </Grid>

          {isProxyAddress && (
            <FormItem name="implementationAddress">
              {({ field }) => (
                <Input placeholder="Implementation address" value={field.value} onChange={field.onChange} />
              )}
            </FormItem>
          )}

          <FormItem
            name="addValueAttribute"
            label="Add a value attribute to your action?"
            labelProps={{
              hint: 'This field allows you to send some ETH along with your transaction.',
            }}>
            {({ field }) => <YesNoSelector value={field.value} onChange={field.onChange} />}
          </FormItem>

          {addValueAttribute && (
            <FormItem
              name="actionValue"
              label={
                <Grid flow="col" gap={8}>
                  <Text type="small" weight="semibold" color="secondary">
                    Action Value
                  </Text>
                  <AddZerosPopup
                    max={78}
                    onAdd={value => {
                      /*const { actionValue: prevActionValue } = getFieldsValue();

                      if (prevActionValue) {
                        const zeros = '0'.repeat(value);
                        form.setFieldsValue({
                          actionValue: `${prevActionValue}${zeros}`,
                        });
                      }*/
                    }}
                  />
                </Grid>
              }>
              {({ field }) => <Input value={field.value} onChange={field.onChange} />}
            </FormItem>
          )}

          <FormItem
            name="addFunctionCall"
            label="Add a function call to your action?"
            labelProps={{
              hint: 'This field allows you to call a function on a smart contract.',
            }}>
            {({ field }) => <YesNoSelector value={field.value} onChange={field.onChange} />}
          </FormItem>

          {(() => {
            if (addFunctionCall !== true) {
              return null;
            }
            return null;
            /*const functionOptions =
              abiInterface?.writableFunctions.map(fn => ({
                label: fn.format(),
                value: fn.format(),
              })) ?? [];

            return (
              <Grid flow="row" gap={32}>
                <FormItem name="functionSignature" label="Select function">
                  {({ field }) => (
                    <Select
                      loading={abiLoading}
                      options={functionOptions}
                      fixScroll
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                </FormItem>

                {functionMeta && (
                  <Grid flow="row" gap={32}>
                    {functionMeta.inputs.map(input => (
                      <FormItem
                        key={`${functionMeta?.format()}:${input.name}`}
                        name={`functionParams[${input.name}]`}
                        label={
                          <Grid flow="col" gap={8}>
                            <Text type="small" weight="semibold" color="secondary">
                              {input.name} ({input.type})
                            </Text>
                            {/(u?int\d+)/g.test(input.type) && (
                              <AddZerosPopup
                                onAdd={value => {
                                  const prevActionValue = functionParams[input.name];

                                  if (prevActionValue) {
                                    const zeros = '0'.repeat(value);
                                    functionParams[input.name] = `${prevActionValue}${zeros}`;

                                    const paramsValues = Object.values(functionParams);
                                    const encodedParams = AbiInterface.encodeFunctionData(functionMeta, paramsValues);

                                    /!*form.setFieldsValue({
                                      functionParams,
                                      functionEncodedParams: encodedParams,
                                    });*!/
                                  }
                                }}
                              />
                            )}
                          </Grid>
                        }>
                        {({ field }) => (
                          <Input
                            placeholder={`${input.name} (${input.type})`}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      </FormItem>
                    ))}

                    <FieldLabel label={`Function type: ${functionMeta.name}`}>
                      <Textarea className={s.textarea} rows={5} value={functionStrParams} disabled />
                    </FieldLabel>

                    <FieldLabel label="Hex data">
                      <Textarea
                        className={s.textarea}
                        rows={5}
                        placeholder="Fill in the arguments above"
                        value={functionEncodedParams}
                        disabled
                      />
                    </FieldLabel>
                  </Grid>
                )}

                {targetAddress && addFunctionCall && !abiLoading && !abiInterface && (
                  <Alert
                    type="error"
                    message="The target address you entered is not a validated contract address. Please check the information you entered and try again"
                  />
                )}
              </Grid>
            );*/
          })()}

          {!addValueAttribute && !addFunctionCall && (
            <Alert
              type="error"
              message="You need to provide at least one: a value attribute or a function call to your action"
            />
          )}

          <div className={s.actions}>
            <button type="button" className="button-ghost-monochrome" onClick={props.onCancel}>
              {edit ? 'Cancel Changes' : 'Cancel'}
            </button>
            <button type="submit" className="button-primary">
              {isSubmitting && <Spinner className="mr-8" />}
              {edit ? 'Save Changes' : 'Add Action'}
            </button>
          </div>
        </Form>

        {isSimulatedActionModal && simulatedAction && (
          <SimulatedProposalActionModal
            targetAddress={simulatedAction.targetAddress}
            functionSignature={simulatedAction.functionSignature}
            functionEncodedParams={simulatedAction.functionEncodedParams}
            onOk={() => handleSimulatedAction(true)}
            onCancel={() => handleSimulatedAction(false)}
          />
        )}
      </div>
    </Modal>
  );
};

export default CreateProposalActionModal;
