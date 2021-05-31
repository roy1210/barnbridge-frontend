import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import cn from 'classnames';
import TxConfirmModal, { ConfirmTxModalArgs } from 'web3/components/tx-confirm-modal';
import { formatPercent, formatToken } from 'web3/utils';

import Spin from 'components/antd/spin';
import Tooltip from 'components/antd/tooltip';
import Icon from 'components/custom/icon';
import IconBubble from 'components/custom/icon-bubble';
import IconsSet from 'components/custom/icons-set';
import { Hint, Text } from 'components/custom/typography';
import {
  BondToken,
  KnownTokens,
  ProjectToken,
  StkAaveToken,
  getTokenBySymbol,
} from 'components/providers/known-tokens-provider';
import { SYRewardPoolEntity } from 'modules/smart-yield/models/syRewardPoolEntity';
import { getKnownMarketById } from 'modules/smart-yield/providers/markets';
import { useWallet } from 'wallets/wallet';

import s from './s.module.scss';

export type PoolCardProps = {
  className?: string;
  pool: SYRewardPoolEntity;
};

export const PoolCard: FC<PoolCardProps> = props => {
  const { className, pool } = props;

  const { smartYield, rewardPool, apr } = pool;
  const rewardTokens = Array.from(pool.rewardTokens.values());

  const poolMarket = getKnownMarketById(pool.meta.protocolId);
  const uToken = getTokenBySymbol(pool.meta.underlyingSymbol);

  const walletCtx = useWallet();

  const [activeTab, setActiveTab] = useState<'pool' | 'my'>('pool');
  const [confirmClaimVisible, setConfirmClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  function handleClaim() {
    pool.loadClaims();
    setConfirmClaim(true);
  }

  const confirmClaimPoolReward = async <A extends ConfirmTxModalArgs>(args: A) => {
    setConfirmClaim(false);
    setClaiming(true);

    try {
      await rewardPool.sendClaimAll(args.gasPrice);
    } catch {}

    setClaiming(false);
  };

  return (
    <>
      <section className={cn(s.card, className)}>
        <header className={s.header}>
          <IconBubble
            name={uToken?.icon}
            bubbleName={ProjectToken.icon!}
            secondBubbleName={poolMarket?.icon.active}
            width={36}
            height={36}
            className="mr-16"
          />
          <Text type="p1" weight="semibold">
            {smartYield.symbol}
          </Text>
        </header>
        <div className={s.tabs}>
          <div className={cn(s.tabSelection, activeTab === 'my' && s.toggled)} />
          <button
            type="button"
            className={cn(s.tab, activeTab === 'pool' && s.active)}
            onClick={() => setActiveTab('pool')}>
            Pool statistics
          </button>
          <button
            type="button"
            className={cn(s.tab, activeTab === 'my' && s.active)}
            disabled={!walletCtx.isActive}
            onClick={() => setActiveTab('my')}>
            My statistics
          </button>
        </div>
        {activeTab === 'pool' && (
          <dl>
            <div className={s.defRow}>
              <dt>APR</dt>
              <dd className="apr-label-r">
                {pool.meta.poolType === 'MULTI' ? (
                  <IconsSet
                    className="mr-4"
                    icons={[
                      <Icon key={BondToken.symbol} width={16} height={16} name={BondToken.icon!} />,
                      <Icon key={StkAaveToken.symbol} width={16} height={16} name={StkAaveToken.icon!} />,
                    ]}
                  />
                ) : (
                  <Icon width={16} height={16} name="static/token-bond" className="mr-4" />
                )}
                {formatPercent(apr)}
              </dd>
            </div>
            {rewardTokens.map(rewardToken => (
              <React.Fragment key={rewardToken.symbol}>
                {rewardToken.symbol === KnownTokens.BOND ? (
                  <div className={s.defRow}>
                    <dt>
                      <Hint text={`This number shows the $${rewardToken.symbol} token rewards distributed per day.`}>
                        {rewardToken.symbol} daily reward
                      </Hint>
                    </dt>
                    <dd>
                      <Icon name={rewardToken.icon!} className="mr-8" width="16" height="16" />
                      {formatToken(rewardPool.getDailyRewardFor(rewardToken.address), {
                        scale: rewardToken.decimals,
                      }) ?? '-'}
                    </dd>
                  </div>
                ) : null}
                <div className={s.defRow}>
                  <dt>
                    {rewardToken.symbol === KnownTokens.BOND ? (
                      <Hint text={`This number shows the $${rewardToken.symbol} token rewards remaining.`}>
                        {rewardToken.symbol} reward left
                      </Hint>
                    ) : (
                      <Hint
                        text={`This number shows the stkAAVE amount currently accrued by the pool. This amount is claimable, pro-rata, by the current pool participants. Any future deposits will only have a claim on rewards that accrue after that date.`}>
                        {rewardToken.symbol} reward balance
                      </Hint>
                    )}
                  </dt>
                  <dd>
                    <Icon name={rewardToken.icon!} className="mr-8" width="16" height="16" />
                    {formatToken(rewardPool.getRewardLeftFor(rewardToken.address), {
                      scale: rewardToken.decimals,
                    }) ?? '-'}
                  </dd>
                </div>
              </React.Fragment>
            ))}
            <div className={s.defRow}>
              <dt>Pool balance</dt>
              <dd>
                <IconBubble
                  name={uToken?.icon}
                  bubbleName={ProjectToken.icon!}
                  secondBubbleName={poolMarket?.icon.active}
                  width={16}
                  height={16}
                  className="mr-8"
                />
                {formatToken(rewardPool.poolSize?.unscaleBy(smartYield.decimals)) ?? '-'}
              </dd>
            </div>
          </dl>
        )}
        {activeTab === 'my' && walletCtx.isActive && (
          <dl>
            <div className={s.defRow}>
              <dt>APR</dt>
              <dd className="apr-label-r">
                {pool.meta.poolType === 'MULTI' ? (
                  <IconsSet
                    className="mr-4"
                    icons={[
                      <Icon key={BondToken.symbol} width={16} height={16} name={BondToken.icon!} />,
                      <Icon key={StkAaveToken.symbol} width={16} height={16} name={StkAaveToken.icon!} />,
                    ]}
                  />
                ) : (
                  <Icon width={16} height={16} name="static/token-bond" className="mr-4" />
                )}
                {formatPercent(apr)}
              </dd>
            </div>
            {rewardTokens.map(rewardToken => (
              <React.Fragment key={rewardToken.address}>
                {rewardToken.symbol === KnownTokens.BOND ? (
                  <div className={s.defRow}>
                    <dt>
                      <Hint
                        text={`This number shows the $${rewardToken.symbol} rewards you would potentially be able to harvest daily, but is subject to change - in case more users deposit, or you withdraw some of your stake.`}>
                        My daily {rewardToken.symbol} reward
                      </Hint>
                    </dt>
                    <dd>
                      <Icon name={rewardToken.icon!} className="mr-8" width="16" height="16" />
                      {formatToken(rewardPool.getMyDailyRewardFor(rewardToken.address), {
                        scale: rewardToken.decimals,
                      }) ?? '-'}
                    </dd>
                  </div>
                ) : null}
                <div className={s.defRow}>
                  <dt>My current {rewardToken.symbol} reward</dt>
                  <dd>
                    <Icon name={rewardToken.icon!} className="mr-8" width="16" height="16" />
                    {formatToken(rewardPool.getClaimFor(rewardToken.address), {
                      scale: rewardToken.decimals,
                    }) ?? '-'}
                  </dd>
                </div>
              </React.Fragment>
            ))}
            <div className={s.defRow}>
              <dt>Staked balance</dt>
              <dd>
                <IconBubble
                  name={uToken?.icon}
                  bubbleName={ProjectToken.icon!}
                  secondBubbleName={poolMarket?.icon.active}
                  width={16}
                  height={16}
                  className="mr-8"
                />
                {formatToken(rewardPool.getBalanceFor(walletCtx.account!)?.unscaleBy(smartYield.decimals)) ?? '-'}
              </dd>
            </div>
          </dl>
        )}
        <footer className={s.footer}>
          <Link className="button-primary full-width" to={`/smart-yield/pool?m=${poolMarket?.id}&t=${uToken?.symbol}`}>
            View pool
          </Link>
          {walletCtx.isActive && activeTab === 'my' && (
            <button
              type="button"
              className="button-ghost"
              // disabled={!rewardPool.pool.toClaim?.gt(BigNumber.ZERO)}
              onClick={handleClaim}>
              {claiming && <Spin type="circle" />}
              Claim
            </button>
          )}
        </footer>
      </section>
      {confirmClaimVisible && (
        <TxConfirmModal
          title="Confirm your claim"
          header={
            <div className="flex justify-center">
              {rewardTokens.map(rewardToken => (
                <Tooltip
                  key={rewardToken.symbol}
                  className="flex col-gap-8 align-center justify-center mr-16"
                  title={
                    formatToken(rewardPool.getClaimFor(rewardToken.address), {
                      decimals: rewardToken.decimals,
                      scale: rewardToken.decimals,
                      tokenName: rewardToken.symbol,
                    }) ?? '-'
                  }>
                  <Text type="h2" weight="semibold" color="primary">
                    {formatToken(rewardPool.getClaimFor(rewardToken.address), {
                      compact: true,
                      scale: rewardToken.decimals,
                    }) ?? '-'}
                  </Text>
                  <Icon name={rewardToken.icon!} width={32} height={32} />
                </Tooltip>
              ))}
            </div>
          }
          submitText="Claim"
          onCancel={() => setConfirmClaim(false)}
          onConfirm={confirmClaimPoolReward}
        />
      )}
    </>
  );
};
