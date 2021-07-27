import React, { ReactElement, ReactNode } from 'react';
import {
  ArrayPath,
  FieldValues,
  FormProvider,
  useController,
  useFieldArray,
  useForm as rhUseForm,
  UseFormReturn as rhUseFormReturn,
  useFormState,
} from 'react-hook-form';
import { UseControllerReturn } from 'react-hook-form/dist/types';
import { UseFieldArrayReturn } from 'react-hook-form/dist/types/fieldArray';
import { DefaultValues, UnpackNestedValue } from 'react-hook-form/dist/types/form';
import { Resolver, ResolverResult } from 'react-hook-form/dist/types/resolvers';
import { FieldPath, FieldPathValue } from 'react-hook-form/dist/types/utils';
import classnames from 'classnames';
import { validate } from 'valirator';

import { Hint, Text } from 'components/custom/typography';
import { CP, FCx } from 'components/types.tx';

import s from './s.module.scss';

const ConditionalWrapper = ({ condition, wrapper, children }) => (condition ? wrapper(children) : children);

type ValiratorCustomRule<V extends FieldValues = FieldValues, P extends keyof V = keyof V> = (
  value: V[P],
  exp: any,
  obj: V,
  property: P,
) => undefined | boolean | Promise<undefined | boolean>;

type ValiratorRulesType<V extends FieldValues = FieldValues, P extends keyof V = keyof V> = Partial<{
  required: boolean | ValiratorCustomRule<V, P>;
  type: 'boolean' | 'number' | 'string' | 'date' | 'object' | 'array' | ValiratorCustomRule<V, P>;
  pattern: string | RegExp | ValiratorCustomRule<V, P>;
  format: string | ValiratorCustomRule<V, P>;
  enum: any | ValiratorCustomRule<V, P>;
  min: number | ValiratorCustomRule<V, P>;
  max: number | ValiratorCustomRule<V, P>;
  minLength: number | ValiratorCustomRule<V, P>;
  maxLength: number | ValiratorCustomRule<V, P>;
  minItems: number | ValiratorCustomRule<V, P>;
  maxItems: number | ValiratorCustomRule<V, P>;
  lessThan: any | ValiratorCustomRule<V, P>;
  lessThanProperty: string | ValiratorCustomRule<V, P>;
  moreThan: any | ValiratorCustomRule<V, P>;
  moreThanProperty: string | ValiratorCustomRule<V, P>;
  matchTo: any | ValiratorCustomRule<V, P>;
  matchToProperty: string | ValiratorCustomRule<V, P>;
  matchToProperties: string[] | ValiratorCustomRule<V, P>;
  notMatchTo: any | ValiratorCustomRule<V, P>;
  notMatchToProperty: string | ValiratorCustomRule<V, P>;
  notMatchToProperties: string[] | ValiratorCustomRule<V, P>;
  uniqueItems: boolean | ValiratorCustomRule<V, P>;
  divisibleBy: number | ValiratorCustomRule<V, P>;
  [customRule: string]: ValiratorCustomRule<V, P> | any;
}>;

type SchemeType<V extends FieldValues = FieldValues> = {
  [P in keyof V]?: {
    rules: ValiratorRulesType<V, P>;
    messages: {
      [M in keyof ValiratorRulesType<V, P>]:
      | string
      | ((actual: any, expected: any, property: string, obj: V) => string);
    };
  };
};

type FormContext<V extends FieldValues = FieldValues> = {
  scheme?: SchemeType<V>;
};

type UseFormReturn<V extends FieldValues = FieldValues> = rhUseFormReturn<V> & {
  updateValue: (fieldName: FieldPath<V>, value: UnpackNestedValue<FieldPathValue<V, FieldPath<V>>>) => void;
};

function VFormEmptyResolver<V extends FieldValues = FieldValues>(values: V): ResolverResult {
  return {
    values,
    errors: {},
  };
}

export async function VFormValidationResolver<V extends FieldValues = FieldValues>(
  values: V,
  context?: FormContext<V>,
): Promise<ResolverResult<V>> {
  const validationResult = await validate(context?.scheme, values);
  const errors = validationResult.getErrors();

  return {
    values,
    errors: Object.keys(errors).reduce((res, path) => {
      const errKey = Object.keys(errors[path])[0];

      if (errKey) {
        res[path] = {
          type: errKey,
          message: errors[path][errKey],
        };
      }

      return res;
    }, {}),
  };
}

type useFormProps<V extends FieldValues = FieldValues> = {
  validationScheme?: SchemeType<V>;
  defaultValues?: DefaultValues<V>;
};

export function useForm<V extends FieldValues = FieldValues>(props: useFormProps<V>): UseFormReturn<V> {
  const { validationScheme, defaultValues } = props;

  const resolver = (validationScheme ? VFormValidationResolver : VFormEmptyResolver) as Resolver<V, FormContext<V>>;

  const rhForm = rhUseForm<V, FormContext<V>>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues,
    context: {
      scheme: validationScheme,
    },
    criteriaMode: 'firstError',
    shouldFocusError: false,
    resolver,
    shouldUnregister: true,
  });

  const updateValue = (fieldName: FieldPath<V>, value: UnpackNestedValue<FieldPathValue<V, FieldPath<V>>>) => {
    rhForm.setValue(fieldName, value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return Object.assign(rhForm, {
    updateValue,
  });
}

export type FormProps<V extends FieldValues = FieldValues> = {
  form: UseFormReturn<V>;
  disabled?: boolean;
  onSubmit: (values: UnpackNestedValue<V>) => any | Promise<any>;
};

export function Form<V extends FieldValues = FieldValues>(props: CP<FormProps<V>>) {
  const { children, className, form, disabled = false, onSubmit } = props;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={classnames(s.form, className, disabled && s.disabled)}
        onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset disabled={disabled}>{children}</fieldset>
      </form>
    </FormProvider>
  );
}

export type FieldLabelProps = {
  label: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
};

export const FieldLabel: FCx<FieldLabelProps> = props => {
  const { children, className, label, hint, extra } = props;

  return (
    <div className={classnames('flex flow-row row-gap-8', className)}>
      <div className="flex flow-col col-gap-4 justify-space-between">
        <div className="flex flow-col col-gap-4 align-center">
          <Hint text={hint}>
            {typeof label === 'string' ? (
              <Text type="small" weight="semibold" color="secondary">
                {label}
              </Text>
            ) : (
              label
            )}
          </Hint>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
};

export type FormErrorProps = {
  name: string;
  children?: ReactElement;
};

export function FormError(props: CP<FormErrorProps>) {
  const { children, name } = props;

  const { errors } = useFormState();
  const err = errors[name];

  return err ? (
    <Text type="small" weight="semibold" color="red">
      {err.message ?? children}
    </Text>
  ) : null;
}

export type FormItemProps<V extends FieldValues = FieldValues> = {
  name: FieldPath<V>;
  label?: ReactNode;
  labelProps?: Partial<FieldLabelProps>;
  hideError?: boolean;
  defaultValue?: UnpackNestedValue<FieldPathValue<V, FieldPath<V>>>;
  children: (controller: UseControllerReturn<V>) => ReactElement;
};

export function FormItem<V extends FieldValues = FieldValues>(props: CP<FormItemProps<V>>) {
  const { children, name, label, labelProps = {}, hideError = false, defaultValue } = props;

  const controller = useController<V>({
    name,
    defaultValue,
    shouldUnregister: true,
  });

  return (
    <ConditionalWrapper
      condition={!!label}
      wrapper={children => (
        <FieldLabel label={label} {...labelProps}>
          {children}
        </FieldLabel>
      )}>
      {children(controller)}
      {!hideError && <FormError name={name} />}
    </ConditionalWrapper>
  );
}

export type FormArrayProps<V extends FieldValues = FieldValues> = {
  name: ArrayPath<V>;
  keyName?: string;
  children: (field: UseFieldArrayReturn<V, ArrayPath<V>, string>) => ReactNode;
};

export function FormArray<V extends FieldValues = FieldValues>(props: CP<FormArrayProps<V>>) {
  const { children, name, keyName } = props;

  const fieldArray = useFieldArray<V, ArrayPath<V>, string>({
    name,
    keyName,
    shouldUnregister: true,
  });

  return <>{children(fieldArray)}</>;
}
