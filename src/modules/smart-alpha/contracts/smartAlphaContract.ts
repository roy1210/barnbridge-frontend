import BigNumber from 'bignumber.js';
import getUnixTime from 'date-fns/getUnixTime';
import { AbiItem } from 'web3-utils';
import Web3Contract, { createAbiItem } from 'web3/web3Contract';

import { isEthAsset } from 'components/providers/tokensProvider';

const ABI: AbiItem[] = [
  // call
  createAbiItem('epoch', [], ['uint256']),
  createAbiItem('getCurrentEpoch', [], ['uint256']),
  createAbiItem('epoch1Start', [], ['uint256']),
  createAbiItem('epochDuration', [], ['uint256']),

  createAbiItem('epochSeniorLiquidity', [], ['uint256']),
  createAbiItem('epochJuniorLiquidity', [], ['uint256']),
  createAbiItem('epochDownsideProtectionRate', [], ['uint256']),
  createAbiItem('epochUpsideExposureRate', [], ['uint256']),
  createAbiItem('epochEntryPrice', [], ['uint256']),
  createAbiItem('getEpochSeniorTokenPrice', [], ['uint256']),
  createAbiItem('getEpochJuniorTokenPrice', [], ['uint256']),

  createAbiItem('queuedJuniorsUnderlyingIn', [], ['uint256']),
  createAbiItem('queuedJuniorsUnderlyingOut', [], ['uint256']),
  createAbiItem('queuedJuniorTokensBurn', [], ['uint256']),
  createAbiItem('queuedSeniorsUnderlyingIn', [], ['uint256']),
  createAbiItem('queuedSeniorsUnderlyingOut', [], ['uint256']),
  createAbiItem('queuedSeniorTokensBurn', [], ['uint256']),

  createAbiItem('seniorEntryQueue', ['address'], ['uint256', 'uint256']),
  createAbiItem('seniorExitQueue', ['address'], ['uint256', 'uint256']),
  createAbiItem('juniorEntryQueue', ['address'], ['uint256', 'uint256']),
  createAbiItem('juniorExitQueue', ['address'], ['uint256', 'uint256']),

  // send
  createAbiItem('depositJunior', ['uint256'], []),
  createAbiItem('exitJunior', ['uint256'], []),
  createAbiItem('redeemJuniorTokens', [], []),
  createAbiItem('redeemJuniorUnderlying', [], []),
  createAbiItem('depositSenior', ['uint256'], []),
  createAbiItem('exitSenior', ['uint256'], []),
  createAbiItem('redeemSeniorTokens', [], []),
  createAbiItem('redeemSeniorUnderlying', [], []),
];

export const SMART_ALPHA_DECIMALS = 18;

class SmartAlphaContract extends Web3Contract {
  // common
  epoch: number | undefined;
  currentEpoch: number | undefined;
  epoch1Start: number | undefined;
  epochDuration: number | undefined;
  epochSeniorLiquidity: BigNumber | undefined;
  epochJuniorLiquidity: BigNumber | undefined;
  epochDownsideProtectionRate: BigNumber | undefined;
  epochUpsideExposureRate: BigNumber | undefined;
  epochEntryPrice: BigNumber | undefined;
  epochSeniorTokenPrice: BigNumber | undefined;
  epochJuniorTokenPrice: BigNumber | undefined;
  queuedJuniorsUnderlyingIn: BigNumber | undefined;
  queuedJuniorsUnderlyingOut: BigNumber | undefined;
  queuedJuniorTokensBurn: BigNumber | undefined;
  queuedSeniorsUnderlyingIn: BigNumber | undefined;
  queuedSeniorsUnderlyingOut: BigNumber | undefined;
  queuedSeniorTokensBurn: BigNumber | undefined;

  constructor(address: string) {
    super(ABI, address, 'Smart Alpha');
  }

  // computed
  get tillNextEpoch(): number | undefined {
    if (this.currentEpoch === undefined || this.epochDuration === undefined || this.epoch1Start === undefined) {
      return undefined;
    }

    const nextEpochStart = this.epoch1Start + this.currentEpoch * this.epochDuration;
    const now = getUnixTime(Date.now());

    return now < nextEpochStart ? nextEpochStart - now : 0;
  }

  get epochTotalLiquidityRate(): BigNumber | undefined {
    if (!this.epochSeniorLiquidity || !this.epochJuniorLiquidity) {
      return undefined;
    }

    return this.epochSeniorLiquidity.plus(this.epochJuniorLiquidity);
  }

  get epochSeniorLiquidityRate(): number | undefined {
    if (!this.epochSeniorLiquidity || !this.epochTotalLiquidityRate) {
      return undefined;
    }

    return this.epochSeniorLiquidity.div(this.epochTotalLiquidityRate).toNumber();
  }

  get epochJuniorLiquidityRate(): number | undefined {
    if (!this.epochJuniorLiquidity || !this.epochTotalLiquidityRate) {
      return undefined;
    }

    return this.epochJuniorLiquidity.div(this.epochTotalLiquidityRate).toNumber();
  }

  get epochUpsideLeverage(): BigNumber | undefined {
    if (!this.epochSeniorLiquidity || !this.epochJuniorLiquidity || !this.epochUpsideExposureRate) {
      return undefined;
    }

    return this.epochSeniorLiquidity
      .div(this.epochJuniorLiquidity)
      .multipliedBy(new BigNumber(1).minus(this.epochUpsideExposureRate.unscaleBy(SMART_ALPHA_DECIMALS)!))
      .plus(1)
      .scaleBy(SMART_ALPHA_DECIMALS);
  }

  get epochDownsideLeverage(): BigNumber | undefined {
    if (!this.epochSeniorLiquidity || !this.epochJuniorLiquidity) {
      return undefined;
    }

    return this.epochSeniorLiquidity.div(this.epochJuniorLiquidity).plus(1).scaleBy(SMART_ALPHA_DECIMALS);
  }

  async loadCommon() {
    const [
      epoch,
      currentEpoch,
      epoch1Start,
      epochDuration,
      epochSeniorLiquidity,
      epochJuniorLiquidity,
      epochDownsideProtectionRate,
      epochUpsideExposureRate,
      epochEntryPrice,
      epochSeniorTokenPrice,
      epochJuniorTokenPrice,
      queuedJuniorsUnderlyingIn,
      queuedJuniorsUnderlyingOut,
      queuedJuniorTokensBurn,
      queuedSeniorsUnderlyingIn,
      queuedSeniorsUnderlyingOut,
      queuedSeniorTokensBurn,
    ] = await this.batch([
      { method: 'epoch' },
      { method: 'getCurrentEpoch' },
      { method: 'epoch1Start' },
      { method: 'epochDuration' },
      { method: 'epochSeniorLiquidity' },
      { method: 'epochJuniorLiquidity' },
      { method: 'epochDownsideProtectionRate' },
      { method: 'epochUpsideExposureRate' },
      { method: 'epochEntryPrice' },
      { method: 'getEpochSeniorTokenPrice' },
      { method: 'getEpochJuniorTokenPrice' },
      { method: 'queuedJuniorsUnderlyingIn' },
      { method: 'queuedJuniorsUnderlyingOut' },
      { method: 'queuedJuniorTokensBurn' },
      { method: 'queuedSeniorsUnderlyingIn' },
      { method: 'queuedSeniorsUnderlyingOut' },
      { method: 'queuedSeniorTokensBurn' },
    ]);

    this.epoch = Number(epoch);
    this.currentEpoch = Number(currentEpoch);
    this.epoch1Start = Number(epoch1Start);
    this.epochDuration = Number(epochDuration);
    this.epochSeniorLiquidity = BigNumber.from(epochSeniorLiquidity);
    this.epochJuniorLiquidity = BigNumber.from(epochJuniorLiquidity);
    this.epochDownsideProtectionRate = BigNumber.from(epochDownsideProtectionRate);
    this.epochUpsideExposureRate = BigNumber.from(epochUpsideExposureRate);
    this.epochEntryPrice = BigNumber.from(epochEntryPrice);
    this.epochSeniorTokenPrice = BigNumber.from(epochSeniorTokenPrice);
    this.epochJuniorTokenPrice = BigNumber.from(epochJuniorTokenPrice);
    this.queuedJuniorsUnderlyingIn = BigNumber.from(queuedJuniorsUnderlyingIn);
    this.queuedJuniorsUnderlyingOut = BigNumber.from(queuedJuniorsUnderlyingOut);
    this.queuedJuniorTokensBurn = BigNumber.from(queuedJuniorTokensBurn);
    this.queuedSeniorsUnderlyingIn = BigNumber.from(queuedSeniorsUnderlyingIn);
    this.queuedSeniorsUnderlyingOut = BigNumber.from(queuedSeniorsUnderlyingOut);
    this.queuedSeniorTokensBurn = BigNumber.from(queuedSeniorTokensBurn);
    this.emit(Web3Contract.UPDATE_DATA);
  }

  getEntryPriceDecimals(oracleSymbol: string) {
    return isEthAsset(oracleSymbol) ? 18 : 8;
  }

  seniorEntryQueue(address: string): Promise<[number, BigNumber | undefined]> {
    return this.call('seniorEntryQueue', [address], {}).then(result => [Number(result[0]), BigNumber.from(result[1])]);
  }

  seniorExitQueue(address: string): Promise<[number, BigNumber | undefined]> {
    return this.call('seniorExitQueue', [address], {}).then(result => [Number(result[0]), BigNumber.from(result[1])]);
  }

  juniorEntryQueue(address: string): Promise<[number, BigNumber | undefined]> {
    return this.call('juniorEntryQueue', [address], {}).then(result => [Number(result[0]), BigNumber.from(result[1])]);
  }

  juniorExitQueue(address: string): Promise<[number, BigNumber | undefined]> {
    return this.call('juniorExitQueue', [address], {}).then(result => [Number(result[0]), BigNumber.from(result[1])]);
  }

  async depositJunior(amount: BigNumber, gasPrice?: number): Promise<void> {
    await this.send('depositJunior', [amount], {}, gasPrice);
  }

  async withdrawJunior(amount: BigNumber, gasPrice?: number): Promise<void> {
    await this.send('exitJunior', [amount], {}, gasPrice);
  }

  async redeemJuniorTokens(gasPrice?: number): Promise<void> {
    await this.send('redeemJuniorTokens', [], {}, gasPrice);
  }

  async redeemJuniorUnderlying(gasPrice?: number): Promise<void> {
    await this.send('redeemJuniorUnderlying', [], {}, gasPrice);
  }

  async depositSenior(amount: BigNumber, gasPrice?: number): Promise<void> {
    await this.send('depositSenior', [amount], {}, gasPrice);
  }

  async withdrawSenior(amount: BigNumber, gasPrice?: number): Promise<void> {
    await this.send('exitSenior', [amount], {}, gasPrice);
  }

  async redeemSeniorTokens(gasPrice?: number): Promise<void> {
    await this.send('redeemSeniorTokens', [], {}, gasPrice);
  }

  async redeemSeniorUnderlying(gasPrice?: number): Promise<void> {
    await this.send('redeemSeniorUnderlying', [], {}, gasPrice);
  }
}

export default SmartAlphaContract;
