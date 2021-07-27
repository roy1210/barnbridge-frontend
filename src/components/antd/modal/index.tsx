import { FC, MouseEvent, ReactNode } from 'react';
import AntdModal, { ModalProps as AntdModalProps } from 'antd/lib/modal';
import cn from 'classnames';

import Button from 'components/antd/button';
import Icon from 'components/custom/icon';
import { Text } from 'components/custom/typography';

import s from './s.module.scss';

export type ModalProps = AntdModalProps & {
  onCancel: (e?: MouseEvent<HTMLElement>) => void;
};

const Modal: FC<ModalProps> = props => {
  const { children, className, ...modalProps } = props;

  return (
    <AntdModal
      zIndex={1000}
      className={cn(s.component, className)}
      visible
      centered
      footer={null}
      closeIcon={<Icon name="close-circle-outlined" />}
      {...modalProps}>
      {children}
    </AntdModal>
  );
};

export default Modal;

export type ConfirmActionModalProps = ModalProps & {
  text?: ReactNode;
  content?: ReactNode;
  noBtnText?: ReactNode;
  yesBtnText?: ReactNode;
};

export const ConfirmActionModal: FC<ConfirmActionModalProps> = props => {
  const { text, content, noBtnText = 'No', yesBtnText = 'Yes', ...modalProps } = props;

  return (
    <Modal zIndex={1001} closeIcon={null} {...modalProps}>
      <div className="flex flow-row row-gap-32">
        <Icon name="warning-outlined" width={40} height={40} color="red" />
        {text && (
          <Text type="h3" weight="bold" color="primary">
            {text}
          </Text>
        )}
        {content}
        <div className="flex flow-col justify-space-between">
          <Button type="ghost" onClick={props.onCancel}>
            {noBtnText}
          </Button>
          <Button type="primary" onClick={props.onOk}>
            {yesBtnText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
