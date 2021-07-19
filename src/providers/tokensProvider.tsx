import { FC, createContext, useCallback, useEffect, useRef } from 'react';
import BigNumber from 'bignumber.js';
import { AbiItem } from 'web3-utils';
import Erc20Contract from 'web3/erc20Contract';
import { createAbiItem } from 'web3/web3Contract';

import { useReload } from 'hooks/useReload';
import { MainnetHttpsWeb3Provider } from 'providers/web3Provider';

import { InvariantContext } from 'utils/context';
import { queryfy } from 'utils/fetch';

export enum Tokens {
  WBTC = 'WBTC',
  WETH = 'WETH',
  USDC = 'USDC',
  USDT = 'USDT',
  SUSD = 'sUSD',
  GUSD = 'GUSD',
  DAI = 'DAI',
  STK_AAVE = 'stkAAVE',
  WMATIC = 'wMATIC',
  BOND = 'BOND',
  UNIV2 = 'UNI-V2',
}

export type TokenType = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: BigNumber | undefined;
  icon: string | undefined;
};

const CHAINLINK_PRICE_FEED_ABI: AbiItem[] = [
  createAbiItem('decimals', [], ['int8']),
  createAbiItem('latestAnswer', [], ['int256']),
];

const UNISWAP_V2_BOND_USDC_ABI: AbiItem[] = [
  createAbiItem('totalSupply', [], ['uint256']),
  createAbiItem('getReserves', [], ['uint112', 'uint112']),
];

export type TokensContextType = {
  getToken(symbol?: string): TokenType | undefined;
};

const Context = createContext<TokensContextType>(InvariantContext('TokensProvider'));

function getTokenAddress(symbol: string): string | undefined {
  switch (symbol) {
    case Tokens.WBTC:
      return '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
    case Tokens.WETH:
      return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    case Tokens.USDC:
      return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    case Tokens.USDT:
      return '0xdac17f958d2ee523a2206206994597c13d831ec7';
    case Tokens.SUSD:
      return '0x57ab1ec28d129707052df4df418d58a2d46d5f51';
    case Tokens.DAI:
      return '0x6b175474e89094c44da98b954eedeac495271d0f';
    case Tokens.STK_AAVE:
      return '0x4da27a545c0c5b758a6ba100e3a049001de870f5';
    case Tokens.WMATIC:
      return '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0';
    case Tokens.GUSD:
      return '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd';
    case Tokens.BOND:
      return '0x0391d2021f89dc339f60fff84546ea23e337750f';
    case Tokens.UNIV2:
      return '0x6591c4bcd6d7a1eb4e537da8b78676c1576ba244';
    default:
      return undefined;
  }
}

function getTokenIcon(symbol: string): string | undefined {
  switch (symbol) {
    case Tokens.WBTC:
      return 'token-wbtc';
    case Tokens.WETH:
      return 'token-weth';
    case Tokens.USDC:
      return 'token-usdc';
    case Tokens.USDT:
      return 'token-usdt';
    case Tokens.SUSD:
      return 'token-susd';
    case Tokens.DAI:
      return 'token-dai';
    case Tokens.STK_AAVE:
      return 'static/token-staked-aave';
    case Tokens.WMATIC:
      return 'token-wmatic';
    case Tokens.GUSD:
      return 'token-gusd';
    case Tokens.BOND:
      return 'static/token-bond';
    case Tokens.UNIV2:
      return 'static/token-uniswap';
    default:
      return undefined;
  }
}

async function getChainlinkFeedPrice(feedAddress: string): Promise<BigNumber | undefined> {
  const contract = new Erc20Contract(CHAINLINK_PRICE_FEED_ABI, feedAddress);
  contract.setCallProvider(MainnetHttpsWeb3Provider);

  const [decimals, latestAnswer] = await contract.batch([
    { method: 'decimals', transform: Number },
    { method: 'latestAnswer', transform: BigNumber.from },
  ]);

  return latestAnswer?.unscaleBy(decimals);
}

async function getGusdPrice(): Promise<BigNumber | undefined> {
  const query = queryfy({
    ids: ['gemini-dollar'],
    vs_currencies: 'usd',
  });

  const url = new URL(`/api/v3/simple/price?${query}`, 'https://api.coingecko.com');
  const result = await fetch(String(url)).then(response => response.json());

  return BigNumber.from(result['gemini-dollar'].usd);
}

async function getBondPrice(poolAddress: string): Promise<BigNumber | undefined> {
  const contract = new Erc20Contract(UNISWAP_V2_BOND_USDC_ABI, poolAddress);
  contract.setCallProvider(MainnetHttpsWeb3Provider);

  const [[reserve0, reserve1]] = await contract.batch([
    {
      method: 'getReserves',
      transform: ({ 0: reserve0, 1: reserve1 }) => [BigNumber.from(reserve0), BigNumber.from(reserve1)],
    },
  ]);

  const bondReserve = reserve0.unscaleBy(18);
  const usdcReserve = reserve1.unscaleBy(6);

  return usdcReserve?.dividedBy(bondReserve);
}

async function getUniV2Price(poolAddress: string): Promise<BigNumber | undefined> {
  const contract = new Erc20Contract(UNISWAP_V2_BOND_USDC_ABI, poolAddress);
  contract.setCallProvider(MainnetHttpsWeb3Provider);

  const [reserve1, totalSupply] = await contract.batch([
    {
      method: 'getReserves',
      transform: ({ 1: reserve1 }) => BigNumber.from(reserve1),
    },
    { method: 'totalSupply', transform: BigNumber.from },
  ]);

  const usdcReserve = reserve1.unscaleBy(6);
  const supply = totalSupply.unscaleBy(18);

  return usdcReserve?.dividedBy(supply).multipliedBy(2);
}

async function getPriceFor(symbol: string): Promise<BigNumber | undefined> {
  switch (symbol) {
    case Tokens.WBTC:
      return getChainlinkFeedPrice('0xf4030086522a5beea4988f8ca5b36dbc97bee88c'); // Chainlink: BTC/USD
    case Tokens.WETH:
      return getChainlinkFeedPrice('0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419'); // Chainlink: ETH/USD
    case Tokens.USDC:
      return getChainlinkFeedPrice('0x8fffffd4afb6115b954bd326cbe7b4ba576818f6'); // Chainlink: USDC/USD
    case Tokens.USDT:
      return getChainlinkFeedPrice('0x3e7d1eab13ad0104d2750b8863b489d65364e32d'); // Chainlink: USDT/USD
    case Tokens.SUSD:
      return getChainlinkFeedPrice('0xad35bd71b9afe6e4bdc266b345c198eadef9ad94'); // Chainlink: sUSD/USD
    case Tokens.DAI:
      return getChainlinkFeedPrice('0xaed0c38402a5d19df6e4c03f4e2dced6e29c1ee9'); // Chainlink: DAI/USD
    case Tokens.STK_AAVE:
      return getChainlinkFeedPrice('0x547a514d5e3769680ce22b2361c10ea13619e8a9'); // Chainlink: STK_AAVE/USD
    case Tokens.WMATIC:
      return getChainlinkFeedPrice('0x7bac85a8a13a4bcd8abb3eb7d6b4d632c5a57676'); // Chainlink: MATIC/USD
    case Tokens.GUSD:
      return getGusdPrice(); // Coingecko API: GUSD/USD
    case Tokens.BOND:
      return getBondPrice('0x6591c4bcd6d7a1eb4e537da8b78676c1576ba244'); // UNISWAP V2: BOND/USDC
    case Tokens.UNIV2:
      return getUniV2Price('0x6591c4bcd6d7a1eb4e537da8b78676c1576ba244'); // UNISWAP V2: BOND/USDC
    default:
      return undefined;
  }
}

const TokensProvider: FC = props => {
  const { children } = props;

  const [reload] = useReload();
  const tokensRef = useRef<Map<string, TokenType>>(new Map());

  useEffect(() => {
    const promises = [
      Tokens.WBTC,
      Tokens.WETH,
      Tokens.USDC,
      Tokens.USDT,
      Tokens.SUSD,
      Tokens.GUSD,
      Tokens.DAI,
      Tokens.STK_AAVE,
      Tokens.WMATIC,
      Tokens.BOND,
      Tokens.UNIV2,
    ].map(async symbol => {
      const tokenAddress = getTokenAddress(symbol);

      if (!tokenAddress) {
        return;
      }

      try {
        const tokenContract = new Erc20Contract([], tokenAddress);
        tokenContract.setCallProvider(MainnetHttpsWeb3Provider);
        await tokenContract.loadCommon();

        const tokenObj: TokenType = {
          address: tokenAddress,
          symbol: tokenContract.symbol!,
          name: tokenContract.name,
          decimals: tokenContract.decimals!,
          price: undefined,
          icon: getTokenIcon(symbol),
        };

        tokensRef.current.set(symbol, tokenObj);
        tokenObj.price = await getPriceFor(symbol);
        reload();
      } catch (e) {
        console.error(e);
      }
    });

    (async () => {
      await Promise.all(promises);

      const usdcToken = tokensRef.current.get(Tokens.USDC);

      if (usdcToken && usdcToken.price) {
        const usdcPrice = usdcToken.price;

        // convert USDC -> USD
        [Tokens.BOND, Tokens.UNIV2].map(symbol => {
          const token = tokensRef.current.get(symbol);

          if (token) {
            token.price = token.price?.multipliedBy(usdcPrice);
          }
        });
      }

      Array.from(tokensRef.current).forEach(([k, t]) => {
        console.log(`[New Token Price] ${t.symbol} = $${t.price?.toFixed(3)}`);
      });
    })();
  }, []);

  const getToken = useCallback((symbol: string | undefined): TokenType | undefined => {
    return symbol ? tokensRef.current.get(symbol) : undefined;
  }, []);

  const value: TokensContextType = {
    getToken,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default TokensProvider;
