import InterceptorManager from './InterceptorManager'

export type RequestHeaders = { [name: string]: string } | Headers

export type Options = {
  // the URL to request
  url?: string

  // HTTP method, case-insensitive
  method?:
    | 'get'
    | 'post'
    | 'put'
    | 'patch'
    | 'delete'
    | 'options'
    | 'head'
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'OPTIONS'
    | 'HEAD'

  // Request headers
  headers?: RequestHeaders

  // a body, optionally encoded, to send
  body?: FormData | string | object | any

  // An encoding to use for the response
  responseType?: 'text' | 'json' | 'stream' | 'blob' | 'arrayBuffer' | 'formData' | 'stream'

  // querystring parameters
  params?: Record<string, any> | URLSearchParams

  // custom function to stringify querystring parameters
  paramsSerializer?: (params: Options['params']) => string

  // Send the request with credentials like cookies
  withCredentials?: boolean

  // Authorization header value to send with the request
  auth?: string

  // Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName`
  xsrfCookieName?: string

  // The name of a header to use for passing XSRF cookies
  xsrfHeaderName?: string

  // Override status code handling (default: 200-399 is a success)
  validateStatus?: (status: number) => boolean

  // An array of transformations to apply to the outgoing request
  transformRequest?: Array<(body: any, headers?: RequestHeaders) => any>

  transformResponse?: Array<(data: any) => any>

  // a base URL from which to resolve all URLs
  baseURL?: string

  // Custom window.fetch implementation
  fetch?: typeof window.fetch

  // signal returned by AbortController
  cancelToken?: AbortSignal

  data?: any

  // The mode of the request (e.g., cors, no-cors, same-origin, or navigate.). Defaults to cors.
  mode?: RequestMode
}

export type Response<T> = {
  status?: number
  statusText?: string
  config: Options // the request configuration
  data?: T // the decoded response body
  headers?: Headers
  redirect?: boolean
  url?: string
  type?: ResponseType
  body?: ReadableStream<Uint8Array> | null
  bodyUsed?: boolean
}

export type BodylessMethod = <T = any>(url: string, config?: Options) => Promise<Response<T>>

export type BodyMethod = <T = any>(url: string, body?: any, config?: Options) => Promise<Response<T>>

export type CancelToken = { (executor: Function): AbortSignal; source(): { token: AbortSignal; cancel: () => void } }

export type CancelTokenSourceMethod = () => { token: AbortSignal; cancel: () => void }

/**
 * @public
 * @param {Options} [defaults = {}]
 * @returns {qlfetch}
 */
function create(defaults: Options = {}) {
  /**
   * @public
   * @template T
   * @type {(<T = any>(config?: Options) => Promise<Response<T>>) | (<T = any>(url: string, config?: Options) => Promise<Response<T>>)}
   */
  qlfetch.request = qlfetch

  /** @public @type {BodylessMethod} */
  qlfetch.get = (url: string, config: any) => qlfetch(url, config, 'get')

  /** @public @type {BodylessMethod} */
  qlfetch.delete = (url: string, config: any) => qlfetch(url, config, 'delete')

  /** @public @type {BodylessMethod} */
  qlfetch.head = (url: string, config: any) => qlfetch(url, config, 'head')

  /** @public @type {BodylessMethod} */
  qlfetch.options = (url: string, config: any) => qlfetch(url, config, 'options')

  /** @public @type {BodyMethod} */
  qlfetch.post = (url: string, data: any, config: any) => qlfetch(url, config, 'post', data)

  /** @public @type {BodyMethod} */
  qlfetch.put = (url: string, data: any, config: any) => qlfetch(url, config, 'put', data)

  /** @public @type {BodyMethod} */
  qlfetch.patch = (url: string, data: any, config: any) => qlfetch(url, config, 'patch', data)

  /** @public */
  qlfetch.all = Promise.all.bind(Promise)

  /**
   * @public
   * @template Args, R
   * @param {(...args: Args[]) => R} fn
   * @returns {(array: Args[]) => R}
   */
  qlfetch.spread = (fn: any) => fn.apply.bind(fn, fn)

  qlfetch.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  }

  /**
   * @private
   * @template T, U
   * @param {T} opts
   * @param {U} [overrides]
   * @param {boolean} [lowerCase]
   * @returns {{} & (T | U)}
   */
  function deepMerge(opts: any, overrides: any, lowerCase: boolean = false) {
    let out: any = {},
      i
    if (Array.isArray(opts)) {
      return opts.concat(overrides)
    }

    for (i in opts) {
      const key = lowerCase ? i.toLowerCase() : i
      out[key] = opts[i]
    }

    for (i in overrides) {
      const key = lowerCase ? i.toLowerCase() : i
      const value = overrides[i]
      out[key] = key in out && typeof value === 'object' ? deepMerge(out[key], value, key === 'headers') : value
    }

    return out
  }

  /**
   * CancelToken
   * @private
   * @param {Function} executor
   * @returns {AbortSignal}
   */
  function CancelToken(executor: any): AbortSignal {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.')
    }

    const ac = new AbortController()

    executor(ac.abort.bind(ac))

    return ac.signal
  }

  /**
   * @private
   * @type {CancelTokenSourceMethod}
   * @returns
   */
  CancelToken.source = () => {
    const ac = new AbortController()

    return {
      token: ac.signal,
      cancel: ac.abort.bind(ac),
    }
  }

  /**
   * Issues a request.
   * @public
   * @template T
   * @param {string | Options} urlOrConfig
   * @param {Options} [config = {}]
   * @param {any} [_method] (internal)
   * @param {any} [data] (internal)
   * @param {never} [credentials] (internal)
   * @returns {Promise<Response<T>>}
   */
  function qlfetch<T>(
    urlOrConfig: string | Options,
    config: Options,
    _method: any,
    data: any = undefined,
  ): Promise<Response<T>> {
    let url: string = typeof urlOrConfig != 'string' ? ((config = urlOrConfig).url as string) : urlOrConfig

    let response: Response<T> = { config }

    let options: Options = deepMerge(defaults, config)

    if (qlfetch.interceptors.request.handlers.length > 0) {
      qlfetch.interceptors.request.handlers.forEach(handler => {
        if (handler !== null) {
          const resultConfig = handler.done(config)
          options = deepMerge(options, resultConfig || {})
        }
      })
    }

    const customHeaders: RequestHeaders = {}

    data = data ?? options.data
    ;(options?.transformRequest ?? []).map((f: any) => {
      data = f(data, options.headers) ?? data
    })

    if (options?.auth) {
      customHeaders.authorization = options.auth
    }

    if (data && typeof data === 'object' && typeof data.append !== 'function' && typeof data.text !== 'function') {
      data = JSON.stringify(data)
      customHeaders['content-type'] = 'application/json'
    }

    try {
      // @ts-ignore providing the cookie name without header name is nonsensical anyway
      customHeaders[options?.xsrfHeaderName] = decodeURIComponent(
        // @ts-ignore accessing match()[2] throws for no match, which is intentional
        document.cookie.match(RegExp('(^|; )' + options?.xsrfCookieName + '=([^;]*)'))[2],
      )
    } catch (e) {}

    if (options?.baseURL) {
      url = url?.replace(/^(?!.*\/\/)\/?/, options.baseURL + '/')
    }

    if (options?.params) {
      url +=
        // @ts-ignore
        (~url?.indexOf('?') ? '&' : '?') +
        (options?.paramsSerializer?.(options.params) ?? new URLSearchParams(options.params))
    }

    const fetchFunc = options?.fetch ?? fetch

    return fetchFunc(url, {
      method: (_method || options.method || 'get').toUpperCase(),
      body: data,
      headers: deepMerge(options.headers, customHeaders, true),
      credentials: options.withCredentials ? 'include' : 'same-origin',
      signal: options.cancelToken,
      mode: options.mode,
    }).then((res: any) => {
      for (const i in res) {
        // @ts-ignore
        if (typeof res[i] != 'function') response[i] = res[i]
      }

      if (options?.responseType === 'stream') {
        response.data = res.body
        return response
      }

      return res[options?.responseType ?? 'text']()
        .then((data: any) => {
          response.data = data
          // its okay if this fails: response.data will be the unparsed value:
          response.data = (options.transformResponse ?? [])?.reduce(
            (_data: any, f: any) => f(_data) ?? _data,
            JSON.parse(data),
          )
        })
        .catch(Object)
        .then(() => {
          const ok = options?.validateStatus?.(res.status) ?? res.ok
          if (res.status >= 200 && res.status < 300 && qlfetch.interceptors.response.handlers.length > 0) {
            qlfetch.interceptors.response.handlers.forEach(handler => {
              if (handler !== null) {
                const interceptedResponse = handler.done(response)

                if (interceptedResponse) response = interceptedResponse
              }
            })
          } else {
            qlfetch.interceptors.response.handlers.forEach(handler => {
              if (handler !== null) {
                const interceptedResponse = handler.error(response)

                if (interceptedResponse) response = interceptedResponse
              }
            })
          }
          return ok ? response : Promise.reject({ response })
        })
    })
  }

  /**
   * @public
   * @type {AbortController}
   */
  qlfetch.CancelToken = CancelToken

  /**
   * @public
   * @param {DOMError} e
   * @returns {boolean}
   */
  qlfetch.isCancel = (e: any) => e.name === 'AbortError'

  /**
   * @public
   * @type {Options}
   */
  qlfetch.defaults = defaults

  /**
   * @public
   */
  qlfetch.create = create

  return qlfetch
}

export default create()
