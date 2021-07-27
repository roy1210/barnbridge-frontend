import { FC, ReactNode, useMemo, useState } from 'react';
import AntdTypography from 'antd/lib/typography';
import cn from 'classnames';
import { AbiDecodeResult, AbiFunctionFragment, AbiInterface } from 'web3/abiInterface';
import { shortenAddr } from 'web3/utils';

import PopoverMenu, { PopoverMenuItem } from 'components/antd/popover-menu';
import ExpandableCard, { ExpandableCardProps } from 'components/custom/expandable-card';
import { ExplorerAddressLink } from 'components/custom/externalLink';
import Icon from 'components/custom/icon';
import { Text } from 'components/custom/typography';
import DeleteProposalActionModal from 'modules/governance/components/delete-proposal-action-modal';

import s from './s.module.scss';

type Props = ExpandableCardProps & {
  title: ReactNode;
  target: string;
  signature: string;
  callData: string;
  showSettings?: boolean;
  onDeleteAction?: () => void;
  onEditAction?: () => void;
};

const ProposalActionCard: FC<Props> = props => {
  const {
    className,
    title,
    target,
    signature,
    callData,
    showSettings,
    onDeleteAction,
    onEditAction,
    children,
    ...cardProps
  } = props;

  const [ellipsis, setEllipsis] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isSignature, showSignature] = useState(false);
  const [isDeleteActionModal, showDeleteActionModal] = useState(false);

  const functionFragment = useMemo<AbiFunctionFragment | undefined>(() => {
    return AbiInterface.getFunctionFragmentFrom(signature);
  }, [signature]);

  const functionParamValues = useMemo<AbiDecodeResult | undefined>(() => {
    if (!functionFragment) {
      return [];
    }

    return AbiInterface.decodeFunctionData(functionFragment, callData) ?? [];
  }, [functionFragment, callData]);

  const stringParams = useMemo<string>(() => {
    const params = functionParamValues?.map(param => AbiInterface.stringifyParamValue(param));
    return params?.join(',\n') ?? '';
  }, [functionParamValues]);

  const ActionMenuItems: PopoverMenuItem[] = [
    {
      key: 'sig',
      icon: <Icon name="chevron-right" />,
      title: (
        <Text type="p1" weight="semibold">
          {isSignature ? 'Show transaction' : 'Show function signature'}
        </Text>
      ),
    },
    {
      key: 'edit',
      icon: <Icon name="pencil-outlined" />,
      title: 'Edit action',
    },
    {
      key: 'delete',
      icon: <Icon name="bin-outlined" color="red" />,
      title: (
        <Text type="p1" weight="semibold" color="red">
          Delete action
        </Text>
      ),
    },
  ];

  return (
    <ExpandableCard
      className={className}
      title={
        <Text type="p2" weight="semibold" color="primary">
          {title}
        </Text>
      }
      extra={
        showSettings ? (
          <PopoverMenu
            items={ActionMenuItems}
            placement="bottomLeft"
            onClick={key => {
              if (key === 'sig') {
                showSignature(prevState => !prevState);
              } else if (key === 'edit') {
                onEditAction?.();
              } else if (key === 'delete') {
                showDeleteActionModal(true);
              }
            }}>
            <button type="button" className="button-text">
              <Icon name="gear" />
            </button>
          </PopoverMenu>
        ) : (
          <button
            type="button"
            className="button-text"
            onClick={() => {
              showSignature(prevState => !prevState);
            }}>
            <Text type="small" weight="semibold" color="secondary">
              {isSignature ? 'Show transaction' : 'Show function signature'}
            </Text>
          </button>
        )
      }
      footer={
        ellipsis || expanded ? (
          <div className="flex flow-col align-center justify-center">
            <button
              type="button"
              className="button-text"
              onClick={() => {
                setExpanded(prevState => !prevState);
              }}>
              <Text type="small" weight="semibold" color="secondary">
                {expanded ? 'Hide details' : 'Show more'}
              </Text>
            </button>
          </div>
        ) : null
      }
      {...cardProps}>
      <div className={s.content}>
        <ExplorerAddressLink address={target} query="#writeContract">
          <Text type="p1" weight="semibold" className={s.address} color="blue">
            {shortenAddr(target)}
          </Text>
        </ExplorerAddressLink>
        {signature && (
          <AntdTypography.Paragraph
            className={cn(s.paragraph, expanded && s.expanded)}
            style={{ maxWidth: '514px', overflowWrap: 'anywhere' }}
            ellipsis={{
              rows: expanded ? 9999 : 2,
              expandable: false,
              onEllipsis: isEllipsis => {
                setEllipsis(isEllipsis);

                if (isEllipsis) {
                  setExpanded(!isEllipsis);
                }
              },
            }}>
            .{isSignature ? signature : `${functionFragment?.name}(${stringParams})`}
          </AntdTypography.Paragraph>
        )}
      </div>
      {isDeleteActionModal && (
        <DeleteProposalActionModal
          onCancel={() => {
            showDeleteActionModal(false);
          }}
          onOk={() => {
            showDeleteActionModal(false);
            onDeleteAction?.();
          }}
        />
      )}
    </ExpandableCard>
  );
};

export default ProposalActionCard;
