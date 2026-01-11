import { ErrorObject } from '@smbcheeky/error-object';
import { buildSummariesFromObject, buildSummaryFromObject, findNestedValueForPath } from './builder';
import {
  DEFAULT_BUILD_OPTIONS,
  ErrorObjectBuildOptions,
  ErrorObjectErrorResult,
  ErrorObjectProcessingError,
  ErrorSummary,
} from './utils';

export * from './utils';

/**
 * The {@link ErrorObjectFromPayload} class is an alternative way to create an {@link ErrorObject} from anything
 * resembling an error, even request payloads. It also chains errors using the `.setNextErrors()` method.
 */
export class ErrorObjectFromPayload extends ErrorObject {
  static DEFAULT_FALLBACK_TAG = 'fallback-error-object';

  nextErrors?: ErrorObjectFromPayload[];

  constructor(props: any, withOptions?: Partial<ErrorObjectBuildOptions>) {
    if (
      'code' in props &&
      props.code !== undefined &&
      props.code !== null &&
      typeof props.code === 'string' &&
      'message' in props &&
      props.message !== undefined &&
      props.message !== null &&
      typeof props.message === 'string'
    ) {
      super(props);
    } else {
      const options: ErrorObjectBuildOptions = {
        ...DEFAULT_BUILD_OPTIONS,
        ...(withOptions ?? {}),
      };
      let checksFailed: ErrorObjectErrorResult | undefined;
      try {
        checksFailed = ErrorObjectFromPayload.checkInputForInitialObject(props, options);
      } catch (error) {
        super({
          code: 'INT-1',
          message: `Error during checkInputForInitialObject(). Details: ${error?.toString?.() ?? ErrorObject.DEFAULT_GENERIC_MESSAGE}}`,
          tag: ErrorObjectFromPayload.DEFAULT_FALLBACK_TAG,
          raw: {
            error,
          },
        });
        return;
      }
      if (checksFailed !== undefined) {
        super({
          code: ErrorObjectFromPayload.DEFAULT_GENERIC_CODE,
          message: ErrorObjectFromPayload.DEFAULT_GENERIC_MESSAGE,
          tag: ErrorObjectFromPayload.DEFAULT_FALLBACK_TAG,
          raw: {
            processingErrors: [{ errorCode: checksFailed, summary: undefined }],
          },
        });
        return;
      }

      try {
        const { validErrors, summaries, processingErrors } = ErrorObjectFromPayload.processErrorObjectResult(
          props,
          options,
        );

        if (validErrors.length > 0) {
          const [firstError, ...rawNextErrors] = validErrors;
          if (firstError) {
            super({
              ...firstError,
              raw: {
                processingErrors: processingErrors,
                summary: summaries,
                value: props,
              },
            })
            const nextErrors = rawNextErrors && rawNextErrors?.length > 0 ? rawNextErrors.map((p) => new ErrorObjectFromPayload(p)): undefined;
            if (nextErrors !== undefined) {
              this.nextErrors = nextErrors;
            }
            return;
          }
        }

        super({
          code: ErrorObjectFromPayload.DEFAULT_GENERIC_CODE,
          message: ErrorObjectFromPayload.DEFAULT_GENERIC_MESSAGE,
          tag: ErrorObjectFromPayload.DEFAULT_FALLBACK_TAG,
          raw: {
            processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
            summary: summaries,
          },
        });
      } catch (error) {
        super({
          code: 'INT-2',
          message: `Error during processErrorObjectResult(). Details: ${error?.toString?.() ?? ErrorObject.DEFAULT_GENERIC_MESSAGE}}`,
          tag: ErrorObjectFromPayload.DEFAULT_FALLBACK_TAG,
          raw: {
            error,
          },
        });
      }
    }
  }

  // Overrides
  static generic = () =>
    new ErrorObjectFromPayload({
      code: ErrorObject.DEFAULT_GENERIC_CODE,
      message: ErrorObject.DEFAULT_GENERIC_MESSAGE,
      tag: ErrorObject.DEFAULT_GENERIC_TAG,
    });

  protected _log(logTag: string, logLevel: 'log' | 'debug' | 'verbose') {
    const logForThis =
      logLevel === 'verbose' ? this.toVerboseString() : logLevel === 'debug' ? this.toDebugString() : this.toString();
    if (Array.isArray(this.nextErrors) && this.nextErrors.length > 0) {
      let row = 1;
      console.log(`[${logTag}][${row}]`, logForThis);
      for (const error of this.nextErrors) {
        row++;
        console.log(
          `[${logTag}][${row}]`,
          logLevel === 'verbose'
            ? error.toVerboseString()
            : logLevel === 'debug'
              ? error.toDebugString()
              : error.toString(),
        );
      }
    } else {
      console.log(`[${logTag}]`, logForThis);
    }
    return this;
  }

  toVerboseString() {
    return (
      this.toDebugString() +
      `\n${JSON.stringify(
        {
          raw: this.raw,
          nextErrors: this.nextErrors,
        },
        null,
        2,
      )}`
    );
  }

  /**
   * This method allows users to check if an error is a fallback error, returned when an error could not be created from payload.
   */
  isFallback(): boolean {
    return this.tag === ErrorObjectFromPayload.DEFAULT_FALLBACK_TAG;
  }

  private static checkInputForInitialObject(
    input: any,
    withOptions: ErrorObjectBuildOptions,
  ): ErrorObjectErrorResult | undefined {
    const options: ErrorObjectBuildOptions = withOptions ?? {
      ...DEFAULT_BUILD_OPTIONS,
    };
    if (input === undefined || input === null) {
      return 'checkIsNullish';
    }
    if (typeof input !== 'object') {
      return 'checkIsNotAnObject';
    }
    if ('checkInputObjectForValues' in options) {
      if (typeof options.checkInputObjectForValues !== 'object') {
        return 'checkInputObjectForValuesIsNotAnObject';
      }
      const checkInputObjectForValues = Object.entries(options.checkInputObjectForValues);
      for (const [key, rule] of checkInputObjectForValues) {
        const foundValue = findNestedValueForPath(input, key);
        if (rule.exists ? foundValue !== rule.value : foundValue === rule.value) {
          return 'checkInputObjectForValuesFailed';
        }
      }
    }
    if ('checkInputObjectForTypes' in options) {
      if (typeof options.checkInputObjectForTypes !== 'object') {
        return 'checkInputObjectForTypesIsNotAnObject';
      }
      const checkInputObjectForTypes = Object.entries(options.checkInputObjectForTypes);
      for (const [key, rule] of checkInputObjectForTypes) {
        const foundValue = findNestedValueForPath(input, key);
        if (rule.valueIsArray) {
          if (rule.exists ? !Array.isArray(foundValue) : Array.isArray(foundValue)) {
            return 'checkInputObjectForTypesValueIsArrayFailed';
          }
        }
        if (rule.exists ? typeof foundValue !== rule.type : typeof foundValue === rule.type) {
          return 'checkInputObjectForTypesFailed';
        }
      }
    }
    if ('checkInputObjectForKeys' in options) {
      if (typeof options.checkInputObjectForKeys !== 'object') {
        return 'checkInputObjectForKeysIsNotAnObject';
      }
      const checkInputObjectForKeys = Object.entries(options.checkInputObjectForKeys);
      for (const [key, rule] of checkInputObjectForKeys) {
        const foundValue = findNestedValueForPath(input, key);
        if (rule.exists ? !foundValue : foundValue) {
          return 'checkInputObjectForKeysFailed';
        }
      }
    }
    return undefined;
  }

  private static processErrorObjectResult(
    props: any,
    options: ErrorObjectBuildOptions,
  ): {
    validErrors: { code: string; message: string }[];
    summaries: (ErrorSummary | ErrorObjectErrorResult)[];
    processingErrors: ErrorObjectProcessingError[];
  } {
    let summaries: (ErrorSummary | ErrorObjectErrorResult)[];
    if ('pathToErrors' in options) {
      summaries = buildSummariesFromObject(props, options);
    } else {
      summaries = [buildSummaryFromObject(props, undefined, false, options)];
    }

    const processingErrors: ErrorObjectProcessingError[] = [];
    const validErrors: { code: string; message: string }[] = summaries
      .filter((summary) => {
        if (typeof summary === 'string') {
          processingErrors.push({ errorCode: summary, summary: undefined });
          return false;
        }
        if (typeof summary !== 'object') {
          processingErrors.push({
            errorCode: 'invalidSummary',
            summary: undefined,
          });
          return false;
        }
        const code = summary.value.code?.value;
        const message = summary.value.message?.value;
        if (code !== undefined && code !== null && typeof code === 'string') {
          if (message !== undefined && message !== null && typeof message === 'string') {
            return true;
          }
        }
        processingErrors.push({ errorCode: 'unknownCodeOrMessage', summary });
        return false;
      })
      .map((s) => {
        const summary = s as ErrorSummary;
        const code = summary.value.code?.value;
        const message = summary.value.message?.value;
        if (code !== undefined && code !== null && typeof code === 'string') {
          if (message !== undefined && message !== null && typeof message === 'string') {
            return {
              code,
              message,
              numberCode: summary.value.numberCode?.value,
              details: summary.value.details?.value,
              domain: summary.value.domain?.value,
              raw: {
                value: props,
                processingErrors,
                summary,
              },
            };
          }
        }
        return null;
      })
      .filter((s) => s !== null && s !== undefined) as { code: string; message: string }[];

    return {
      validErrors,
      summaries,
      processingErrors,
    };
  }
}
