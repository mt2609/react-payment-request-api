import * as React from 'react';

import { AnyComponent } from './utils';
import normalizeInstrumentations from './normalizeInstrumentations';
import {
  PaymentRequestParamsConfig,
  PaymentRequestParams,
  Callback,
  Resolve,
  Reject,
} from './types';

let request: PaymentRequest;

const isSupported = () => !!(window as any).PaymentRequest; // tslint:disable-line:no-any

const addEventListener = (requestListener: PaymentRequest, event: string, callback?: Callback) => {
  if (!!callback) {
    requestListener.addEventListener(
      event,
      (e: PaymentRequestUpdateEvent) => e.updateWith(
        new Promise((resolve: Resolve, reject: Reject) => callback(requestListener, resolve, reject))
      )
    );
  }
};

export const abort = () => request.abort();

export const show = (params: PaymentRequestParams) => () => {
  request = new PaymentRequest(
    normalizeInstrumentations(params.methodData),
    params.details,
    params.options || {}
  );

  addEventListener(request, 'shippingaddresschange', params.onShippingAddressChange);
  addEventListener(request, 'shippingoptionchange', params.onShippingOptionChange);

  request.show()
    .then((paymentResponse) => {
      return new Promise((resolve: Resolve, reject: Reject) =>
        params.onShowSuccess(paymentResponse, resolve, reject))
          .then(() => paymentResponse.complete('success'))
          .catch(() => paymentResponse.complete('fail'));
    })
    .catch((err) => params.onShowFail(err));
};

const paymentRequest = <TProps extends Object>() => (
  WrappedComponent: AnyComponent<TProps, any> // tslint:disable-line:no-any
): React.ComponentClass<TProps & PaymentRequestParamsConfig> => (
  class ExtendedComponent extends React.Component<TProps & PaymentRequestParamsConfig, void> {
    render() {
      const { config, ...rest } = this.props as any; // tslint:disable-line:no-any
      if (!isSupported() || !config) {
        return <WrappedComponent {...rest} isSupported={false} />;
      }
      return (
        <WrappedComponent
          {...rest}
          isSupported={true}
          show={show(config)}
          abort={abort}
        />
      );
    }
  }
);

export default paymentRequest;
