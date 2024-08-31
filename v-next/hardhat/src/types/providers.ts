import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../internal/network/utils/json-rpc.js";
import type EventEmitter from "node:events";

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface EIP1193Provider extends EventEmitter {
  /**
   * Sends a JSON-RPC request.
   *
   * @param requestArguments The arguments for the request. The first argument
   * should be a string representing the method name, and the second argument
   * should be an array containing the parameters. See {@link RequestArguments}.
   * @returns The `result` property of the successful JSON-RPC response. See
   * {@link JsonRpcResponse}.
   * @throws {ProviderError} If the JSON-RPC response indicates a failure.
   * @throws {HardhatError} with descriptor:
   * - {@link HardhatError.ERRORS.NETWORK.INVALID_REQUEST_PARAMS} if the
   * params are not an array.
   * - {@link HardhatError.ERRORS.NETWORK.CONNECTION_REFUSED} if the
   * connection is refused.
   * - {@link HardhatError.ERRORS.NETWORK.NETWORK_TIMEOUT} if the request
   * times out.
   */
  request(requestArguments: RequestArguments): Promise<unknown>;
}

/**
 * This interface is an extension of the EIP1193Provider interface with two
 * additions:
 *  - It has `send` and `sendAsync` methods for backwards compatibility.
 *  - It has a `close` method to release any resources associated with the
 *    provider.
 */
export interface EthereumProvider extends EIP1193Provider {
  /**
   * Releases any resources associated with the provider.
   *
   * Most providers don't need to do anything in this method, but they may
   * opt to use it to release resources such as a connection pool.
   *
   * Note that Hardhat doesn't automatically call this method, so a provider
   * shouldn't rely on it being called.
   */
  close(): Promise<void>;

  /**
   * @deprecated
   * Sends a JSON-RPC request. This method is present for backwards compatibility
   * with the Legacy Provider API. Prefer using {@link request} instead.
   *
   * @param method The method name for the JSON-RPC request.
   * @param params The parameters for the JSON-RPC request. This should be an
   * array of values.
   * @returns The `result` property of the successful JSON-RPC response. See
   * {@link JsonRpcResponse}.
   * @throws {ProviderError} If the JSON-RPC response indicates a failure.
   * @throws {HardhatError} with descriptor:
   * - {@link HardhatError.ERRORS.NETWORK.INVALID_REQUEST_PARAMS} if the
   * params are not an array.
   * - {@link HardhatError.ERRORS.NETWORK.CONNECTION_REFUSED} if the
   * connection is refused.
   * - {@link HardhatError.ERRORS.NETWORK.NETWORK_TIMEOUT} if the request
   * times out.
   */
  send(method: string, params?: unknown[]): Promise<unknown>;

  /**
   * @deprecated
   * Sends a JSON-RPC request asynchronously. This method is present for
   * backwards compatibility with the Legacy Provider API. Prefer using
   * {@link request} instead.
   *
   * @param jsonRpcRequest The JSON-RPC request object.
   * @param callback The callback function to handle the response. The first
   * argument should be an error object if an error occurred, and the second
   * argument should be the JSON-RPC response object.
   */
  sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void;
}

export type {
  JsonRpcRequest,
  JsonRpcNotificationRequest,
  JsonRpcResponse,
} from "../internal/network/utils/json-rpc.js";
