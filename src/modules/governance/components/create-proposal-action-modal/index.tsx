import { FC, useEffect, useMemo, useRef, useState } from 'react';
import AntdSwitch from 'antd/lib/switch';
import { AbiFunctionFragment, AbiInterface } from 'web3/abiInterface';

import Alert from 'components/antd/alert';
import Input from 'components/antd/input';
import Modal, { ModalProps } from 'components/antd/modal';
import Select from 'components/antd/select';
import Textarea from 'components/antd/textarea';
import YesNoSelector from 'components/antd/yes-no-selector';
import { FieldLabel, Form, FormArray, FormItem, useForm } from 'components/custom/form';
import { Spinner } from 'components/custom/spinner';
import { Hint, Text } from 'components/custom/typography';
import { useWeb3 } from 'providers/web3Provider';

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

type FunctionInputType = {
  name: string;
  type: string;
  value: string;
};

type FormType = {
  custom: any;
  targetAddress: string;
  isProxyAddress: boolean;
  implementationAddress: string;
  addValueAttribute: boolean | undefined;
  actionValue: string;
  addFunctionCall: boolean | undefined;
  functionSignature: string;
  functionInputs: FunctionInputType[];
};

const CreateProposalActionModal: FC<Props> = props => {
  const { edit = false } = props;
  const { getContractAbi } = useWeb3();

  const form = useForm<FormType>({
    defaultValues: {
      targetAddress: '',
      isProxyAddress: false,
      implementationAddress: '',
      addValueAttribute: undefined,
      actionValue: '',
      addFunctionCall: undefined,
      functionSignature: '',
      functionInputs: [],
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
      implementationAddress: {
        rules: {
          required: (value, rule, obj) => {
            if (obj.isProxyAddress) {
              return Boolean(value);
            }

            return true;
          },
        },
        messages: {
          required: 'Value is required.',
        },
      },
      addValueAttribute: {
        rules: {
          required: value => {
            return value !== undefined;
          },
          atLeastOne: (value, rule, obj) => {
            return value !== false || obj.addFunctionCall !== false;
          },
        },
        messages: {
          required: 'Selection is required.',
          atLeastOne: ' ',
        },
      },
      addFunctionCall: {
        rules: {
          required: value => {
            return value !== undefined;
          },
        },
        messages: {
          required: 'Selection is required.',
        },
      },
    },
  });

  const formRef = useRef(form);
  formRef.current = form;

  const { formState, watch } = form;
  const [
    targetAddress,
    isProxyAddress,
    implementationAddress,
    addValueAttribute,
    addFunctionCall,
    functionSignature,
    functionInputs,
    // @ts-ignore
  ] = watch([
    'targetAddress',
    'isProxyAddress',
    'implementationAddress',
    'addValueAttribute',
    'addFunctionCall',
    'functionSignature',
    'functionInputs',
  ]);

  const [abiLoading, setAbiLoading] = useState(false);
  const [abiInterface, setAbiInterface] = useState<AbiInterface | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSimulatedActionModal, showSimulatedActionModal] = useState(false);
  const [simulatedAction, setSimulatedAction] = useState({
    targetAddress: '',
    functionSignature: '',
    functionEncodedParams: '',
  });

  const abiAddress = isProxyAddress ? implementationAddress : targetAddress;

  const abiFunctionOptions = useMemo(() => {
    return (
      abiInterface?.writableFunctions.map(fn => ({
        label: fn.format(),
        value: fn.format(),
      })) ?? []
    );
  }, [abiInterface]);

  const abiSelectedFunction = useMemo(() => {
    return abiInterface?.writableFunctions.find(fn => fn.format() === functionSignature);
  }, [abiInterface, functionSignature]);

  const abiSelectedFunctionParams = useMemo(() => {
    const params =
      abiSelectedFunction?.inputs.map(({ name, type }) => ({
        name,
        type,
      })) ?? [];
    const paramsStr = JSON.stringify(params, null, 2);
    return `Parameters:\n${paramsStr}`;
  }, [abiSelectedFunction]);

  const abiSelectedFunctionEncoded = useMemo(() => {
    const paramsValues = functionInputs.map(input => input.value);
    return abiSelectedFunction ? AbiInterface.encodeFunctionData(abiSelectedFunction, paramsValues) : '';
  }, [abiSelectedFunction, functionInputs]);

  useEffect(() => {
    if (!addFunctionCall) {
      return;
    }

    setAbiInterface(undefined);
    form.updateValue('functionSignature', '');
    form.updateValue('functionInputs', []);

    if (!abiAddress) {
      return;
    }

    (async () => {
      setAbiLoading(true);

      try {
        const abi = await getContractAbi(abiAddress);

        if (abi) {
          setAbiInterface(new AbiInterface(abi as any));
        }
      } catch (e) {
        console.error(e);
      }

      setAbiLoading(false);
    })();
  }, [addFunctionCall, abiAddress, getContractAbi]);

  useEffect(() => {
    let inputs: FunctionInputType[] = [];

    if (abiSelectedFunction) {
      inputs = abiSelectedFunction.inputs.map(input => ({
        name: input.name,
        type: input.type,
        value: '',
      }));
    }

    formRef.current.updateValue('functionInputs', inputs);
  }, [abiSelectedFunction]);

  function handleFormValuesChange(values: Partial<CreateProposalActionForm>, allValues: CreateProposalActionForm) {
    /*const {
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

  async function handleSubmit(values: FormType) {
    console.log('VALUES', values);

    // const encodedFunction = values.abiInterface?.encodeFunctionData(
    //   values.functionMeta!,
    //   Object.values(values.functionParams ?? {}),
    // );
    //
    // try {
    //   await web3.tryCall(
    //     values.targetAddress,
    //     config.contracts.dao?.governance!,
    //     encodedFunction!,
    //     values.actionValue,
    //   );
    // } catch {
    // }
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

  return (
    <Modal
      className={s.component}
      confirmClose={formState.isDirty}
      confirmText="Are you sure you want to close this form?"
      {...props}>
      <Text type="h2" weight="semibold" className="mb-64" color="primary">
        {edit ? 'Edit action' : 'Add new action'}
      </Text>
      <Form form={form} onSubmit={handleSubmit}>
        <div className="container-thin flex flow-row row-gap-32">
          <div className="flex flow-row row-gap-8">
            <FormItem
              name="targetAddress"
              label="Target address"
              labelProps={{
                hint: 'This is the address to which the transaction will be sent.',
              }}>
              {({ field }) => <Input value={field.value} onChange={field.onChange} />}
            </FormItem>
            <div className="flex flow-col align-center justify-space-between">
              <Hint
                text="In case you are using a proxy address as the target, please specify the address where the function implementation is found.">
                <Text type="small" weight="semibold" color="secondary">
                  Is this a proxy address?
                </Text>
              </Hint>
              <FormItem name="isProxyAddress">
                {({ field }) => <AntdSwitch checked={field.value} onChange={field.onChange} />}
              </FormItem>
            </div>
            {isProxyAddress && (
              <FormItem name="implementationAddress">
                {({ field }) => (
                  <Input placeholder="Implementation address" value={field.value} onChange={field.onChange} />
                )}
              </FormItem>
            )}
          </div>
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
                <div className="flex flow-col col-gap-8">
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
                </div>
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

          {addFunctionCall && (
            <>
              <FormItem name="functionSignature" label="Select function">
                {({ field }) => (
                  <Select
                    loading={abiLoading}
                    options={abiFunctionOptions}
                    fixScroll
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              </FormItem>
              <FormArray name="functionInputs">
                {({ fields }) =>
                  fields.map((input, index) => (
                    <div key={input.name ?? String(index)} className="flex flow-row row-gap-8">
                      <div className="flex flow-col col-gap-8">
                        <Text type="small" weight="semibold" color="secondary">
                          {input.name} ({input.type})
                        </Text>
                        {/(u?int\d+)/g.test(input.type) && (
                          <AddZerosPopup
                            onAdd={value => {
                              // const prevActionValue = functionParams[input.name];
                              //
                              // if (prevActionValue) {
                              //   const zeros = '0'.repeat(value);
                              //   functionParams[input.name] = `${prevActionValue}${zeros}`;
                              //
                              //   const paramsValues = Object.values(functionParams);
                              //   const encodedParams = AbiInterface.encodeFunctionData(functionMeta, paramsValues);
                              // }
                            }}
                          />
                        )}
                      </div>
                      <FormItem name={`functionInputs.${index}.value`}>
                        {({ field }) => (
                          <Input
                            placeholder={`${input.name} (${input.type})`}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      </FormItem>
                    </div>
                  ))
                }
              </FormArray>
              {abiSelectedFunction && (
                <>
                  <FieldLabel label={`Function type: ${abiSelectedFunction.name}`}>
                    <Textarea className={s.textarea} rows={5} value={abiSelectedFunctionParams} disabled />
                  </FieldLabel>
                  <FieldLabel label="Hex data">
                    <Textarea
                      className={s.textarea}
                      rows={5}
                      placeholder="Fill in the arguments above"
                      value={abiSelectedFunctionEncoded}
                      disabled
                    />
                  </FieldLabel>
                </>
              )}
              {abiAddress && !abiLoading && !abiInterface && (
                <Alert
                  type="error"
                  message="The target address you entered is not a validated contract address. Please check the information you entered and try again"
                />
              )}
            </>
          )}

          {addValueAttribute === false && addFunctionCall === false && (
            <Alert
              type="error"
              message="You need to provide at least one: a value attribute or a function call to your action"
            />
          )}

          <div className="flex flow-col justify-space-between">
            <button type="button" className="button-ghost-monochrome" onClick={props.onCancel}>
              {edit ? 'Cancel changes' : 'Cancel'}
            </button>
            <button type="submit" className="button-primary">
              {isSubmitting && <Spinner className="mr-8" />}
              {edit ? 'Save changes' : 'Add action'}
            </button>
          </div>
        </div>
      </Form>

      {isSimulatedActionModal && simulatedAction && (
        <SimulatedProposalActionModal
          targetAddress={simulatedAction.targetAddress}
          functionSignature={simulatedAction.functionSignature}
          functionEncodedParams={simulatedAction.functionEncodedParams}
          onOk={() => true}
          onCancel={() => false}
        />
      )}
    </Modal>
  );
};

export default CreateProposalActionModal;
