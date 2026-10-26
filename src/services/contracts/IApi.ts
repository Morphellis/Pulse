import { CommonParams, Methods } from 'services/contracts/api'
import { NonEmptyArray, Truthy } from 'misc/utils'

export const VERSION = '5.238'

export type Result<T> =
  | { response: T }
  | { error: ResultError }
  /** При частичном успехе execute приходят и ответ, и список ошибок */
  | { execute_errors: ResultExecuteErrors, response?: T }
type ResultError = {
  error_code: number
  error_msg: string
  captcha_sid?: string
  captcha_img?: string
  request_params: RequestParams
}
type ResultExecuteErrors = ResultExecuteError[]
type ResultExecuteError = {
  method: string
  error_code: number
  error_msg: string
  captcha_sid?: string
  captcha_img?: string
}
type RequestParams = Array<{ key: string, value: string }>

export type MethodParams<Method extends keyof Methods> = Methods[Method]['params'] & CommonParams

export type FetchManyRequestMethod<Method extends keyof Methods = keyof Methods> = [
  Method,
  MethodParams<Method>
] | false | null | 0 | undefined
export type FetchManyResponseMethod<RequestMethod extends FetchManyRequestMethod> =
  RequestMethod extends Truthy<RequestMethod>
    ? Methods[RequestMethod[0]]['response']
    : null

export type FetchOptions = {
  messengerToken?: boolean
  retries?: number
  timeout?: number
  signal?: AbortSignal
  headers?: Record<string, string>
  /**
   * Не считать ошибкой частичный провал execute: упавшие вызовы вернутся как false,
   * а остальные результаты будут доступны. Нужно для массовых сканов,
   * где часть профилей закрыта или удалена
   */
  tolerateExecuteErrors?: boolean
}

export class FetchError {
  constructor(public kind: 'ServerError' | 'NetworkError', public reason: string) {}
}

export class AbortError {
  constructor(public reason: unknown) {}
}

export class MethodError {
  public code: number
  public message: string

  constructor(public method: string, public apiError: ResultError) {
    this.code = apiError.error_code
    this.message = apiError.error_msg
  }
}

export class ExecuteError {
  constructor(public errors: NonEmptyArray<ResultExecuteError>) {}
}

/** Человекочитаемое описание ошибки запроса для логов и диагностики */
export function describeApiError(error: unknown): string {
  if (error instanceof MethodError) {
    return `MethodError(${error.method}): [${error.code}] ${error.message}`
  }
  if (error instanceof FetchError) {
    return `FetchError(${error.kind}): ${error.reason}`
  }
  if (error instanceof AbortError) {
    return `AbortError: ${String(error.reason)}`
  }
  if (error instanceof ExecuteError) {
    return error.errors
      .map((e) => `ExecuteError(${e.method}): [${e.error_code}] ${e.error_msg}`)
      .join('; ')
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

export interface Api {
  fetch<Method extends keyof Methods>(
    method: Method,
    params: MethodParams<Method>,
    fetchOptions?: FetchOptions
  ): Promise<Methods[Method]['response']>

  fetchMany<CurrentMethodsList extends FetchManyRequestMethod[]>(
    methods: [...CurrentMethodsList],
    fetchOptions?: FetchOptions
  ): Promise<{
    [Index in keyof CurrentMethodsList]: FetchManyResponseMethod<CurrentMethodsList[Index]>
  }>

  fetchParallel<CurrentMethodsList extends FetchManyRequestMethod[]>(
    methods: [...CurrentMethodsList],
    fetchOptions?: FetchOptions
  ): Promise<{
    [Index in keyof CurrentMethodsList]: FetchManyResponseMethod<CurrentMethodsList[Index]>
  }>

  buildMethod<Method extends keyof Methods>(
    method: Method,
    params?: MethodParams<Method>
  ): [Method, MethodParams<Method>]
}
