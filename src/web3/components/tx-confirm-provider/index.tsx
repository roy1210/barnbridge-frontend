import React, { FC, ReactNode, createContext, useCallback, useContext, useRef, useState } from 'react';

import Modal from 'components/antd/modal';
import GasFeeList, { GasFeeOption } from 'components/custom/gas-fee-list';
import { Hint, Text } from 'components/custom/typography';

type TxConfirmValues = {
  gasPrice: number;
} & Record<string, any>;

type TxConfirmRenderArgs = {
  values: TxConfirmValues;
  setValue: (fieldName: string, value: any) => void;
};

type RenderElement = ReactNode | ((args: TxConfirmRenderArgs) => ReactNode);

type TxConfirmArgs = {
  header?: RenderElement;
  body?: RenderElement;
  submitText?: string;
};

type TxConfirmType = {
  confirm: (args?: TxConfirmArgs) => Promise<TxConfirmValues>;
};

const TxConfirmContext = createContext<TxConfirmType>({
  confirm: () => Promise.reject(),
});

export function useTxConfirm(): TxConfirmType {
  return useContext(TxConfirmContext);
}

const TxConfirmProvider: FC = props => {
  const confirmResolve = useRef<Function | undefined>();
  const confirmReject = useRef<Function | undefined>();
  const [confirmArgs, setConfirmArgs] = useState<TxConfirmArgs | undefined>();

  const [values, setValues] = useState<Record<string, any>>({});
  const valuesRef = useRef<Record<string, any>>(values);
  valuesRef.current = values;

  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setValues(prevState => ({
      ...prevState,
      [fieldName]: value,
    }));
  }, []);

  const renderElement = useCallback(
    (element: ReactNode) => {
      if (typeof element === 'function') {
        return element?.({
          values: valuesRef.current,
          setValue: setFieldValue,
        });
      }

      return element;
    },
    [setFieldValue],
  );

  const confirm = useCallback((args: TxConfirmArgs = {}) => {
    setConfirmArgs(args);

    const promise = new Promise<any>((resolve, reject) => {
      confirmResolve.current = () => {
        setConfirmArgs(undefined);
        resolve({
          ...valuesRef.current,
          gasPrice: valuesRef.current.gasPrice.value,
        });
      };
      confirmReject.current = () => {
        setConfirmArgs(undefined);
        reject();
      };
    });

    return promise;
  }, []);

  const value = {
    confirm,
  };

  return (
    <TxConfirmContext.Provider value={value}>
      {props.children}
      {confirmArgs && (
        <Modal width={560} onCancel={() => confirmReject.current?.()}>
          {confirmArgs.header && renderElement(confirmArgs.header)}
          <div className="flex flow-row">
            {confirmArgs.body && renderElement(confirmArgs.body)}

            <div className="flex flow-row mb-32">
              <Hint text="This value represents the gas price you're willing to pay for each unit of gas. Gwei is the unit of ETH typically used to denominate gas prices and generally, the more gas fees you pay, the faster the transaction will be mined.">
                <Text type="small" weight="semibold" color="secondary" className="mb-8">
                  Gas Fee (Gwei)
                </Text>
              </Hint>
              <GasFeeList
                value={valuesRef.current.gasPrice}
                onChange={(value: GasFeeOption) => setFieldValue('gasPrice', value)}
              />
            </div>

            <button type="button" className="button-primary" onClick={() => confirmResolve.current?.()}>
              {confirmArgs.submitText ?? 'Submit'}
            </button>
          </div>
        </Modal>
      )}
    </TxConfirmContext.Provider>
  );
};

export default TxConfirmProvider;
