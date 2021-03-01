import React from 'react';
import { useHistory } from 'react-router-dom';
import * as Antd from 'antd';
import BigNumber from 'bignumber.js';
import { ZERO_BIG_NUMBER, formatBigValue, getHumanValue, getNonHumanValue } from 'web3/utils';

import Button from 'components/antd/button';
import Form from 'components/antd/form';
import Input from 'components/antd/input';
import Icon, { TokenIconNames } from 'components/custom/icon';
import TokenAmount from 'components/custom/token-amount';
import { Text } from 'components/custom/typography';
import ConfirmTxModal from 'modules/smart-yield/components/confirm-tx-modal';
import TransactionDetails from 'modules/smart-yield/components/transaction-details';
import SYControllerContract from 'modules/smart-yield/contracts/syControllerContract';
import SYSmartYieldContract from 'modules/smart-yield/contracts/sySmartYieldContract';
import { useTokenPool } from 'modules/smart-yield/views/token-pool-view/token-pool-provider';
import { useWallet } from 'wallets/wallet';

type FormData = {
  amount?: BigNumber;
  gasPrice?: {
    value: number;
  };
  slippageTolerance?: number;
  deadline?: number;
};

const InitialFormValues: FormData = {
  amount: undefined,
  gasPrice: undefined,
  slippageTolerance: 0.5,
  deadline: 20,
};

const JuniorTranche: React.FC = () => {
  const history = useHistory();
  const wallet = useWallet();
  const poolCtx = useTokenPool();
  const [form] = Antd.Form.useForm<FormData>();

  const { pool } = poolCtx;

  const [isSaving, setSaving] = React.useState<boolean>(false);
  const [depositModalVisible, showDepositModal] = React.useState<boolean>();

  const handleTxDetailsChange = React.useCallback(values => {
    form.setFieldsValue(values);
  }, []);

  function handleCancel() {
    history.push(`/smart-yield/${pool?.smartYieldAddress}/deposit`);
  }

  function handleSubmit() {
    showDepositModal(true);
  }

  function handleDepositCancel() {
    showDepositModal(false);
  }

  async function handleDepositConfirm({ gasPrice }: any) {
    if (!pool) {
      return;
    }

    const { amount, slippageTolerance, deadline } = form.getFieldsValue();

    if (!amount) {
      return;
    }

    setSaving(true);

    const smartYieldContract = new SYSmartYieldContract(pool.smartYieldAddress);
    smartYieldContract.setProvider(wallet.provider);
    smartYieldContract.setAccount(wallet.account);
    const price = await smartYieldContract.getPrice();

    const controllerContract = new SYControllerContract(pool.controllerAddress);
    controllerContract.setProvider(wallet.provider);
    const juniorFee = await controllerContract.getJuniorBuyFee();

    const decimals = pool.underlyingDecimals;
    const slippage = new BigNumber(slippageTolerance ?? ZERO_BIG_NUMBER).dividedBy(100);
    const minAmount = amount.multipliedBy(new BigNumber(1).minus(juniorFee.dividedBy(1e18)).minus(slippage));
    const minTokens = minAmount.dividedBy(price);
    const deadlineTs = Math.floor(Date.now() / 1_000 + Number(deadline ?? 0) * 60);

    try {
      await smartYieldContract.buyTokensSend(
        getNonHumanValue(amount, decimals),
        getNonHumanValue(new BigNumber(minTokens.toFixed(0)), decimals),
        deadlineTs,
        gasPrice,
      );
      form.resetFields();
    } catch {}

    setSaving(false);
  }

  return (
    <Form
      className="grid flow-row row-gap-32"
      form={form}
      initialValues={InitialFormValues}
      validateTrigger={['onSubmit']}
      onFinish={handleSubmit}>
      <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Required' }]}>
        <TokenAmount
          tokenIcon={pool?.meta?.icon as TokenIconNames}
          max={getHumanValue(pool?.underlyingMaxAllowed, pool?.underlyingDecimals)}
          maximumFractionDigits={pool?.underlyingDecimals}
          displayDecimals={4}
          disabled={isSaving}
          slider
        />
      </Form.Item>
      <Form.Item name="slippageTolerance" noStyle hidden>
        <Input />
      </Form.Item>
      <Form.Item name="deadline" noStyle hidden>
        <Input />
      </Form.Item>
      <Form.Item shouldUpdate>
        {() => {
          const { slippageTolerance, deadline } = form.getFieldsValue();

          return (
            <TransactionDetails
              slippageTolerance={slippageTolerance}
              deadline={deadline}
              onChange={handleTxDetailsChange}
            />
          );
        }}
      </Form.Item>
      <div className="grid flow-col col-gap-32 align-center justify-space-between">
        <Button type="light" disabled={isSaving} onClick={handleCancel}>
          <Icon name="left-arrow" width={9} height={8} />
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" loading={isSaving}>
          Deposit
        </Button>
      </div>

      {depositModalVisible && (
        <ConfirmTxModal
          visible
          title="Confirm your deposit"
          header={
            <div className="grid flow-col col-gap-32">
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  Minimum received
                </Text>
                <Text type="p1" weight="semibold" color="primary">
                  - j{pool?.underlyingSymbol}
                </Text>
              </div>
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  Deposited
                </Text>
                <Text type="p1" weight="semibold" color="primary">
                  {formatBigValue(form.getFieldValue('amount'))} {pool?.underlyingSymbol}
                </Text>
              </div>
            </div>
          }
          submitText="Confirm your deposit"
          onCancel={handleDepositCancel}
          onConfirm={handleDepositConfirm}
        />
      )}
    </Form>
  );
};

export default JuniorTranche;