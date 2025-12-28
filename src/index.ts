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

const checkInputForInitialObject = (
  input: any,
  withOptions: ErrorObjectBuildOptions,
): ErrorObjectErrorResult | undefined => {
  try {
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
      const checkInputObjectForValues = Object.entries(
        options.checkInputObjectForValues,
      );
      for (const [key, rule] of checkInputObjectForValues) {
        const foundValue = findNestedValueForPath(input, key);
        if (
          rule.exists ? foundValue !== rule.value : foundValue === rule.value
        ) {
          return 'checkInputObjectForValuesFailed';
        }
      }
    }
    if ('checkInputObjectForTypes' in options) {
      if (typeof options.checkInputObjectForTypes !== 'object') {
        return 'checkInputObjectForTypesIsNotAnObject';
      }
      const checkInputObjectForTypes = Object.entries(
        options.checkInputObjectForTypes,
      );
      for (const [key, rule] of checkInputObjectForTypes) {
        const foundValue = findNestedValueForPath(input, key);
        if (rule.valueIsArray) {
          if (
            rule.exists
            ? !Array.isArray(foundValue)
            : Array.isArray(foundValue)
          ) {
            return 'checkInputObjectForTypesValueIsArrayFailed';
          }
        }
        if (
          rule.exists
          ? typeof foundValue !== rule.type
          : typeof foundValue === rule.type
        ) {
          return 'checkInputObjectForTypesFailed';
        }
      }
    }
    if ('checkInputObjectForKeys' in options) {
      if (typeof options.checkInputObjectForKeys !== 'object') {
        return 'checkInputObjectForKeysIsNotAnObject';
      }
      const checkInputObjectForKeys = Object.entries(
        options.checkInputObjectForKeys,
      );
      for (const [key, rule] of checkInputObjectForKeys) {
        const foundValue = findNestedValueForPath(input, key);
        if (rule.exists ? !foundValue : foundValue) {
          return 'checkInputObjectForKeysFailed';
        }
      }
    }
  }
  catch (error) {
    ErrorObject.SHOW_ERROR_LOGS &&
    console.log(
      '[ErrorObject]',
      'Error during checkInputForInitialObject():',
      error,
    );
  }
  return undefined;
};

const processErrorObjectResult = (
  summaries: (ErrorSummary | ErrorObjectErrorResult)[],
  raw: any,
  fallbackError: ErrorObject,
): {
  error?: ErrorObject;
  force: ErrorObject;
} => {
  const processingErrors: ErrorObjectProcessingError[] = [];
  try {
    const validErrors: ErrorObject[] = (
      summaries.filter((summary) => {
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
          if (
            message !== undefined &&
            message !== null &&
            typeof message === 'string'
          ) {
            return true;
          }
        }
        processingErrors.push({ errorCode: 'unknownCodeOrMessage', summary });
        return false;
      }) as ErrorSummary[]
    )
    .map((s) => {
      const summary = s as ErrorSummary;

      const code = summary.value.code?.value;
      const numberCode = summary.value.numberCode?.value;
      const message = summary.value.message?.value;
      const details = summary.value.details?.value;
      const domain = summary.value.domain?.value;
      if (code !== undefined && code !== null && typeof code === 'string') {
        if (
          message !== undefined &&
          message !== null &&
          typeof message === 'string'
        ) {
          return new ErrorObject({
            code,
            message,
            numberCode,
            details,
            domain,
            summary,
            processingErrors,
          });
        }
      }
      return null;
    })
    .filter(
      (s) => s !== null && s !== undefined && s instanceof ErrorObject,
    ) as ErrorObject[];

    if (validErrors.length > 0) {
      const [firstError, ...nextErrors] = validErrors as [
        ErrorObject,
        ...ErrorObject[]
      ];
      const error = firstError
      .setNextErrors(nextErrors?.length > 0 ? nextErrors : undefined)
      .setRaw(raw);
      return {
        error,
        force: error ?? fallbackError.setProcessingErrors(processingErrors),
      };
    }
  }
  catch (error) {
    ErrorObject.SHOW_ERROR_LOGS &&
    console.log(
      '[ErrorObject]',
      'Error during processErrorObjectResult():',
      error,
    );
  }
  return {
    error: undefined,
    force:
      processingErrors.length > 0
      ? fallbackError.setProcessingErrors(processingErrors)
      : fallbackError,
  };
};


/**
 * The {@link ErrorObject.from()} method is an alternative way to create an {@link ErrorObject} from anything resembling an error.
 * It contains options for customizing how the input is processed and how the error is built.
 * Check out the {@link ErrorObjectBuildOptions} type for more details.
 */
const from = (
  value: any,
  withOptions?: Partial<ErrorObjectBuildOptions>,
): {
  error?: ErrorObject;
  force: ErrorObject;
} => {
  const options: ErrorObjectBuildOptions = {
    ...DEFAULT_BUILD_OPTIONS,
    ...(withOptions ?? {}),
  };
  const fallbackError = ErrorObject.fallback().setRaw(value);
  const checksFailed = checkInputForInitialObject(value, options);
  if (checksFailed !== undefined) {
    return {
      error: undefined,
      force: fallbackError.setProcessingErrors([
        { errorCode: checksFailed, summary: undefined },
      ]),
    };
  }
  let summaries: (ErrorSummary | ErrorObjectErrorResult)[];
  if ('pathToErrors' in options) {
    summaries = buildSummariesFromObject(value, options);
  }
  else {
    summaries = [buildSummaryFromObject(value, undefined, false, options)];
  }
  return processErrorObjectResult(summaries, value, fallbackError);
};

export default from;