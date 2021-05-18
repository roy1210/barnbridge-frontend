import React, { useState } from 'react';
import AntdSpin from 'antd/lib/spin';
import BigNumber from 'bignumber.js';
import { useTxConfirm } from 'web3/components/tx-confirm-provider';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken } from 'web3/utils';

import Alert from 'components/antd/alert';
import Tooltip from 'components/antd/tooltip';
import Icon from 'components/custom/icon';
import { TokenAmount } from 'components/custom/token-amount-new';
import { Text } from 'components/custom/typography';
import { ProjectToken } from 'components/providers/known-tokens-provider';

import { useDAO } from '../../components/dao-provider';

const WalletWithdrawView: React.FC = () => {
  const txConfirmCtx = useTxConfirm();
  const daoCtx = useDAO();

  const [amount, setAmount] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const tokenContract = ProjectToken.contract as Erc20Contract;
  const walletBalance = tokenContract.balance?.unscaleBy(ProjectToken.decimals);

  const barnContract = daoCtx.newDaoBarn;
  const stakedBalance = barnContract.balance?.unscaleBy(ProjectToken.decimals);
  const maxAmount = stakedBalance ?? BigNumber.ZERO;

  async function handleWithdraw() {
    if (!amount) {
      return;
    }

    const bnAmount = new BigNumber(amount);
    const scaledAmount = bnAmount.scaleBy(ProjectToken.decimals);

    if (!scaledAmount) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await txConfirmCtx.confirm({
        header: (
          <div className="grid flow-row align-center">
            <Text type="small" weight="semibold" color="secondary" className="mb-4">
              Withdraw amount
            </Text>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(bnAmount)} {ProjectToken.symbol}
            </Text>
          </div>
        ),
        submitText: 'Confirm your withdraw',
      });

      await barnContract.withdraw(scaledAmount, result.gasPrice);
      await barnContract.loadUserData().catch(Error);
      await tokenContract.loadBalance().catch(Error);
      setAmount('');
    } catch {}

    setSubmitting(false);
  }

  return (
    <div className="card">
      <div className="card-header flex wrap col-gap-64">
        <div className="flex align-center">
          <Icon name={ProjectToken.icon!} width={40} height={40} className="mr-12" />
          <Text type="p1" weight="semibold" color="primary">
            {ProjectToken.symbol}
          </Text>
        </div>
        <div className="flex flow-row">
          <Tooltip
            title={
              <Text type="small" color="primary">
                {formatToken(stakedBalance, {
                  decimals: ProjectToken.decimals,
                })}
              </Text>
            }>
            <Text type="small" weight="semibold" color="secondary" className="mb-4">
              Staked Balance
            </Text>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(stakedBalance)}
            </Text>
          </Tooltip>
        </div>
        <div className="flex flow-row">
          <Tooltip
            title={
              <Text type="small" color="primary">
                {formatToken(walletBalance, {
                  decimals: ProjectToken.decimals,
                })}
              </Text>
            }>
            <Text type="small" weight="semibold" color="secondary" className="mb-4">
              Wallet Balance
            </Text>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(walletBalance)}
            </Text>
          </Tooltip>
        </div>
      </div>

      <div className="flex flow-row row-gap-32 p-24">
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-4">
            Amount
          </Text>
          <TokenAmount
            before={<Icon name={ProjectToken.icon!} width={24} height={24} />}
            value={amount}
            onChange={setAmount}
            max={maxAmount.toNumber()}
            placeholder={`0 (Max ${maxAmount.toNumber()})`}
            disabled={isSubmitting}
            slider
          />
        </div>
        <Alert message="Locked balances are not available for withdrawal until the timer ends. Withdrawal means you will stop earning staking rewards for the amount withdrawn." />
        <div className="flex justify-end">
          <button type="submit" className="button-primary" disabled={isSubmitting} onClick={handleWithdraw}>
            <AntdSpin spinning={isSubmitting} />
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletWithdrawView;
