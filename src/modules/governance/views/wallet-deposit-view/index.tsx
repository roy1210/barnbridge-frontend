import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import { useTxConfirm } from 'web3/components/tx-confirm-provider';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken } from 'web3/utils';

import Alert from 'components/antd/alert';
import Spin from 'components/antd/spin';
import Tooltip from 'components/antd/tooltip';
import Icon from 'components/custom/icon';
import { TokenAmount } from 'components/custom/token-amount-new';
import { Text } from 'components/custom/typography';
import { ProjectToken } from 'components/providers/known-tokens-provider';
import config from 'config';

import { useDAO } from '../../components/dao-provider';
import WalletDepositConfirmModal from './components/wallet-deposit-confirm-modal';

const WalletDepositView: React.FC = () => {
  const txConfirmCtx = useTxConfirm();
  const daoCtx = useDAO();

  const [amount, setAmount] = useState('');
  const [isApproving, setApproving] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [depositConfirmVisible, showDepositConfirm] = useState(false);

  const tokenContract = ProjectToken.contract as Erc20Contract;
  const walletBalance = tokenContract.balance?.unscaleBy(ProjectToken.decimals);
  const barnAllowance = tokenContract.getAllowanceOf(config.contracts.dao.barn)?.unscaleBy(ProjectToken.decimals);
  const maxAmount = BigNumber.min(walletBalance ?? 0, barnAllowance ?? 0);
  const isNotEnabled = barnAllowance?.eq(BigNumber.ZERO);

  const barnContract = daoCtx.newDaoBarn;
  const stakedBalance = barnContract.balance?.unscaleBy(ProjectToken.decimals);

  async function handleEnableToken() {
    setApproving(true);

    try {
      await tokenContract.approve(true, config.contracts.dao.barn);
    } catch {}

    setApproving(false);
  }

  async function handleDeposit() {
    if (!amount) {
      return;
    }

    const bnAmount = new BigNumber(amount);
    const scaledAmount = bnAmount.scaleBy(ProjectToken.decimals);

    if (!scaledAmount) {
      return;
    }

    if (barnContract.isUserLocked) {
      showDepositConfirm(true);
      return;
    }

    setSubmitting(true);

    try {
      const result = await txConfirmCtx.confirm({
        header: (
          <div className="grid flow-row align-center">
            <Text type="small" weight="semibold" color="secondary" className="mb-4">
              Deposited amount
            </Text>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(bnAmount)} {ProjectToken.symbol}
            </Text>
          </div>
        ),
        submitText: 'Confirm your deposit',
      });

      await barnContract.deposit(scaledAmount, result.gasPrice);
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
        {config.isTestnet && (
          <Link to="/faucets" className="button-ghost ml-auto">
            Faucets
          </Link>
        )}
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
        <Alert message="Deposits made after you have an ongoing lock will be added to the locked balance and will be subjected to the same lock timer." />
        <div className="flex justify-end">
          {isNotEnabled && (
            <button type="button" className="button-ghost mr-24" disabled={isApproving} onClick={handleEnableToken}>
              <Spin spinning={isApproving} />
              Enable
            </button>
          )}
          <button
            type="submit"
            className="button-primary"
            disabled={isNotEnabled || isSubmitting}
            onClick={handleDeposit}>
            <Spin spinning={isSubmitting} />
            Deposit
          </button>
        </div>
      </div>

      {depositConfirmVisible && (
        <WalletDepositConfirmModal
          deposit={new BigNumber(amount)}
          lockDuration={barnContract.userLockedUntil}
          onCancel={() => showDepositConfirm(false)}
          onOk={() => {
            showDepositConfirm(false);
            handleDeposit().catch(Error);
          }}
        />
      )}
    </div>
  );
};

export default WalletDepositView;
