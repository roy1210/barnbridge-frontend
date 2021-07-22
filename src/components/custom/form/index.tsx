import React, { FormEvent, ReactElement, ReactNode, createContext, useCallback, useContext } from 'react';
import { Controller, FieldValues, useForm as rhUseForm, UseFormReturn as rhUseFormReturn } from 'react-hook-form';
import { UseFormStateReturn } from 'react-hook-form/dist/types';
import { ControllerFieldState, ControllerRenderProps } from 'react-hook-form/dist/types/controller';
import { DefaultValues, UnpackNestedValue } from 'react-hook-form/dist/types/form';
import { Resolver, ResolverResult } from 'react-hook-form/dist/types/resolvers';
import { FieldPath, FieldPathValue } from 'react-hook-form/dist/types/utils';
import classnames from 'classnames';
import { validate } from 'valirator';

import { Hint, Text } from 'components/custom/typography';
import { CP } from 'components/types.tx';

import { InvariantContext } from 'utils/context';

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
  submit: () => void | Promise<void>;
};

type InternalContextType<V extends FieldValues = FieldValues> = {
  form: UseFormReturn<V>;
};

const InternalContext = createContext<InternalContextType<FieldValues>>(InvariantContext('Form'));

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
  onSubmit: (values: UnpackNestedValue<V>) => any | Promise<any>;
};

export function useForm<V extends FieldValues = FieldValues>(props: useFormProps<V>): UseFormReturn<V> {
  const { validationScheme, defaultValues, onSubmit } = props;

  const resolver = (validationScheme ? VFormValidationResolver : VFormEmptyResolver) as Resolver<V, FormContext<V>>;

  const rhForm = rhUseForm<V, FormContext<V>>({
    mode: 'all',
    resolver,
    context: {
      scheme: validationScheme,
    },
    defaultValues,
    shouldUnregister: true,
  });

  const submit = rhForm.handleSubmit(onSubmit);

  const updateValue = (fieldName: FieldPath<V>, value: UnpackNestedValue<FieldPathValue<V, FieldPath<V>>>) => {
    rhForm.setValue(fieldName, value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return Object.assign(rhForm, {
    updateValue,
    submit,
  });
}

export type FormProps<V extends FieldValues = FieldValues> = {
  form: UseFormReturn<V>;
  disabled?: boolean;
};

export function Form<V extends FieldValues = FieldValues>(props: CP<FormProps<V>>) {
  const { children, className, form, disabled = false } = props;

  const handleSubmit = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault();
      form.submit();
    },
    [form.submit],
  );

  const value = {
    form,
  } as InternalContextType;

  return (
    <InternalContext.Provider value={value}>
      <form className={classnames(s.form, className, disabled && s.disabled)} onSubmit={handleSubmit}>
        <fieldset disabled={disabled}>{children}</fieldset>
      </form>
    </InternalContext.Provider>
  );
}

export type FieldLabelProps = {
  label: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
};

export function FieldLabel(props: CP<FieldLabelProps>) {
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
}

export type FormErrorProps = {
  name: string;
  children?: ReactElement;
};

export function FormError(props: CP<FormErrorProps>) {
  const { children, name } = props;
  const { form } = useContext(InternalContext);

  const err = form.formState.errors[name];

  if (!err) {
    return null;
  }

  return (
    <Text type="small" weight="semibold" color="red">
      {err.message ?? children}
    </Text>
  );
}

export type FormItemRender = {
  field: ControllerRenderProps<FieldValues, string>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<FieldValues>;
};

export type FormItemProps = {
  name: string;
  label?: ReactNode;
  labelProps?: Partial<FieldLabelProps>;
  showError?: boolean;
  children: (field: FormItemRender) => ReactElement;
};

export function FormItem(props: CP<FormItemProps>) {
  const { children, name, label, labelProps = {}, showError = true } = props;
  const { form } = useContext(InternalContext);

  return (
    <ConditionalWrapper
      condition={!!label}
      wrapper={children => (
        <FieldLabel label={label} {...labelProps}>
          {children}
        </FieldLabel>
      )}>
      <Controller name={name} control={form.control} render={children} shouldUnregister />
      {showError && <FormError name={name} />}
    </ConditionalWrapper>
  );
}
