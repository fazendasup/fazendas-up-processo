
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Usuario
 * 
 */
export type Usuario = $Result.DefaultSelection<Prisma.$UsuarioPayload>
/**
 * Model RefreshToken
 * 
 */
export type RefreshToken = $Result.DefaultSelection<Prisma.$RefreshTokenPayload>
/**
 * Model Cliente
 * 
 */
export type Cliente = $Result.DefaultSelection<Prisma.$ClientePayload>
/**
 * Model Pedido
 * 
 */
export type Pedido = $Result.DefaultSelection<Prisma.$PedidoPayload>
/**
 * Model ItemPedido
 * 
 */
export type ItemPedido = $Result.DefaultSelection<Prisma.$ItemPedidoPayload>
/**
 * Model Interacao
 * 
 */
export type Interacao = $Result.DefaultSelection<Prisma.$InteracaoPayload>
/**
 * Model Oportunidade
 * 
 */
export type Oportunidade = $Result.DefaultSelection<Prisma.$OportunidadePayload>
/**
 * Model Mensagem
 * 
 */
export type Mensagem = $Result.DefaultSelection<Prisma.$MensagemPayload>
/**
 * Model ExecucaoApi
 * 
 */
export type ExecucaoApi = $Result.DefaultSelection<Prisma.$ExecucaoApiPayload>
/**
 * Model KpiSnapshot
 * 
 */
export type KpiSnapshot = $Result.DefaultSelection<Prisma.$KpiSnapshotPayload>
/**
 * Model IntegrationCredential
 * 
 */
export type IntegrationCredential = $Result.DefaultSelection<Prisma.$IntegrationCredentialPayload>
/**
 * Model SyncState
 * 
 */
export type SyncState = $Result.DefaultSelection<Prisma.$SyncStatePayload>
/**
 * Model RegraClassificacao
 * 
 */
export type RegraClassificacao = $Result.DefaultSelection<Prisma.$RegraClassificacaoPayload>
/**
 * Model TemplateMensagem
 * 
 */
export type TemplateMensagem = $Result.DefaultSelection<Prisma.$TemplateMensagemPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const PerfilUsuario: {
  GERENTE_COMERCIAL: 'GERENTE_COMERCIAL',
  COMERCIAL: 'COMERCIAL',
  OPERACOES: 'OPERACOES',
  ADMIN: 'ADMIN'
};

export type PerfilUsuario = (typeof PerfilUsuario)[keyof typeof PerfilUsuario]


export const StatusUsuario: {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO'
};

export type StatusUsuario = (typeof StatusUsuario)[keyof typeof StatusUsuario]


export const TipoCliente: {
  RESTAURANTE: 'RESTAURANTE',
  MERCADO: 'MERCADO'
};

export type TipoCliente = (typeof TipoCliente)[keyof typeof TipoCliente]


export const StatusRelacionamento: {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  EM_RISCO: 'EM_RISCO',
  ESTRATEGICO: 'ESTRATEGICO'
};

export type StatusRelacionamento = (typeof StatusRelacionamento)[keyof typeof StatusRelacionamento]


export const OrigemPedido: {
  CONTA_AZUL: 'CONTA_AZUL',
  MANUAL: 'MANUAL'
};

export type OrigemPedido = (typeof OrigemPedido)[keyof typeof OrigemPedido]


export const TipoInteracao: {
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  LIGACAO: 'LIGACAO',
  PRESENCIAL: 'PRESENCIAL'
};

export type TipoInteracao = (typeof TipoInteracao)[keyof typeof TipoInteracao]


export const TipoOportunidade: {
  UPSELL: 'UPSELL',
  CROSS_SELL: 'CROSS_SELL',
  REATIVACAO: 'REATIVACAO',
  NOVO_PRODUTO: 'NOVO_PRODUTO'
};

export type TipoOportunidade = (typeof TipoOportunidade)[keyof typeof TipoOportunidade]


export const PrioridadeOportunidade: {
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAIXA: 'BAIXA'
};

export type PrioridadeOportunidade = (typeof PrioridadeOportunidade)[keyof typeof PrioridadeOportunidade]


export const StatusOportunidade: {
  ABERTA: 'ABERTA',
  EM_CONTATO: 'EM_CONTATO',
  CONVERTIDA: 'CONVERTIDA',
  PERDIDA: 'PERDIDA'
};

export type StatusOportunidade = (typeof StatusOportunidade)[keyof typeof StatusOportunidade]


export const TipoMensagem: {
  POS_VENDA: 'POS_VENDA',
  OFERTA: 'OFERTA',
  REATIVACAO: 'REATIVACAO',
  INFORMATIVO: 'INFORMATIVO'
};

export type TipoMensagem = (typeof TipoMensagem)[keyof typeof TipoMensagem]


export const StatusEnvioMensagem: {
  RASCUNHO: 'RASCUNHO',
  AGUARDANDO_APROVACAO: 'AGUARDANDO_APROVACAO',
  APROVADA: 'APROVADA',
  ENVIADA: 'ENVIADA',
  FALHA: 'FALHA'
};

export type StatusEnvioMensagem = (typeof StatusEnvioMensagem)[keyof typeof StatusEnvioMensagem]


export const AcaoApi: {
  SYNC_CA: 'SYNC_CA',
  ENVIO_MC: 'ENVIO_MC',
  ANALISE_IG: 'ANALISE_IG',
  PESQUISA_WEB: 'PESQUISA_WEB'
};

export type AcaoApi = (typeof AcaoApi)[keyof typeof AcaoApi]


export const StatusExecucaoApi: {
  SUCESSO: 'SUCESSO',
  FALHA: 'FALHA',
  PENDENTE: 'PENDENTE'
};

export type StatusExecucaoApi = (typeof StatusExecucaoApi)[keyof typeof StatusExecucaoApi]


export const PeriodoKpi: {
  DIARIO: 'DIARIO',
  SEMANAL: 'SEMANAL',
  MENSAL: 'MENSAL'
};

export type PeriodoKpi = (typeof PeriodoKpi)[keyof typeof PeriodoKpi]

}

export type PerfilUsuario = $Enums.PerfilUsuario

export const PerfilUsuario: typeof $Enums.PerfilUsuario

export type StatusUsuario = $Enums.StatusUsuario

export const StatusUsuario: typeof $Enums.StatusUsuario

export type TipoCliente = $Enums.TipoCliente

export const TipoCliente: typeof $Enums.TipoCliente

export type StatusRelacionamento = $Enums.StatusRelacionamento

export const StatusRelacionamento: typeof $Enums.StatusRelacionamento

export type OrigemPedido = $Enums.OrigemPedido

export const OrigemPedido: typeof $Enums.OrigemPedido

export type TipoInteracao = $Enums.TipoInteracao

export const TipoInteracao: typeof $Enums.TipoInteracao

export type TipoOportunidade = $Enums.TipoOportunidade

export const TipoOportunidade: typeof $Enums.TipoOportunidade

export type PrioridadeOportunidade = $Enums.PrioridadeOportunidade

export const PrioridadeOportunidade: typeof $Enums.PrioridadeOportunidade

export type StatusOportunidade = $Enums.StatusOportunidade

export const StatusOportunidade: typeof $Enums.StatusOportunidade

export type TipoMensagem = $Enums.TipoMensagem

export const TipoMensagem: typeof $Enums.TipoMensagem

export type StatusEnvioMensagem = $Enums.StatusEnvioMensagem

export const StatusEnvioMensagem: typeof $Enums.StatusEnvioMensagem

export type AcaoApi = $Enums.AcaoApi

export const AcaoApi: typeof $Enums.AcaoApi

export type StatusExecucaoApi = $Enums.StatusExecucaoApi

export const StatusExecucaoApi: typeof $Enums.StatusExecucaoApi

export type PeriodoKpi = $Enums.PeriodoKpi

export const PeriodoKpi: typeof $Enums.PeriodoKpi

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Usuarios
 * const usuarios = await prisma.usuario.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Usuarios
   * const usuarios = await prisma.usuario.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.usuario`: Exposes CRUD operations for the **Usuario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Usuarios
    * const usuarios = await prisma.usuario.findMany()
    * ```
    */
  get usuario(): Prisma.UsuarioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.refreshToken`: Exposes CRUD operations for the **RefreshToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RefreshTokens
    * const refreshTokens = await prisma.refreshToken.findMany()
    * ```
    */
  get refreshToken(): Prisma.RefreshTokenDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cliente`: Exposes CRUD operations for the **Cliente** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Clientes
    * const clientes = await prisma.cliente.findMany()
    * ```
    */
  get cliente(): Prisma.ClienteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pedido`: Exposes CRUD operations for the **Pedido** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Pedidos
    * const pedidos = await prisma.pedido.findMany()
    * ```
    */
  get pedido(): Prisma.PedidoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.itemPedido`: Exposes CRUD operations for the **ItemPedido** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ItemPedidos
    * const itemPedidos = await prisma.itemPedido.findMany()
    * ```
    */
  get itemPedido(): Prisma.ItemPedidoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.interacao`: Exposes CRUD operations for the **Interacao** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Interacaos
    * const interacaos = await prisma.interacao.findMany()
    * ```
    */
  get interacao(): Prisma.InteracaoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.oportunidade`: Exposes CRUD operations for the **Oportunidade** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Oportunidades
    * const oportunidades = await prisma.oportunidade.findMany()
    * ```
    */
  get oportunidade(): Prisma.OportunidadeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.mensagem`: Exposes CRUD operations for the **Mensagem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Mensagems
    * const mensagems = await prisma.mensagem.findMany()
    * ```
    */
  get mensagem(): Prisma.MensagemDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.execucaoApi`: Exposes CRUD operations for the **ExecucaoApi** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExecucaoApis
    * const execucaoApis = await prisma.execucaoApi.findMany()
    * ```
    */
  get execucaoApi(): Prisma.ExecucaoApiDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.kpiSnapshot`: Exposes CRUD operations for the **KpiSnapshot** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more KpiSnapshots
    * const kpiSnapshots = await prisma.kpiSnapshot.findMany()
    * ```
    */
  get kpiSnapshot(): Prisma.KpiSnapshotDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.integrationCredential`: Exposes CRUD operations for the **IntegrationCredential** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more IntegrationCredentials
    * const integrationCredentials = await prisma.integrationCredential.findMany()
    * ```
    */
  get integrationCredential(): Prisma.IntegrationCredentialDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.syncState`: Exposes CRUD operations for the **SyncState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SyncStates
    * const syncStates = await prisma.syncState.findMany()
    * ```
    */
  get syncState(): Prisma.SyncStateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.regraClassificacao`: Exposes CRUD operations for the **RegraClassificacao** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RegraClassificacaos
    * const regraClassificacaos = await prisma.regraClassificacao.findMany()
    * ```
    */
  get regraClassificacao(): Prisma.RegraClassificacaoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.templateMensagem`: Exposes CRUD operations for the **TemplateMensagem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TemplateMensagems
    * const templateMensagems = await prisma.templateMensagem.findMany()
    * ```
    */
  get templateMensagem(): Prisma.TemplateMensagemDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Usuario: 'Usuario',
    RefreshToken: 'RefreshToken',
    Cliente: 'Cliente',
    Pedido: 'Pedido',
    ItemPedido: 'ItemPedido',
    Interacao: 'Interacao',
    Oportunidade: 'Oportunidade',
    Mensagem: 'Mensagem',
    ExecucaoApi: 'ExecucaoApi',
    KpiSnapshot: 'KpiSnapshot',
    IntegrationCredential: 'IntegrationCredential',
    SyncState: 'SyncState',
    RegraClassificacao: 'RegraClassificacao',
    TemplateMensagem: 'TemplateMensagem'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "usuario" | "refreshToken" | "cliente" | "pedido" | "itemPedido" | "interacao" | "oportunidade" | "mensagem" | "execucaoApi" | "kpiSnapshot" | "integrationCredential" | "syncState" | "regraClassificacao" | "templateMensagem"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Usuario: {
        payload: Prisma.$UsuarioPayload<ExtArgs>
        fields: Prisma.UsuarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UsuarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UsuarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findFirst: {
            args: Prisma.UsuarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UsuarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findMany: {
            args: Prisma.UsuarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>[]
          }
          create: {
            args: Prisma.UsuarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          createMany: {
            args: Prisma.UsuarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.UsuarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          update: {
            args: Prisma.UsuarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          deleteMany: {
            args: Prisma.UsuarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UsuarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UsuarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          aggregate: {
            args: Prisma.UsuarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsuario>
          }
          groupBy: {
            args: Prisma.UsuarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsuarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.UsuarioCountArgs<ExtArgs>
            result: $Utils.Optional<UsuarioCountAggregateOutputType> | number
          }
        }
      }
      RefreshToken: {
        payload: Prisma.$RefreshTokenPayload<ExtArgs>
        fields: Prisma.RefreshTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RefreshTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RefreshTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          findFirst: {
            args: Prisma.RefreshTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RefreshTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          findMany: {
            args: Prisma.RefreshTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>[]
          }
          create: {
            args: Prisma.RefreshTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          createMany: {
            args: Prisma.RefreshTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.RefreshTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          update: {
            args: Prisma.RefreshTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          deleteMany: {
            args: Prisma.RefreshTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RefreshTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RefreshTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          aggregate: {
            args: Prisma.RefreshTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRefreshToken>
          }
          groupBy: {
            args: Prisma.RefreshTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<RefreshTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.RefreshTokenCountArgs<ExtArgs>
            result: $Utils.Optional<RefreshTokenCountAggregateOutputType> | number
          }
        }
      }
      Cliente: {
        payload: Prisma.$ClientePayload<ExtArgs>
        fields: Prisma.ClienteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ClienteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ClienteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          findFirst: {
            args: Prisma.ClienteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ClienteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          findMany: {
            args: Prisma.ClienteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>[]
          }
          create: {
            args: Prisma.ClienteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          createMany: {
            args: Prisma.ClienteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ClienteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          update: {
            args: Prisma.ClienteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          deleteMany: {
            args: Prisma.ClienteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ClienteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ClienteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          aggregate: {
            args: Prisma.ClienteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCliente>
          }
          groupBy: {
            args: Prisma.ClienteGroupByArgs<ExtArgs>
            result: $Utils.Optional<ClienteGroupByOutputType>[]
          }
          count: {
            args: Prisma.ClienteCountArgs<ExtArgs>
            result: $Utils.Optional<ClienteCountAggregateOutputType> | number
          }
        }
      }
      Pedido: {
        payload: Prisma.$PedidoPayload<ExtArgs>
        fields: Prisma.PedidoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PedidoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PedidoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          findFirst: {
            args: Prisma.PedidoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PedidoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          findMany: {
            args: Prisma.PedidoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>[]
          }
          create: {
            args: Prisma.PedidoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          createMany: {
            args: Prisma.PedidoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.PedidoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          update: {
            args: Prisma.PedidoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          deleteMany: {
            args: Prisma.PedidoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PedidoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PedidoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PedidoPayload>
          }
          aggregate: {
            args: Prisma.PedidoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePedido>
          }
          groupBy: {
            args: Prisma.PedidoGroupByArgs<ExtArgs>
            result: $Utils.Optional<PedidoGroupByOutputType>[]
          }
          count: {
            args: Prisma.PedidoCountArgs<ExtArgs>
            result: $Utils.Optional<PedidoCountAggregateOutputType> | number
          }
        }
      }
      ItemPedido: {
        payload: Prisma.$ItemPedidoPayload<ExtArgs>
        fields: Prisma.ItemPedidoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ItemPedidoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ItemPedidoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          findFirst: {
            args: Prisma.ItemPedidoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ItemPedidoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          findMany: {
            args: Prisma.ItemPedidoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>[]
          }
          create: {
            args: Prisma.ItemPedidoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          createMany: {
            args: Prisma.ItemPedidoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ItemPedidoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          update: {
            args: Prisma.ItemPedidoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          deleteMany: {
            args: Prisma.ItemPedidoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ItemPedidoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ItemPedidoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemPedidoPayload>
          }
          aggregate: {
            args: Prisma.ItemPedidoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateItemPedido>
          }
          groupBy: {
            args: Prisma.ItemPedidoGroupByArgs<ExtArgs>
            result: $Utils.Optional<ItemPedidoGroupByOutputType>[]
          }
          count: {
            args: Prisma.ItemPedidoCountArgs<ExtArgs>
            result: $Utils.Optional<ItemPedidoCountAggregateOutputType> | number
          }
        }
      }
      Interacao: {
        payload: Prisma.$InteracaoPayload<ExtArgs>
        fields: Prisma.InteracaoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InteracaoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InteracaoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          findFirst: {
            args: Prisma.InteracaoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InteracaoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          findMany: {
            args: Prisma.InteracaoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>[]
          }
          create: {
            args: Prisma.InteracaoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          createMany: {
            args: Prisma.InteracaoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.InteracaoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          update: {
            args: Prisma.InteracaoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          deleteMany: {
            args: Prisma.InteracaoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InteracaoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.InteracaoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InteracaoPayload>
          }
          aggregate: {
            args: Prisma.InteracaoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInteracao>
          }
          groupBy: {
            args: Prisma.InteracaoGroupByArgs<ExtArgs>
            result: $Utils.Optional<InteracaoGroupByOutputType>[]
          }
          count: {
            args: Prisma.InteracaoCountArgs<ExtArgs>
            result: $Utils.Optional<InteracaoCountAggregateOutputType> | number
          }
        }
      }
      Oportunidade: {
        payload: Prisma.$OportunidadePayload<ExtArgs>
        fields: Prisma.OportunidadeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OportunidadeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OportunidadeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          findFirst: {
            args: Prisma.OportunidadeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OportunidadeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          findMany: {
            args: Prisma.OportunidadeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>[]
          }
          create: {
            args: Prisma.OportunidadeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          createMany: {
            args: Prisma.OportunidadeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.OportunidadeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          update: {
            args: Prisma.OportunidadeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          deleteMany: {
            args: Prisma.OportunidadeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OportunidadeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OportunidadeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OportunidadePayload>
          }
          aggregate: {
            args: Prisma.OportunidadeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOportunidade>
          }
          groupBy: {
            args: Prisma.OportunidadeGroupByArgs<ExtArgs>
            result: $Utils.Optional<OportunidadeGroupByOutputType>[]
          }
          count: {
            args: Prisma.OportunidadeCountArgs<ExtArgs>
            result: $Utils.Optional<OportunidadeCountAggregateOutputType> | number
          }
        }
      }
      Mensagem: {
        payload: Prisma.$MensagemPayload<ExtArgs>
        fields: Prisma.MensagemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MensagemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MensagemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          findFirst: {
            args: Prisma.MensagemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MensagemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          findMany: {
            args: Prisma.MensagemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>[]
          }
          create: {
            args: Prisma.MensagemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          createMany: {
            args: Prisma.MensagemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.MensagemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          update: {
            args: Prisma.MensagemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          deleteMany: {
            args: Prisma.MensagemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MensagemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MensagemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MensagemPayload>
          }
          aggregate: {
            args: Prisma.MensagemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMensagem>
          }
          groupBy: {
            args: Prisma.MensagemGroupByArgs<ExtArgs>
            result: $Utils.Optional<MensagemGroupByOutputType>[]
          }
          count: {
            args: Prisma.MensagemCountArgs<ExtArgs>
            result: $Utils.Optional<MensagemCountAggregateOutputType> | number
          }
        }
      }
      ExecucaoApi: {
        payload: Prisma.$ExecucaoApiPayload<ExtArgs>
        fields: Prisma.ExecucaoApiFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExecucaoApiFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExecucaoApiFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          findFirst: {
            args: Prisma.ExecucaoApiFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExecucaoApiFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          findMany: {
            args: Prisma.ExecucaoApiFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>[]
          }
          create: {
            args: Prisma.ExecucaoApiCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          createMany: {
            args: Prisma.ExecucaoApiCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ExecucaoApiDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          update: {
            args: Prisma.ExecucaoApiUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          deleteMany: {
            args: Prisma.ExecucaoApiDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExecucaoApiUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ExecucaoApiUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExecucaoApiPayload>
          }
          aggregate: {
            args: Prisma.ExecucaoApiAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExecucaoApi>
          }
          groupBy: {
            args: Prisma.ExecucaoApiGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExecucaoApiGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExecucaoApiCountArgs<ExtArgs>
            result: $Utils.Optional<ExecucaoApiCountAggregateOutputType> | number
          }
        }
      }
      KpiSnapshot: {
        payload: Prisma.$KpiSnapshotPayload<ExtArgs>
        fields: Prisma.KpiSnapshotFieldRefs
        operations: {
          findUnique: {
            args: Prisma.KpiSnapshotFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.KpiSnapshotFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          findFirst: {
            args: Prisma.KpiSnapshotFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.KpiSnapshotFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          findMany: {
            args: Prisma.KpiSnapshotFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>[]
          }
          create: {
            args: Prisma.KpiSnapshotCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          createMany: {
            args: Prisma.KpiSnapshotCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.KpiSnapshotDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          update: {
            args: Prisma.KpiSnapshotUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          deleteMany: {
            args: Prisma.KpiSnapshotDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.KpiSnapshotUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.KpiSnapshotUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiSnapshotPayload>
          }
          aggregate: {
            args: Prisma.KpiSnapshotAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateKpiSnapshot>
          }
          groupBy: {
            args: Prisma.KpiSnapshotGroupByArgs<ExtArgs>
            result: $Utils.Optional<KpiSnapshotGroupByOutputType>[]
          }
          count: {
            args: Prisma.KpiSnapshotCountArgs<ExtArgs>
            result: $Utils.Optional<KpiSnapshotCountAggregateOutputType> | number
          }
        }
      }
      IntegrationCredential: {
        payload: Prisma.$IntegrationCredentialPayload<ExtArgs>
        fields: Prisma.IntegrationCredentialFieldRefs
        operations: {
          findUnique: {
            args: Prisma.IntegrationCredentialFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.IntegrationCredentialFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          findFirst: {
            args: Prisma.IntegrationCredentialFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.IntegrationCredentialFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          findMany: {
            args: Prisma.IntegrationCredentialFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>[]
          }
          create: {
            args: Prisma.IntegrationCredentialCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          createMany: {
            args: Prisma.IntegrationCredentialCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.IntegrationCredentialDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          update: {
            args: Prisma.IntegrationCredentialUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          deleteMany: {
            args: Prisma.IntegrationCredentialDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.IntegrationCredentialUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.IntegrationCredentialUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$IntegrationCredentialPayload>
          }
          aggregate: {
            args: Prisma.IntegrationCredentialAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateIntegrationCredential>
          }
          groupBy: {
            args: Prisma.IntegrationCredentialGroupByArgs<ExtArgs>
            result: $Utils.Optional<IntegrationCredentialGroupByOutputType>[]
          }
          count: {
            args: Prisma.IntegrationCredentialCountArgs<ExtArgs>
            result: $Utils.Optional<IntegrationCredentialCountAggregateOutputType> | number
          }
        }
      }
      SyncState: {
        payload: Prisma.$SyncStatePayload<ExtArgs>
        fields: Prisma.SyncStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SyncStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SyncStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findFirst: {
            args: Prisma.SyncStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SyncStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findMany: {
            args: Prisma.SyncStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>[]
          }
          create: {
            args: Prisma.SyncStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          createMany: {
            args: Prisma.SyncStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SyncStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          update: {
            args: Prisma.SyncStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          deleteMany: {
            args: Prisma.SyncStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SyncStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SyncStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          aggregate: {
            args: Prisma.SyncStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSyncState>
          }
          groupBy: {
            args: Prisma.SyncStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<SyncStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.SyncStateCountArgs<ExtArgs>
            result: $Utils.Optional<SyncStateCountAggregateOutputType> | number
          }
        }
      }
      RegraClassificacao: {
        payload: Prisma.$RegraClassificacaoPayload<ExtArgs>
        fields: Prisma.RegraClassificacaoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RegraClassificacaoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RegraClassificacaoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          findFirst: {
            args: Prisma.RegraClassificacaoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RegraClassificacaoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          findMany: {
            args: Prisma.RegraClassificacaoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>[]
          }
          create: {
            args: Prisma.RegraClassificacaoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          createMany: {
            args: Prisma.RegraClassificacaoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.RegraClassificacaoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          update: {
            args: Prisma.RegraClassificacaoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          deleteMany: {
            args: Prisma.RegraClassificacaoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RegraClassificacaoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RegraClassificacaoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegraClassificacaoPayload>
          }
          aggregate: {
            args: Prisma.RegraClassificacaoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRegraClassificacao>
          }
          groupBy: {
            args: Prisma.RegraClassificacaoGroupByArgs<ExtArgs>
            result: $Utils.Optional<RegraClassificacaoGroupByOutputType>[]
          }
          count: {
            args: Prisma.RegraClassificacaoCountArgs<ExtArgs>
            result: $Utils.Optional<RegraClassificacaoCountAggregateOutputType> | number
          }
        }
      }
      TemplateMensagem: {
        payload: Prisma.$TemplateMensagemPayload<ExtArgs>
        fields: Prisma.TemplateMensagemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TemplateMensagemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TemplateMensagemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          findFirst: {
            args: Prisma.TemplateMensagemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TemplateMensagemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          findMany: {
            args: Prisma.TemplateMensagemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>[]
          }
          create: {
            args: Prisma.TemplateMensagemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          createMany: {
            args: Prisma.TemplateMensagemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.TemplateMensagemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          update: {
            args: Prisma.TemplateMensagemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          deleteMany: {
            args: Prisma.TemplateMensagemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TemplateMensagemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TemplateMensagemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TemplateMensagemPayload>
          }
          aggregate: {
            args: Prisma.TemplateMensagemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTemplateMensagem>
          }
          groupBy: {
            args: Prisma.TemplateMensagemGroupByArgs<ExtArgs>
            result: $Utils.Optional<TemplateMensagemGroupByOutputType>[]
          }
          count: {
            args: Prisma.TemplateMensagemCountArgs<ExtArgs>
            result: $Utils.Optional<TemplateMensagemCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    usuario?: UsuarioOmit
    refreshToken?: RefreshTokenOmit
    cliente?: ClienteOmit
    pedido?: PedidoOmit
    itemPedido?: ItemPedidoOmit
    interacao?: InteracaoOmit
    oportunidade?: OportunidadeOmit
    mensagem?: MensagemOmit
    execucaoApi?: ExecucaoApiOmit
    kpiSnapshot?: KpiSnapshotOmit
    integrationCredential?: IntegrationCredentialOmit
    syncState?: SyncStateOmit
    regraClassificacao?: RegraClassificacaoOmit
    templateMensagem?: TemplateMensagemOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UsuarioCountOutputType
   */

  export type UsuarioCountOutputType = {
    mensagens: number
    refreshTokens: number
    oportunidades: number
  }

  export type UsuarioCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    mensagens?: boolean | UsuarioCountOutputTypeCountMensagensArgs
    refreshTokens?: boolean | UsuarioCountOutputTypeCountRefreshTokensArgs
    oportunidades?: boolean | UsuarioCountOutputTypeCountOportunidadesArgs
  }

  // Custom InputTypes
  /**
   * UsuarioCountOutputType without action
   */
  export type UsuarioCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsuarioCountOutputType
     */
    select?: UsuarioCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UsuarioCountOutputType without action
   */
  export type UsuarioCountOutputTypeCountMensagensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MensagemWhereInput
  }

  /**
   * UsuarioCountOutputType without action
   */
  export type UsuarioCountOutputTypeCountRefreshTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RefreshTokenWhereInput
  }

  /**
   * UsuarioCountOutputType without action
   */
  export type UsuarioCountOutputTypeCountOportunidadesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OportunidadeWhereInput
  }


  /**
   * Count Type ClienteCountOutputType
   */

  export type ClienteCountOutputType = {
    pedidos: number
    interacoes: number
    oportunidades: number
    mensagens: number
    execucoes: number
  }

  export type ClienteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pedidos?: boolean | ClienteCountOutputTypeCountPedidosArgs
    interacoes?: boolean | ClienteCountOutputTypeCountInteracoesArgs
    oportunidades?: boolean | ClienteCountOutputTypeCountOportunidadesArgs
    mensagens?: boolean | ClienteCountOutputTypeCountMensagensArgs
    execucoes?: boolean | ClienteCountOutputTypeCountExecucoesArgs
  }

  // Custom InputTypes
  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ClienteCountOutputType
     */
    select?: ClienteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountPedidosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PedidoWhereInput
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountInteracoesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InteracaoWhereInput
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountOportunidadesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OportunidadeWhereInput
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountMensagensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MensagemWhereInput
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountExecucoesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExecucaoApiWhereInput
  }


  /**
   * Count Type PedidoCountOutputType
   */

  export type PedidoCountOutputType = {
    itens: number
  }

  export type PedidoCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    itens?: boolean | PedidoCountOutputTypeCountItensArgs
  }

  // Custom InputTypes
  /**
   * PedidoCountOutputType without action
   */
  export type PedidoCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PedidoCountOutputType
     */
    select?: PedidoCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PedidoCountOutputType without action
   */
  export type PedidoCountOutputTypeCountItensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemPedidoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Usuario
   */

  export type AggregateUsuario = {
    _count: UsuarioCountAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  export type UsuarioMinAggregateOutputType = {
    id: string | null
    nome: string | null
    email: string | null
    senhaHash: string | null
    perfil: $Enums.PerfilUsuario | null
    status: $Enums.StatusUsuario | null
    dataCadastro: Date | null
  }

  export type UsuarioMaxAggregateOutputType = {
    id: string | null
    nome: string | null
    email: string | null
    senhaHash: string | null
    perfil: $Enums.PerfilUsuario | null
    status: $Enums.StatusUsuario | null
    dataCadastro: Date | null
  }

  export type UsuarioCountAggregateOutputType = {
    id: number
    nome: number
    email: number
    senhaHash: number
    perfil: number
    status: number
    dataCadastro: number
    _all: number
  }


  export type UsuarioMinAggregateInputType = {
    id?: true
    nome?: true
    email?: true
    senhaHash?: true
    perfil?: true
    status?: true
    dataCadastro?: true
  }

  export type UsuarioMaxAggregateInputType = {
    id?: true
    nome?: true
    email?: true
    senhaHash?: true
    perfil?: true
    status?: true
    dataCadastro?: true
  }

  export type UsuarioCountAggregateInputType = {
    id?: true
    nome?: true
    email?: true
    senhaHash?: true
    perfil?: true
    status?: true
    dataCadastro?: true
    _all?: true
  }

  export type UsuarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuario to aggregate.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Usuarios
    **/
    _count?: true | UsuarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsuarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsuarioMaxAggregateInputType
  }

  export type GetUsuarioAggregateType<T extends UsuarioAggregateArgs> = {
        [P in keyof T & keyof AggregateUsuario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsuario[P]>
      : GetScalarType<T[P], AggregateUsuario[P]>
  }




  export type UsuarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsuarioWhereInput
    orderBy?: UsuarioOrderByWithAggregationInput | UsuarioOrderByWithAggregationInput[]
    by: UsuarioScalarFieldEnum[] | UsuarioScalarFieldEnum
    having?: UsuarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsuarioCountAggregateInputType | true
    _min?: UsuarioMinAggregateInputType
    _max?: UsuarioMaxAggregateInputType
  }

  export type UsuarioGroupByOutputType = {
    id: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status: $Enums.StatusUsuario
    dataCadastro: Date
    _count: UsuarioCountAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  type GetUsuarioGroupByPayload<T extends UsuarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsuarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsuarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
            : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
        }
      >
    >


  export type UsuarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    email?: boolean
    senhaHash?: boolean
    perfil?: boolean
    status?: boolean
    dataCadastro?: boolean
    mensagens?: boolean | Usuario$mensagensArgs<ExtArgs>
    refreshTokens?: boolean | Usuario$refreshTokensArgs<ExtArgs>
    oportunidades?: boolean | Usuario$oportunidadesArgs<ExtArgs>
    _count?: boolean | UsuarioCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usuario"]>



  export type UsuarioSelectScalar = {
    id?: boolean
    nome?: boolean
    email?: boolean
    senhaHash?: boolean
    perfil?: boolean
    status?: boolean
    dataCadastro?: boolean
  }

  export type UsuarioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "email" | "senhaHash" | "perfil" | "status" | "dataCadastro", ExtArgs["result"]["usuario"]>
  export type UsuarioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    mensagens?: boolean | Usuario$mensagensArgs<ExtArgs>
    refreshTokens?: boolean | Usuario$refreshTokensArgs<ExtArgs>
    oportunidades?: boolean | Usuario$oportunidadesArgs<ExtArgs>
    _count?: boolean | UsuarioCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $UsuarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Usuario"
    objects: {
      mensagens: Prisma.$MensagemPayload<ExtArgs>[]
      refreshTokens: Prisma.$RefreshTokenPayload<ExtArgs>[]
      oportunidades: Prisma.$OportunidadePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nome: string
      email: string
      senhaHash: string
      perfil: $Enums.PerfilUsuario
      status: $Enums.StatusUsuario
      dataCadastro: Date
    }, ExtArgs["result"]["usuario"]>
    composites: {}
  }

  type UsuarioGetPayload<S extends boolean | null | undefined | UsuarioDefaultArgs> = $Result.GetResult<Prisma.$UsuarioPayload, S>

  type UsuarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UsuarioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsuarioCountAggregateInputType | true
    }

  export interface UsuarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Usuario'], meta: { name: 'Usuario' } }
    /**
     * Find zero or one Usuario that matches the filter.
     * @param {UsuarioFindUniqueArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UsuarioFindUniqueArgs>(args: SelectSubset<T, UsuarioFindUniqueArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Usuario that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UsuarioFindUniqueOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UsuarioFindUniqueOrThrowArgs>(args: SelectSubset<T, UsuarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UsuarioFindFirstArgs>(args?: SelectSubset<T, UsuarioFindFirstArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UsuarioFindFirstOrThrowArgs>(args?: SelectSubset<T, UsuarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Usuarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Usuarios
     * const usuarios = await prisma.usuario.findMany()
     * 
     * // Get first 10 Usuarios
     * const usuarios = await prisma.usuario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usuarioWithIdOnly = await prisma.usuario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UsuarioFindManyArgs>(args?: SelectSubset<T, UsuarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Usuario.
     * @param {UsuarioCreateArgs} args - Arguments to create a Usuario.
     * @example
     * // Create one Usuario
     * const Usuario = await prisma.usuario.create({
     *   data: {
     *     // ... data to create a Usuario
     *   }
     * })
     * 
     */
    create<T extends UsuarioCreateArgs>(args: SelectSubset<T, UsuarioCreateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Usuarios.
     * @param {UsuarioCreateManyArgs} args - Arguments to create many Usuarios.
     * @example
     * // Create many Usuarios
     * const usuario = await prisma.usuario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UsuarioCreateManyArgs>(args?: SelectSubset<T, UsuarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Usuario.
     * @param {UsuarioDeleteArgs} args - Arguments to delete one Usuario.
     * @example
     * // Delete one Usuario
     * const Usuario = await prisma.usuario.delete({
     *   where: {
     *     // ... filter to delete one Usuario
     *   }
     * })
     * 
     */
    delete<T extends UsuarioDeleteArgs>(args: SelectSubset<T, UsuarioDeleteArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Usuario.
     * @param {UsuarioUpdateArgs} args - Arguments to update one Usuario.
     * @example
     * // Update one Usuario
     * const usuario = await prisma.usuario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UsuarioUpdateArgs>(args: SelectSubset<T, UsuarioUpdateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Usuarios.
     * @param {UsuarioDeleteManyArgs} args - Arguments to filter Usuarios to delete.
     * @example
     * // Delete a few Usuarios
     * const { count } = await prisma.usuario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UsuarioDeleteManyArgs>(args?: SelectSubset<T, UsuarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Usuarios
     * const usuario = await prisma.usuario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UsuarioUpdateManyArgs>(args: SelectSubset<T, UsuarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Usuario.
     * @param {UsuarioUpsertArgs} args - Arguments to update or create a Usuario.
     * @example
     * // Update or create a Usuario
     * const usuario = await prisma.usuario.upsert({
     *   create: {
     *     // ... data to create a Usuario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Usuario we want to update
     *   }
     * })
     */
    upsert<T extends UsuarioUpsertArgs>(args: SelectSubset<T, UsuarioUpsertArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioCountArgs} args - Arguments to filter Usuarios to count.
     * @example
     * // Count the number of Usuarios
     * const count = await prisma.usuario.count({
     *   where: {
     *     // ... the filter for the Usuarios we want to count
     *   }
     * })
    **/
    count<T extends UsuarioCountArgs>(
      args?: Subset<T, UsuarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsuarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsuarioAggregateArgs>(args: Subset<T, UsuarioAggregateArgs>): Prisma.PrismaPromise<GetUsuarioAggregateType<T>>

    /**
     * Group by Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UsuarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UsuarioGroupByArgs['orderBy'] }
        : { orderBy?: UsuarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UsuarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsuarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Usuario model
   */
  readonly fields: UsuarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Usuario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UsuarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    mensagens<T extends Usuario$mensagensArgs<ExtArgs> = {}>(args?: Subset<T, Usuario$mensagensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    refreshTokens<T extends Usuario$refreshTokensArgs<ExtArgs> = {}>(args?: Subset<T, Usuario$refreshTokensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    oportunidades<T extends Usuario$oportunidadesArgs<ExtArgs> = {}>(args?: Subset<T, Usuario$oportunidadesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Usuario model
   */
  interface UsuarioFieldRefs {
    readonly id: FieldRef<"Usuario", 'String'>
    readonly nome: FieldRef<"Usuario", 'String'>
    readonly email: FieldRef<"Usuario", 'String'>
    readonly senhaHash: FieldRef<"Usuario", 'String'>
    readonly perfil: FieldRef<"Usuario", 'PerfilUsuario'>
    readonly status: FieldRef<"Usuario", 'StatusUsuario'>
    readonly dataCadastro: FieldRef<"Usuario", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Usuario findUnique
   */
  export type UsuarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findUniqueOrThrow
   */
  export type UsuarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findFirst
   */
  export type UsuarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findFirstOrThrow
   */
  export type UsuarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findMany
   */
  export type UsuarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuarios to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario create
   */
  export type UsuarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The data needed to create a Usuario.
     */
    data: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
  }

  /**
   * Usuario createMany
   */
  export type UsuarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Usuarios.
     */
    data: UsuarioCreateManyInput | UsuarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Usuario update
   */
  export type UsuarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The data needed to update a Usuario.
     */
    data: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
    /**
     * Choose, which Usuario to update.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario updateMany
   */
  export type UsuarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Usuarios.
     */
    data: XOR<UsuarioUpdateManyMutationInput, UsuarioUncheckedUpdateManyInput>
    /**
     * Filter which Usuarios to update
     */
    where?: UsuarioWhereInput
    /**
     * Limit how many Usuarios to update.
     */
    limit?: number
  }

  /**
   * Usuario upsert
   */
  export type UsuarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The filter to search for the Usuario to update in case it exists.
     */
    where: UsuarioWhereUniqueInput
    /**
     * In case the Usuario found by the `where` argument doesn't exist, create a new Usuario with this data.
     */
    create: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
    /**
     * In case the Usuario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
  }

  /**
   * Usuario delete
   */
  export type UsuarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter which Usuario to delete.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario deleteMany
   */
  export type UsuarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuarios to delete
     */
    where?: UsuarioWhereInput
    /**
     * Limit how many Usuarios to delete.
     */
    limit?: number
  }

  /**
   * Usuario.mensagens
   */
  export type Usuario$mensagensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    where?: MensagemWhereInput
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    cursor?: MensagemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MensagemScalarFieldEnum | MensagemScalarFieldEnum[]
  }

  /**
   * Usuario.refreshTokens
   */
  export type Usuario$refreshTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    where?: RefreshTokenWhereInput
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    cursor?: RefreshTokenWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * Usuario.oportunidades
   */
  export type Usuario$oportunidadesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    where?: OportunidadeWhereInput
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    cursor?: OportunidadeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OportunidadeScalarFieldEnum | OportunidadeScalarFieldEnum[]
  }

  /**
   * Usuario without action
   */
  export type UsuarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
  }


  /**
   * Model RefreshToken
   */

  export type AggregateRefreshToken = {
    _count: RefreshTokenCountAggregateOutputType | null
    _min: RefreshTokenMinAggregateOutputType | null
    _max: RefreshTokenMaxAggregateOutputType | null
  }

  export type RefreshTokenMinAggregateOutputType = {
    id: string | null
    usuarioId: string | null
    tokenHash: string | null
    expiresEm: Date | null
    revogadoEm: Date | null
  }

  export type RefreshTokenMaxAggregateOutputType = {
    id: string | null
    usuarioId: string | null
    tokenHash: string | null
    expiresEm: Date | null
    revogadoEm: Date | null
  }

  export type RefreshTokenCountAggregateOutputType = {
    id: number
    usuarioId: number
    tokenHash: number
    expiresEm: number
    revogadoEm: number
    _all: number
  }


  export type RefreshTokenMinAggregateInputType = {
    id?: true
    usuarioId?: true
    tokenHash?: true
    expiresEm?: true
    revogadoEm?: true
  }

  export type RefreshTokenMaxAggregateInputType = {
    id?: true
    usuarioId?: true
    tokenHash?: true
    expiresEm?: true
    revogadoEm?: true
  }

  export type RefreshTokenCountAggregateInputType = {
    id?: true
    usuarioId?: true
    tokenHash?: true
    expiresEm?: true
    revogadoEm?: true
    _all?: true
  }

  export type RefreshTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RefreshToken to aggregate.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RefreshTokens
    **/
    _count?: true | RefreshTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RefreshTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RefreshTokenMaxAggregateInputType
  }

  export type GetRefreshTokenAggregateType<T extends RefreshTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateRefreshToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRefreshToken[P]>
      : GetScalarType<T[P], AggregateRefreshToken[P]>
  }




  export type RefreshTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RefreshTokenWhereInput
    orderBy?: RefreshTokenOrderByWithAggregationInput | RefreshTokenOrderByWithAggregationInput[]
    by: RefreshTokenScalarFieldEnum[] | RefreshTokenScalarFieldEnum
    having?: RefreshTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RefreshTokenCountAggregateInputType | true
    _min?: RefreshTokenMinAggregateInputType
    _max?: RefreshTokenMaxAggregateInputType
  }

  export type RefreshTokenGroupByOutputType = {
    id: string
    usuarioId: string
    tokenHash: string
    expiresEm: Date
    revogadoEm: Date | null
    _count: RefreshTokenCountAggregateOutputType | null
    _min: RefreshTokenMinAggregateOutputType | null
    _max: RefreshTokenMaxAggregateOutputType | null
  }

  type GetRefreshTokenGroupByPayload<T extends RefreshTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RefreshTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RefreshTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RefreshTokenGroupByOutputType[P]>
            : GetScalarType<T[P], RefreshTokenGroupByOutputType[P]>
        }
      >
    >


  export type RefreshTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    usuarioId?: boolean
    tokenHash?: boolean
    expiresEm?: boolean
    revogadoEm?: boolean
    usuario?: boolean | UsuarioDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["refreshToken"]>



  export type RefreshTokenSelectScalar = {
    id?: boolean
    usuarioId?: boolean
    tokenHash?: boolean
    expiresEm?: boolean
    revogadoEm?: boolean
  }

  export type RefreshTokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "usuarioId" | "tokenHash" | "expiresEm" | "revogadoEm", ExtArgs["result"]["refreshToken"]>
  export type RefreshTokenInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    usuario?: boolean | UsuarioDefaultArgs<ExtArgs>
  }

  export type $RefreshTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RefreshToken"
    objects: {
      usuario: Prisma.$UsuarioPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      usuarioId: string
      tokenHash: string
      expiresEm: Date
      revogadoEm: Date | null
    }, ExtArgs["result"]["refreshToken"]>
    composites: {}
  }

  type RefreshTokenGetPayload<S extends boolean | null | undefined | RefreshTokenDefaultArgs> = $Result.GetResult<Prisma.$RefreshTokenPayload, S>

  type RefreshTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RefreshTokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RefreshTokenCountAggregateInputType | true
    }

  export interface RefreshTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RefreshToken'], meta: { name: 'RefreshToken' } }
    /**
     * Find zero or one RefreshToken that matches the filter.
     * @param {RefreshTokenFindUniqueArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RefreshTokenFindUniqueArgs>(args: SelectSubset<T, RefreshTokenFindUniqueArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RefreshToken that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RefreshTokenFindUniqueOrThrowArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RefreshTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, RefreshTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RefreshToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindFirstArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RefreshTokenFindFirstArgs>(args?: SelectSubset<T, RefreshTokenFindFirstArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RefreshToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindFirstOrThrowArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RefreshTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, RefreshTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RefreshTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RefreshTokens
     * const refreshTokens = await prisma.refreshToken.findMany()
     * 
     * // Get first 10 RefreshTokens
     * const refreshTokens = await prisma.refreshToken.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const refreshTokenWithIdOnly = await prisma.refreshToken.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RefreshTokenFindManyArgs>(args?: SelectSubset<T, RefreshTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RefreshToken.
     * @param {RefreshTokenCreateArgs} args - Arguments to create a RefreshToken.
     * @example
     * // Create one RefreshToken
     * const RefreshToken = await prisma.refreshToken.create({
     *   data: {
     *     // ... data to create a RefreshToken
     *   }
     * })
     * 
     */
    create<T extends RefreshTokenCreateArgs>(args: SelectSubset<T, RefreshTokenCreateArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RefreshTokens.
     * @param {RefreshTokenCreateManyArgs} args - Arguments to create many RefreshTokens.
     * @example
     * // Create many RefreshTokens
     * const refreshToken = await prisma.refreshToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RefreshTokenCreateManyArgs>(args?: SelectSubset<T, RefreshTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a RefreshToken.
     * @param {RefreshTokenDeleteArgs} args - Arguments to delete one RefreshToken.
     * @example
     * // Delete one RefreshToken
     * const RefreshToken = await prisma.refreshToken.delete({
     *   where: {
     *     // ... filter to delete one RefreshToken
     *   }
     * })
     * 
     */
    delete<T extends RefreshTokenDeleteArgs>(args: SelectSubset<T, RefreshTokenDeleteArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RefreshToken.
     * @param {RefreshTokenUpdateArgs} args - Arguments to update one RefreshToken.
     * @example
     * // Update one RefreshToken
     * const refreshToken = await prisma.refreshToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RefreshTokenUpdateArgs>(args: SelectSubset<T, RefreshTokenUpdateArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RefreshTokens.
     * @param {RefreshTokenDeleteManyArgs} args - Arguments to filter RefreshTokens to delete.
     * @example
     * // Delete a few RefreshTokens
     * const { count } = await prisma.refreshToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RefreshTokenDeleteManyArgs>(args?: SelectSubset<T, RefreshTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RefreshTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RefreshTokens
     * const refreshToken = await prisma.refreshToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RefreshTokenUpdateManyArgs>(args: SelectSubset<T, RefreshTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RefreshToken.
     * @param {RefreshTokenUpsertArgs} args - Arguments to update or create a RefreshToken.
     * @example
     * // Update or create a RefreshToken
     * const refreshToken = await prisma.refreshToken.upsert({
     *   create: {
     *     // ... data to create a RefreshToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RefreshToken we want to update
     *   }
     * })
     */
    upsert<T extends RefreshTokenUpsertArgs>(args: SelectSubset<T, RefreshTokenUpsertArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RefreshTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenCountArgs} args - Arguments to filter RefreshTokens to count.
     * @example
     * // Count the number of RefreshTokens
     * const count = await prisma.refreshToken.count({
     *   where: {
     *     // ... the filter for the RefreshTokens we want to count
     *   }
     * })
    **/
    count<T extends RefreshTokenCountArgs>(
      args?: Subset<T, RefreshTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RefreshTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RefreshToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RefreshTokenAggregateArgs>(args: Subset<T, RefreshTokenAggregateArgs>): Prisma.PrismaPromise<GetRefreshTokenAggregateType<T>>

    /**
     * Group by RefreshToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RefreshTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RefreshTokenGroupByArgs['orderBy'] }
        : { orderBy?: RefreshTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RefreshTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRefreshTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RefreshToken model
   */
  readonly fields: RefreshTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RefreshToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RefreshTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    usuario<T extends UsuarioDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UsuarioDefaultArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RefreshToken model
   */
  interface RefreshTokenFieldRefs {
    readonly id: FieldRef<"RefreshToken", 'String'>
    readonly usuarioId: FieldRef<"RefreshToken", 'String'>
    readonly tokenHash: FieldRef<"RefreshToken", 'String'>
    readonly expiresEm: FieldRef<"RefreshToken", 'DateTime'>
    readonly revogadoEm: FieldRef<"RefreshToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RefreshToken findUnique
   */
  export type RefreshTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken findUniqueOrThrow
   */
  export type RefreshTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken findFirst
   */
  export type RefreshTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RefreshTokens.
     */
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken findFirstOrThrow
   */
  export type RefreshTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RefreshTokens.
     */
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken findMany
   */
  export type RefreshTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshTokens to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken create
   */
  export type RefreshTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The data needed to create a RefreshToken.
     */
    data: XOR<RefreshTokenCreateInput, RefreshTokenUncheckedCreateInput>
  }

  /**
   * RefreshToken createMany
   */
  export type RefreshTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RefreshTokens.
     */
    data: RefreshTokenCreateManyInput | RefreshTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RefreshToken update
   */
  export type RefreshTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The data needed to update a RefreshToken.
     */
    data: XOR<RefreshTokenUpdateInput, RefreshTokenUncheckedUpdateInput>
    /**
     * Choose, which RefreshToken to update.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken updateMany
   */
  export type RefreshTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RefreshTokens.
     */
    data: XOR<RefreshTokenUpdateManyMutationInput, RefreshTokenUncheckedUpdateManyInput>
    /**
     * Filter which RefreshTokens to update
     */
    where?: RefreshTokenWhereInput
    /**
     * Limit how many RefreshTokens to update.
     */
    limit?: number
  }

  /**
   * RefreshToken upsert
   */
  export type RefreshTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The filter to search for the RefreshToken to update in case it exists.
     */
    where: RefreshTokenWhereUniqueInput
    /**
     * In case the RefreshToken found by the `where` argument doesn't exist, create a new RefreshToken with this data.
     */
    create: XOR<RefreshTokenCreateInput, RefreshTokenUncheckedCreateInput>
    /**
     * In case the RefreshToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RefreshTokenUpdateInput, RefreshTokenUncheckedUpdateInput>
  }

  /**
   * RefreshToken delete
   */
  export type RefreshTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter which RefreshToken to delete.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken deleteMany
   */
  export type RefreshTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RefreshTokens to delete
     */
    where?: RefreshTokenWhereInput
    /**
     * Limit how many RefreshTokens to delete.
     */
    limit?: number
  }

  /**
   * RefreshToken without action
   */
  export type RefreshTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RefreshToken
     */
    omit?: RefreshTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
  }


  /**
   * Model Cliente
   */

  export type AggregateCliente = {
    _count: ClienteCountAggregateOutputType | null
    _avg: ClienteAvgAggregateOutputType | null
    _sum: ClienteSumAggregateOutputType | null
    _min: ClienteMinAggregateOutputType | null
    _max: ClienteMaxAggregateOutputType | null
  }

  export type ClienteAvgAggregateOutputType = {
    scoreComercial: Decimal | null
  }

  export type ClienteSumAggregateOutputType = {
    scoreComercial: Decimal | null
  }

  export type ClienteMinAggregateOutputType = {
    id: string | null
    externalId: string | null
    nome: string | null
    tipo: $Enums.TipoCliente | null
    cnpjCpf: string | null
    endereco: string | null
    contatoPrincipal: string | null
    emailPrincipal: string | null
    telefoneWhatsapp: string | null
    scoreComercial: Decimal | null
    statusRelacionamento: $Enums.StatusRelacionamento | null
    urlInstagram: string | null
    urlSite: string | null
    dataCadastro: Date | null
    dataUltimaAtualizacao: Date | null
  }

  export type ClienteMaxAggregateOutputType = {
    id: string | null
    externalId: string | null
    nome: string | null
    tipo: $Enums.TipoCliente | null
    cnpjCpf: string | null
    endereco: string | null
    contatoPrincipal: string | null
    emailPrincipal: string | null
    telefoneWhatsapp: string | null
    scoreComercial: Decimal | null
    statusRelacionamento: $Enums.StatusRelacionamento | null
    urlInstagram: string | null
    urlSite: string | null
    dataCadastro: Date | null
    dataUltimaAtualizacao: Date | null
  }

  export type ClienteCountAggregateOutputType = {
    id: number
    externalId: number
    nome: number
    tipo: number
    cnpjCpf: number
    endereco: number
    contatoPrincipal: number
    emailPrincipal: number
    telefoneWhatsapp: number
    scoreComercial: number
    statusRelacionamento: number
    tags: number
    urlInstagram: number
    urlSite: number
    dataCadastro: number
    dataUltimaAtualizacao: number
    _all: number
  }


  export type ClienteAvgAggregateInputType = {
    scoreComercial?: true
  }

  export type ClienteSumAggregateInputType = {
    scoreComercial?: true
  }

  export type ClienteMinAggregateInputType = {
    id?: true
    externalId?: true
    nome?: true
    tipo?: true
    cnpjCpf?: true
    endereco?: true
    contatoPrincipal?: true
    emailPrincipal?: true
    telefoneWhatsapp?: true
    scoreComercial?: true
    statusRelacionamento?: true
    urlInstagram?: true
    urlSite?: true
    dataCadastro?: true
    dataUltimaAtualizacao?: true
  }

  export type ClienteMaxAggregateInputType = {
    id?: true
    externalId?: true
    nome?: true
    tipo?: true
    cnpjCpf?: true
    endereco?: true
    contatoPrincipal?: true
    emailPrincipal?: true
    telefoneWhatsapp?: true
    scoreComercial?: true
    statusRelacionamento?: true
    urlInstagram?: true
    urlSite?: true
    dataCadastro?: true
    dataUltimaAtualizacao?: true
  }

  export type ClienteCountAggregateInputType = {
    id?: true
    externalId?: true
    nome?: true
    tipo?: true
    cnpjCpf?: true
    endereco?: true
    contatoPrincipal?: true
    emailPrincipal?: true
    telefoneWhatsapp?: true
    scoreComercial?: true
    statusRelacionamento?: true
    tags?: true
    urlInstagram?: true
    urlSite?: true
    dataCadastro?: true
    dataUltimaAtualizacao?: true
    _all?: true
  }

  export type ClienteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cliente to aggregate.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Clientes
    **/
    _count?: true | ClienteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ClienteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ClienteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ClienteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ClienteMaxAggregateInputType
  }

  export type GetClienteAggregateType<T extends ClienteAggregateArgs> = {
        [P in keyof T & keyof AggregateCliente]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCliente[P]>
      : GetScalarType<T[P], AggregateCliente[P]>
  }




  export type ClienteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClienteWhereInput
    orderBy?: ClienteOrderByWithAggregationInput | ClienteOrderByWithAggregationInput[]
    by: ClienteScalarFieldEnum[] | ClienteScalarFieldEnum
    having?: ClienteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ClienteCountAggregateInputType | true
    _avg?: ClienteAvgAggregateInputType
    _sum?: ClienteSumAggregateInputType
    _min?: ClienteMinAggregateInputType
    _max?: ClienteMaxAggregateInputType
  }

  export type ClienteGroupByOutputType = {
    id: string
    externalId: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf: string | null
    endereco: string | null
    contatoPrincipal: string | null
    emailPrincipal: string | null
    telefoneWhatsapp: string | null
    scoreComercial: Decimal | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonValue
    urlInstagram: string | null
    urlSite: string | null
    dataCadastro: Date
    dataUltimaAtualizacao: Date
    _count: ClienteCountAggregateOutputType | null
    _avg: ClienteAvgAggregateOutputType | null
    _sum: ClienteSumAggregateOutputType | null
    _min: ClienteMinAggregateOutputType | null
    _max: ClienteMaxAggregateOutputType | null
  }

  type GetClienteGroupByPayload<T extends ClienteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ClienteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ClienteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ClienteGroupByOutputType[P]>
            : GetScalarType<T[P], ClienteGroupByOutputType[P]>
        }
      >
    >


  export type ClienteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    externalId?: boolean
    nome?: boolean
    tipo?: boolean
    cnpjCpf?: boolean
    endereco?: boolean
    contatoPrincipal?: boolean
    emailPrincipal?: boolean
    telefoneWhatsapp?: boolean
    scoreComercial?: boolean
    statusRelacionamento?: boolean
    tags?: boolean
    urlInstagram?: boolean
    urlSite?: boolean
    dataCadastro?: boolean
    dataUltimaAtualizacao?: boolean
    pedidos?: boolean | Cliente$pedidosArgs<ExtArgs>
    interacoes?: boolean | Cliente$interacoesArgs<ExtArgs>
    oportunidades?: boolean | Cliente$oportunidadesArgs<ExtArgs>
    mensagens?: boolean | Cliente$mensagensArgs<ExtArgs>
    execucoes?: boolean | Cliente$execucoesArgs<ExtArgs>
    _count?: boolean | ClienteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cliente"]>



  export type ClienteSelectScalar = {
    id?: boolean
    externalId?: boolean
    nome?: boolean
    tipo?: boolean
    cnpjCpf?: boolean
    endereco?: boolean
    contatoPrincipal?: boolean
    emailPrincipal?: boolean
    telefoneWhatsapp?: boolean
    scoreComercial?: boolean
    statusRelacionamento?: boolean
    tags?: boolean
    urlInstagram?: boolean
    urlSite?: boolean
    dataCadastro?: boolean
    dataUltimaAtualizacao?: boolean
  }

  export type ClienteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "externalId" | "nome" | "tipo" | "cnpjCpf" | "endereco" | "contatoPrincipal" | "emailPrincipal" | "telefoneWhatsapp" | "scoreComercial" | "statusRelacionamento" | "tags" | "urlInstagram" | "urlSite" | "dataCadastro" | "dataUltimaAtualizacao", ExtArgs["result"]["cliente"]>
  export type ClienteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pedidos?: boolean | Cliente$pedidosArgs<ExtArgs>
    interacoes?: boolean | Cliente$interacoesArgs<ExtArgs>
    oportunidades?: boolean | Cliente$oportunidadesArgs<ExtArgs>
    mensagens?: boolean | Cliente$mensagensArgs<ExtArgs>
    execucoes?: boolean | Cliente$execucoesArgs<ExtArgs>
    _count?: boolean | ClienteCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $ClientePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Cliente"
    objects: {
      pedidos: Prisma.$PedidoPayload<ExtArgs>[]
      interacoes: Prisma.$InteracaoPayload<ExtArgs>[]
      oportunidades: Prisma.$OportunidadePayload<ExtArgs>[]
      mensagens: Prisma.$MensagemPayload<ExtArgs>[]
      execucoes: Prisma.$ExecucaoApiPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      externalId: string | null
      nome: string
      tipo: $Enums.TipoCliente
      cnpjCpf: string | null
      endereco: string | null
      contatoPrincipal: string | null
      emailPrincipal: string | null
      telefoneWhatsapp: string | null
      scoreComercial: Prisma.Decimal | null
      statusRelacionamento: $Enums.StatusRelacionamento
      tags: Prisma.JsonValue
      urlInstagram: string | null
      urlSite: string | null
      dataCadastro: Date
      dataUltimaAtualizacao: Date
    }, ExtArgs["result"]["cliente"]>
    composites: {}
  }

  type ClienteGetPayload<S extends boolean | null | undefined | ClienteDefaultArgs> = $Result.GetResult<Prisma.$ClientePayload, S>

  type ClienteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ClienteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ClienteCountAggregateInputType | true
    }

  export interface ClienteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Cliente'], meta: { name: 'Cliente' } }
    /**
     * Find zero or one Cliente that matches the filter.
     * @param {ClienteFindUniqueArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ClienteFindUniqueArgs>(args: SelectSubset<T, ClienteFindUniqueArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cliente that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ClienteFindUniqueOrThrowArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ClienteFindUniqueOrThrowArgs>(args: SelectSubset<T, ClienteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cliente that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindFirstArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ClienteFindFirstArgs>(args?: SelectSubset<T, ClienteFindFirstArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cliente that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindFirstOrThrowArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ClienteFindFirstOrThrowArgs>(args?: SelectSubset<T, ClienteFindFirstOrThrowArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Clientes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Clientes
     * const clientes = await prisma.cliente.findMany()
     * 
     * // Get first 10 Clientes
     * const clientes = await prisma.cliente.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const clienteWithIdOnly = await prisma.cliente.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ClienteFindManyArgs>(args?: SelectSubset<T, ClienteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cliente.
     * @param {ClienteCreateArgs} args - Arguments to create a Cliente.
     * @example
     * // Create one Cliente
     * const Cliente = await prisma.cliente.create({
     *   data: {
     *     // ... data to create a Cliente
     *   }
     * })
     * 
     */
    create<T extends ClienteCreateArgs>(args: SelectSubset<T, ClienteCreateArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Clientes.
     * @param {ClienteCreateManyArgs} args - Arguments to create many Clientes.
     * @example
     * // Create many Clientes
     * const cliente = await prisma.cliente.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ClienteCreateManyArgs>(args?: SelectSubset<T, ClienteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Cliente.
     * @param {ClienteDeleteArgs} args - Arguments to delete one Cliente.
     * @example
     * // Delete one Cliente
     * const Cliente = await prisma.cliente.delete({
     *   where: {
     *     // ... filter to delete one Cliente
     *   }
     * })
     * 
     */
    delete<T extends ClienteDeleteArgs>(args: SelectSubset<T, ClienteDeleteArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cliente.
     * @param {ClienteUpdateArgs} args - Arguments to update one Cliente.
     * @example
     * // Update one Cliente
     * const cliente = await prisma.cliente.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ClienteUpdateArgs>(args: SelectSubset<T, ClienteUpdateArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Clientes.
     * @param {ClienteDeleteManyArgs} args - Arguments to filter Clientes to delete.
     * @example
     * // Delete a few Clientes
     * const { count } = await prisma.cliente.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ClienteDeleteManyArgs>(args?: SelectSubset<T, ClienteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Clientes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Clientes
     * const cliente = await prisma.cliente.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ClienteUpdateManyArgs>(args: SelectSubset<T, ClienteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Cliente.
     * @param {ClienteUpsertArgs} args - Arguments to update or create a Cliente.
     * @example
     * // Update or create a Cliente
     * const cliente = await prisma.cliente.upsert({
     *   create: {
     *     // ... data to create a Cliente
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cliente we want to update
     *   }
     * })
     */
    upsert<T extends ClienteUpsertArgs>(args: SelectSubset<T, ClienteUpsertArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Clientes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteCountArgs} args - Arguments to filter Clientes to count.
     * @example
     * // Count the number of Clientes
     * const count = await prisma.cliente.count({
     *   where: {
     *     // ... the filter for the Clientes we want to count
     *   }
     * })
    **/
    count<T extends ClienteCountArgs>(
      args?: Subset<T, ClienteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ClienteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cliente.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ClienteAggregateArgs>(args: Subset<T, ClienteAggregateArgs>): Prisma.PrismaPromise<GetClienteAggregateType<T>>

    /**
     * Group by Cliente.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ClienteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ClienteGroupByArgs['orderBy'] }
        : { orderBy?: ClienteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ClienteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetClienteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Cliente model
   */
  readonly fields: ClienteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Cliente.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ClienteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pedidos<T extends Cliente$pedidosArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$pedidosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    interacoes<T extends Cliente$interacoesArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$interacoesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    oportunidades<T extends Cliente$oportunidadesArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$oportunidadesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    mensagens<T extends Cliente$mensagensArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$mensagensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    execucoes<T extends Cliente$execucoesArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$execucoesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Cliente model
   */
  interface ClienteFieldRefs {
    readonly id: FieldRef<"Cliente", 'String'>
    readonly externalId: FieldRef<"Cliente", 'String'>
    readonly nome: FieldRef<"Cliente", 'String'>
    readonly tipo: FieldRef<"Cliente", 'TipoCliente'>
    readonly cnpjCpf: FieldRef<"Cliente", 'String'>
    readonly endereco: FieldRef<"Cliente", 'String'>
    readonly contatoPrincipal: FieldRef<"Cliente", 'String'>
    readonly emailPrincipal: FieldRef<"Cliente", 'String'>
    readonly telefoneWhatsapp: FieldRef<"Cliente", 'String'>
    readonly scoreComercial: FieldRef<"Cliente", 'Decimal'>
    readonly statusRelacionamento: FieldRef<"Cliente", 'StatusRelacionamento'>
    readonly tags: FieldRef<"Cliente", 'Json'>
    readonly urlInstagram: FieldRef<"Cliente", 'String'>
    readonly urlSite: FieldRef<"Cliente", 'String'>
    readonly dataCadastro: FieldRef<"Cliente", 'DateTime'>
    readonly dataUltimaAtualizacao: FieldRef<"Cliente", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Cliente findUnique
   */
  export type ClienteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente findUniqueOrThrow
   */
  export type ClienteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente findFirst
   */
  export type ClienteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clientes.
     */
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente findFirstOrThrow
   */
  export type ClienteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clientes.
     */
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente findMany
   */
  export type ClienteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Clientes to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente create
   */
  export type ClienteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The data needed to create a Cliente.
     */
    data: XOR<ClienteCreateInput, ClienteUncheckedCreateInput>
  }

  /**
   * Cliente createMany
   */
  export type ClienteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Clientes.
     */
    data: ClienteCreateManyInput | ClienteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cliente update
   */
  export type ClienteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The data needed to update a Cliente.
     */
    data: XOR<ClienteUpdateInput, ClienteUncheckedUpdateInput>
    /**
     * Choose, which Cliente to update.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente updateMany
   */
  export type ClienteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Clientes.
     */
    data: XOR<ClienteUpdateManyMutationInput, ClienteUncheckedUpdateManyInput>
    /**
     * Filter which Clientes to update
     */
    where?: ClienteWhereInput
    /**
     * Limit how many Clientes to update.
     */
    limit?: number
  }

  /**
   * Cliente upsert
   */
  export type ClienteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The filter to search for the Cliente to update in case it exists.
     */
    where: ClienteWhereUniqueInput
    /**
     * In case the Cliente found by the `where` argument doesn't exist, create a new Cliente with this data.
     */
    create: XOR<ClienteCreateInput, ClienteUncheckedCreateInput>
    /**
     * In case the Cliente was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ClienteUpdateInput, ClienteUncheckedUpdateInput>
  }

  /**
   * Cliente delete
   */
  export type ClienteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter which Cliente to delete.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente deleteMany
   */
  export type ClienteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Clientes to delete
     */
    where?: ClienteWhereInput
    /**
     * Limit how many Clientes to delete.
     */
    limit?: number
  }

  /**
   * Cliente.pedidos
   */
  export type Cliente$pedidosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    where?: PedidoWhereInput
    orderBy?: PedidoOrderByWithRelationInput | PedidoOrderByWithRelationInput[]
    cursor?: PedidoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PedidoScalarFieldEnum | PedidoScalarFieldEnum[]
  }

  /**
   * Cliente.interacoes
   */
  export type Cliente$interacoesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    where?: InteracaoWhereInput
    orderBy?: InteracaoOrderByWithRelationInput | InteracaoOrderByWithRelationInput[]
    cursor?: InteracaoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InteracaoScalarFieldEnum | InteracaoScalarFieldEnum[]
  }

  /**
   * Cliente.oportunidades
   */
  export type Cliente$oportunidadesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    where?: OportunidadeWhereInput
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    cursor?: OportunidadeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OportunidadeScalarFieldEnum | OportunidadeScalarFieldEnum[]
  }

  /**
   * Cliente.mensagens
   */
  export type Cliente$mensagensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    where?: MensagemWhereInput
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    cursor?: MensagemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MensagemScalarFieldEnum | MensagemScalarFieldEnum[]
  }

  /**
   * Cliente.execucoes
   */
  export type Cliente$execucoesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    where?: ExecucaoApiWhereInput
    orderBy?: ExecucaoApiOrderByWithRelationInput | ExecucaoApiOrderByWithRelationInput[]
    cursor?: ExecucaoApiWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExecucaoApiScalarFieldEnum | ExecucaoApiScalarFieldEnum[]
  }

  /**
   * Cliente without action
   */
  export type ClienteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
  }


  /**
   * Model Pedido
   */

  export type AggregatePedido = {
    _count: PedidoCountAggregateOutputType | null
    _avg: PedidoAvgAggregateOutputType | null
    _sum: PedidoSumAggregateOutputType | null
    _min: PedidoMinAggregateOutputType | null
    _max: PedidoMaxAggregateOutputType | null
  }

  export type PedidoAvgAggregateOutputType = {
    valorTotal: Decimal | null
  }

  export type PedidoSumAggregateOutputType = {
    valorTotal: Decimal | null
  }

  export type PedidoMinAggregateOutputType = {
    id: string | null
    externalId: string | null
    clienteId: string | null
    dataPedido: Date | null
    valorTotal: Decimal | null
    statusPedido: string | null
    origemPedido: $Enums.OrigemPedido | null
  }

  export type PedidoMaxAggregateOutputType = {
    id: string | null
    externalId: string | null
    clienteId: string | null
    dataPedido: Date | null
    valorTotal: Decimal | null
    statusPedido: string | null
    origemPedido: $Enums.OrigemPedido | null
  }

  export type PedidoCountAggregateOutputType = {
    id: number
    externalId: number
    clienteId: number
    dataPedido: number
    valorTotal: number
    statusPedido: number
    origemPedido: number
    _all: number
  }


  export type PedidoAvgAggregateInputType = {
    valorTotal?: true
  }

  export type PedidoSumAggregateInputType = {
    valorTotal?: true
  }

  export type PedidoMinAggregateInputType = {
    id?: true
    externalId?: true
    clienteId?: true
    dataPedido?: true
    valorTotal?: true
    statusPedido?: true
    origemPedido?: true
  }

  export type PedidoMaxAggregateInputType = {
    id?: true
    externalId?: true
    clienteId?: true
    dataPedido?: true
    valorTotal?: true
    statusPedido?: true
    origemPedido?: true
  }

  export type PedidoCountAggregateInputType = {
    id?: true
    externalId?: true
    clienteId?: true
    dataPedido?: true
    valorTotal?: true
    statusPedido?: true
    origemPedido?: true
    _all?: true
  }

  export type PedidoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pedido to aggregate.
     */
    where?: PedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pedidos to fetch.
     */
    orderBy?: PedidoOrderByWithRelationInput | PedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Pedidos
    **/
    _count?: true | PedidoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PedidoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PedidoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PedidoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PedidoMaxAggregateInputType
  }

  export type GetPedidoAggregateType<T extends PedidoAggregateArgs> = {
        [P in keyof T & keyof AggregatePedido]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePedido[P]>
      : GetScalarType<T[P], AggregatePedido[P]>
  }




  export type PedidoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PedidoWhereInput
    orderBy?: PedidoOrderByWithAggregationInput | PedidoOrderByWithAggregationInput[]
    by: PedidoScalarFieldEnum[] | PedidoScalarFieldEnum
    having?: PedidoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PedidoCountAggregateInputType | true
    _avg?: PedidoAvgAggregateInputType
    _sum?: PedidoSumAggregateInputType
    _min?: PedidoMinAggregateInputType
    _max?: PedidoMaxAggregateInputType
  }

  export type PedidoGroupByOutputType = {
    id: string
    externalId: string | null
    clienteId: string
    dataPedido: Date
    valorTotal: Decimal
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    _count: PedidoCountAggregateOutputType | null
    _avg: PedidoAvgAggregateOutputType | null
    _sum: PedidoSumAggregateOutputType | null
    _min: PedidoMinAggregateOutputType | null
    _max: PedidoMaxAggregateOutputType | null
  }

  type GetPedidoGroupByPayload<T extends PedidoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PedidoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PedidoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PedidoGroupByOutputType[P]>
            : GetScalarType<T[P], PedidoGroupByOutputType[P]>
        }
      >
    >


  export type PedidoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    externalId?: boolean
    clienteId?: boolean
    dataPedido?: boolean
    valorTotal?: boolean
    statusPedido?: boolean
    origemPedido?: boolean
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    itens?: boolean | Pedido$itensArgs<ExtArgs>
    _count?: boolean | PedidoCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pedido"]>



  export type PedidoSelectScalar = {
    id?: boolean
    externalId?: boolean
    clienteId?: boolean
    dataPedido?: boolean
    valorTotal?: boolean
    statusPedido?: boolean
    origemPedido?: boolean
  }

  export type PedidoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "externalId" | "clienteId" | "dataPedido" | "valorTotal" | "statusPedido" | "origemPedido", ExtArgs["result"]["pedido"]>
  export type PedidoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    itens?: boolean | Pedido$itensArgs<ExtArgs>
    _count?: boolean | PedidoCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $PedidoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Pedido"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs>
      itens: Prisma.$ItemPedidoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      externalId: string | null
      clienteId: string
      dataPedido: Date
      valorTotal: Prisma.Decimal
      statusPedido: string
      origemPedido: $Enums.OrigemPedido
    }, ExtArgs["result"]["pedido"]>
    composites: {}
  }

  type PedidoGetPayload<S extends boolean | null | undefined | PedidoDefaultArgs> = $Result.GetResult<Prisma.$PedidoPayload, S>

  type PedidoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PedidoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PedidoCountAggregateInputType | true
    }

  export interface PedidoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Pedido'], meta: { name: 'Pedido' } }
    /**
     * Find zero or one Pedido that matches the filter.
     * @param {PedidoFindUniqueArgs} args - Arguments to find a Pedido
     * @example
     * // Get one Pedido
     * const pedido = await prisma.pedido.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PedidoFindUniqueArgs>(args: SelectSubset<T, PedidoFindUniqueArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Pedido that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PedidoFindUniqueOrThrowArgs} args - Arguments to find a Pedido
     * @example
     * // Get one Pedido
     * const pedido = await prisma.pedido.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PedidoFindUniqueOrThrowArgs>(args: SelectSubset<T, PedidoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pedido that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoFindFirstArgs} args - Arguments to find a Pedido
     * @example
     * // Get one Pedido
     * const pedido = await prisma.pedido.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PedidoFindFirstArgs>(args?: SelectSubset<T, PedidoFindFirstArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pedido that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoFindFirstOrThrowArgs} args - Arguments to find a Pedido
     * @example
     * // Get one Pedido
     * const pedido = await prisma.pedido.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PedidoFindFirstOrThrowArgs>(args?: SelectSubset<T, PedidoFindFirstOrThrowArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Pedidos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Pedidos
     * const pedidos = await prisma.pedido.findMany()
     * 
     * // Get first 10 Pedidos
     * const pedidos = await prisma.pedido.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pedidoWithIdOnly = await prisma.pedido.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PedidoFindManyArgs>(args?: SelectSubset<T, PedidoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Pedido.
     * @param {PedidoCreateArgs} args - Arguments to create a Pedido.
     * @example
     * // Create one Pedido
     * const Pedido = await prisma.pedido.create({
     *   data: {
     *     // ... data to create a Pedido
     *   }
     * })
     * 
     */
    create<T extends PedidoCreateArgs>(args: SelectSubset<T, PedidoCreateArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Pedidos.
     * @param {PedidoCreateManyArgs} args - Arguments to create many Pedidos.
     * @example
     * // Create many Pedidos
     * const pedido = await prisma.pedido.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PedidoCreateManyArgs>(args?: SelectSubset<T, PedidoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Pedido.
     * @param {PedidoDeleteArgs} args - Arguments to delete one Pedido.
     * @example
     * // Delete one Pedido
     * const Pedido = await prisma.pedido.delete({
     *   where: {
     *     // ... filter to delete one Pedido
     *   }
     * })
     * 
     */
    delete<T extends PedidoDeleteArgs>(args: SelectSubset<T, PedidoDeleteArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Pedido.
     * @param {PedidoUpdateArgs} args - Arguments to update one Pedido.
     * @example
     * // Update one Pedido
     * const pedido = await prisma.pedido.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PedidoUpdateArgs>(args: SelectSubset<T, PedidoUpdateArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Pedidos.
     * @param {PedidoDeleteManyArgs} args - Arguments to filter Pedidos to delete.
     * @example
     * // Delete a few Pedidos
     * const { count } = await prisma.pedido.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PedidoDeleteManyArgs>(args?: SelectSubset<T, PedidoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pedidos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Pedidos
     * const pedido = await prisma.pedido.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PedidoUpdateManyArgs>(args: SelectSubset<T, PedidoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Pedido.
     * @param {PedidoUpsertArgs} args - Arguments to update or create a Pedido.
     * @example
     * // Update or create a Pedido
     * const pedido = await prisma.pedido.upsert({
     *   create: {
     *     // ... data to create a Pedido
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Pedido we want to update
     *   }
     * })
     */
    upsert<T extends PedidoUpsertArgs>(args: SelectSubset<T, PedidoUpsertArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Pedidos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoCountArgs} args - Arguments to filter Pedidos to count.
     * @example
     * // Count the number of Pedidos
     * const count = await prisma.pedido.count({
     *   where: {
     *     // ... the filter for the Pedidos we want to count
     *   }
     * })
    **/
    count<T extends PedidoCountArgs>(
      args?: Subset<T, PedidoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PedidoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Pedido.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PedidoAggregateArgs>(args: Subset<T, PedidoAggregateArgs>): Prisma.PrismaPromise<GetPedidoAggregateType<T>>

    /**
     * Group by Pedido.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PedidoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PedidoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PedidoGroupByArgs['orderBy'] }
        : { orderBy?: PedidoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PedidoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPedidoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Pedido model
   */
  readonly fields: PedidoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Pedido.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PedidoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends ClienteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClienteDefaultArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    itens<T extends Pedido$itensArgs<ExtArgs> = {}>(args?: Subset<T, Pedido$itensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Pedido model
   */
  interface PedidoFieldRefs {
    readonly id: FieldRef<"Pedido", 'String'>
    readonly externalId: FieldRef<"Pedido", 'String'>
    readonly clienteId: FieldRef<"Pedido", 'String'>
    readonly dataPedido: FieldRef<"Pedido", 'DateTime'>
    readonly valorTotal: FieldRef<"Pedido", 'Decimal'>
    readonly statusPedido: FieldRef<"Pedido", 'String'>
    readonly origemPedido: FieldRef<"Pedido", 'OrigemPedido'>
  }
    

  // Custom InputTypes
  /**
   * Pedido findUnique
   */
  export type PedidoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter, which Pedido to fetch.
     */
    where: PedidoWhereUniqueInput
  }

  /**
   * Pedido findUniqueOrThrow
   */
  export type PedidoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter, which Pedido to fetch.
     */
    where: PedidoWhereUniqueInput
  }

  /**
   * Pedido findFirst
   */
  export type PedidoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter, which Pedido to fetch.
     */
    where?: PedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pedidos to fetch.
     */
    orderBy?: PedidoOrderByWithRelationInput | PedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pedidos.
     */
    cursor?: PedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pedidos.
     */
    distinct?: PedidoScalarFieldEnum | PedidoScalarFieldEnum[]
  }

  /**
   * Pedido findFirstOrThrow
   */
  export type PedidoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter, which Pedido to fetch.
     */
    where?: PedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pedidos to fetch.
     */
    orderBy?: PedidoOrderByWithRelationInput | PedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pedidos.
     */
    cursor?: PedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pedidos.
     */
    distinct?: PedidoScalarFieldEnum | PedidoScalarFieldEnum[]
  }

  /**
   * Pedido findMany
   */
  export type PedidoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter, which Pedidos to fetch.
     */
    where?: PedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pedidos to fetch.
     */
    orderBy?: PedidoOrderByWithRelationInput | PedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Pedidos.
     */
    cursor?: PedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pedidos.
     */
    skip?: number
    distinct?: PedidoScalarFieldEnum | PedidoScalarFieldEnum[]
  }

  /**
   * Pedido create
   */
  export type PedidoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * The data needed to create a Pedido.
     */
    data: XOR<PedidoCreateInput, PedidoUncheckedCreateInput>
  }

  /**
   * Pedido createMany
   */
  export type PedidoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Pedidos.
     */
    data: PedidoCreateManyInput | PedidoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Pedido update
   */
  export type PedidoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * The data needed to update a Pedido.
     */
    data: XOR<PedidoUpdateInput, PedidoUncheckedUpdateInput>
    /**
     * Choose, which Pedido to update.
     */
    where: PedidoWhereUniqueInput
  }

  /**
   * Pedido updateMany
   */
  export type PedidoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Pedidos.
     */
    data: XOR<PedidoUpdateManyMutationInput, PedidoUncheckedUpdateManyInput>
    /**
     * Filter which Pedidos to update
     */
    where?: PedidoWhereInput
    /**
     * Limit how many Pedidos to update.
     */
    limit?: number
  }

  /**
   * Pedido upsert
   */
  export type PedidoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * The filter to search for the Pedido to update in case it exists.
     */
    where: PedidoWhereUniqueInput
    /**
     * In case the Pedido found by the `where` argument doesn't exist, create a new Pedido with this data.
     */
    create: XOR<PedidoCreateInput, PedidoUncheckedCreateInput>
    /**
     * In case the Pedido was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PedidoUpdateInput, PedidoUncheckedUpdateInput>
  }

  /**
   * Pedido delete
   */
  export type PedidoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
    /**
     * Filter which Pedido to delete.
     */
    where: PedidoWhereUniqueInput
  }

  /**
   * Pedido deleteMany
   */
  export type PedidoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pedidos to delete
     */
    where?: PedidoWhereInput
    /**
     * Limit how many Pedidos to delete.
     */
    limit?: number
  }

  /**
   * Pedido.itens
   */
  export type Pedido$itensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    where?: ItemPedidoWhereInput
    orderBy?: ItemPedidoOrderByWithRelationInput | ItemPedidoOrderByWithRelationInput[]
    cursor?: ItemPedidoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ItemPedidoScalarFieldEnum | ItemPedidoScalarFieldEnum[]
  }

  /**
   * Pedido without action
   */
  export type PedidoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pedido
     */
    select?: PedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pedido
     */
    omit?: PedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PedidoInclude<ExtArgs> | null
  }


  /**
   * Model ItemPedido
   */

  export type AggregateItemPedido = {
    _count: ItemPedidoCountAggregateOutputType | null
    _avg: ItemPedidoAvgAggregateOutputType | null
    _sum: ItemPedidoSumAggregateOutputType | null
    _min: ItemPedidoMinAggregateOutputType | null
    _max: ItemPedidoMaxAggregateOutputType | null
  }

  export type ItemPedidoAvgAggregateOutputType = {
    quantidade: Decimal | null
    precoUnit: Decimal | null
  }

  export type ItemPedidoSumAggregateOutputType = {
    quantidade: Decimal | null
    precoUnit: Decimal | null
  }

  export type ItemPedidoMinAggregateOutputType = {
    id: string | null
    pedidoId: string | null
    sku: string | null
    produto: string | null
    categoria: string | null
    quantidade: Decimal | null
    precoUnit: Decimal | null
  }

  export type ItemPedidoMaxAggregateOutputType = {
    id: string | null
    pedidoId: string | null
    sku: string | null
    produto: string | null
    categoria: string | null
    quantidade: Decimal | null
    precoUnit: Decimal | null
  }

  export type ItemPedidoCountAggregateOutputType = {
    id: number
    pedidoId: number
    sku: number
    produto: number
    categoria: number
    quantidade: number
    precoUnit: number
    _all: number
  }


  export type ItemPedidoAvgAggregateInputType = {
    quantidade?: true
    precoUnit?: true
  }

  export type ItemPedidoSumAggregateInputType = {
    quantidade?: true
    precoUnit?: true
  }

  export type ItemPedidoMinAggregateInputType = {
    id?: true
    pedidoId?: true
    sku?: true
    produto?: true
    categoria?: true
    quantidade?: true
    precoUnit?: true
  }

  export type ItemPedidoMaxAggregateInputType = {
    id?: true
    pedidoId?: true
    sku?: true
    produto?: true
    categoria?: true
    quantidade?: true
    precoUnit?: true
  }

  export type ItemPedidoCountAggregateInputType = {
    id?: true
    pedidoId?: true
    sku?: true
    produto?: true
    categoria?: true
    quantidade?: true
    precoUnit?: true
    _all?: true
  }

  export type ItemPedidoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemPedido to aggregate.
     */
    where?: ItemPedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemPedidos to fetch.
     */
    orderBy?: ItemPedidoOrderByWithRelationInput | ItemPedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ItemPedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemPedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemPedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ItemPedidos
    **/
    _count?: true | ItemPedidoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ItemPedidoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ItemPedidoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ItemPedidoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ItemPedidoMaxAggregateInputType
  }

  export type GetItemPedidoAggregateType<T extends ItemPedidoAggregateArgs> = {
        [P in keyof T & keyof AggregateItemPedido]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateItemPedido[P]>
      : GetScalarType<T[P], AggregateItemPedido[P]>
  }




  export type ItemPedidoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemPedidoWhereInput
    orderBy?: ItemPedidoOrderByWithAggregationInput | ItemPedidoOrderByWithAggregationInput[]
    by: ItemPedidoScalarFieldEnum[] | ItemPedidoScalarFieldEnum
    having?: ItemPedidoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ItemPedidoCountAggregateInputType | true
    _avg?: ItemPedidoAvgAggregateInputType
    _sum?: ItemPedidoSumAggregateInputType
    _min?: ItemPedidoMinAggregateInputType
    _max?: ItemPedidoMaxAggregateInputType
  }

  export type ItemPedidoGroupByOutputType = {
    id: string
    pedidoId: string
    sku: string | null
    produto: string
    categoria: string | null
    quantidade: Decimal
    precoUnit: Decimal
    _count: ItemPedidoCountAggregateOutputType | null
    _avg: ItemPedidoAvgAggregateOutputType | null
    _sum: ItemPedidoSumAggregateOutputType | null
    _min: ItemPedidoMinAggregateOutputType | null
    _max: ItemPedidoMaxAggregateOutputType | null
  }

  type GetItemPedidoGroupByPayload<T extends ItemPedidoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ItemPedidoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ItemPedidoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ItemPedidoGroupByOutputType[P]>
            : GetScalarType<T[P], ItemPedidoGroupByOutputType[P]>
        }
      >
    >


  export type ItemPedidoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pedidoId?: boolean
    sku?: boolean
    produto?: boolean
    categoria?: boolean
    quantidade?: boolean
    precoUnit?: boolean
    pedido?: boolean | PedidoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemPedido"]>



  export type ItemPedidoSelectScalar = {
    id?: boolean
    pedidoId?: boolean
    sku?: boolean
    produto?: boolean
    categoria?: boolean
    quantidade?: boolean
    precoUnit?: boolean
  }

  export type ItemPedidoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "pedidoId" | "sku" | "produto" | "categoria" | "quantidade" | "precoUnit", ExtArgs["result"]["itemPedido"]>
  export type ItemPedidoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pedido?: boolean | PedidoDefaultArgs<ExtArgs>
  }

  export type $ItemPedidoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ItemPedido"
    objects: {
      pedido: Prisma.$PedidoPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      pedidoId: string
      sku: string | null
      produto: string
      categoria: string | null
      quantidade: Prisma.Decimal
      precoUnit: Prisma.Decimal
    }, ExtArgs["result"]["itemPedido"]>
    composites: {}
  }

  type ItemPedidoGetPayload<S extends boolean | null | undefined | ItemPedidoDefaultArgs> = $Result.GetResult<Prisma.$ItemPedidoPayload, S>

  type ItemPedidoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ItemPedidoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ItemPedidoCountAggregateInputType | true
    }

  export interface ItemPedidoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ItemPedido'], meta: { name: 'ItemPedido' } }
    /**
     * Find zero or one ItemPedido that matches the filter.
     * @param {ItemPedidoFindUniqueArgs} args - Arguments to find a ItemPedido
     * @example
     * // Get one ItemPedido
     * const itemPedido = await prisma.itemPedido.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ItemPedidoFindUniqueArgs>(args: SelectSubset<T, ItemPedidoFindUniqueArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ItemPedido that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ItemPedidoFindUniqueOrThrowArgs} args - Arguments to find a ItemPedido
     * @example
     * // Get one ItemPedido
     * const itemPedido = await prisma.itemPedido.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ItemPedidoFindUniqueOrThrowArgs>(args: SelectSubset<T, ItemPedidoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemPedido that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoFindFirstArgs} args - Arguments to find a ItemPedido
     * @example
     * // Get one ItemPedido
     * const itemPedido = await prisma.itemPedido.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ItemPedidoFindFirstArgs>(args?: SelectSubset<T, ItemPedidoFindFirstArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemPedido that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoFindFirstOrThrowArgs} args - Arguments to find a ItemPedido
     * @example
     * // Get one ItemPedido
     * const itemPedido = await prisma.itemPedido.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ItemPedidoFindFirstOrThrowArgs>(args?: SelectSubset<T, ItemPedidoFindFirstOrThrowArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ItemPedidos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ItemPedidos
     * const itemPedidos = await prisma.itemPedido.findMany()
     * 
     * // Get first 10 ItemPedidos
     * const itemPedidos = await prisma.itemPedido.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const itemPedidoWithIdOnly = await prisma.itemPedido.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ItemPedidoFindManyArgs>(args?: SelectSubset<T, ItemPedidoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ItemPedido.
     * @param {ItemPedidoCreateArgs} args - Arguments to create a ItemPedido.
     * @example
     * // Create one ItemPedido
     * const ItemPedido = await prisma.itemPedido.create({
     *   data: {
     *     // ... data to create a ItemPedido
     *   }
     * })
     * 
     */
    create<T extends ItemPedidoCreateArgs>(args: SelectSubset<T, ItemPedidoCreateArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ItemPedidos.
     * @param {ItemPedidoCreateManyArgs} args - Arguments to create many ItemPedidos.
     * @example
     * // Create many ItemPedidos
     * const itemPedido = await prisma.itemPedido.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ItemPedidoCreateManyArgs>(args?: SelectSubset<T, ItemPedidoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ItemPedido.
     * @param {ItemPedidoDeleteArgs} args - Arguments to delete one ItemPedido.
     * @example
     * // Delete one ItemPedido
     * const ItemPedido = await prisma.itemPedido.delete({
     *   where: {
     *     // ... filter to delete one ItemPedido
     *   }
     * })
     * 
     */
    delete<T extends ItemPedidoDeleteArgs>(args: SelectSubset<T, ItemPedidoDeleteArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ItemPedido.
     * @param {ItemPedidoUpdateArgs} args - Arguments to update one ItemPedido.
     * @example
     * // Update one ItemPedido
     * const itemPedido = await prisma.itemPedido.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ItemPedidoUpdateArgs>(args: SelectSubset<T, ItemPedidoUpdateArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ItemPedidos.
     * @param {ItemPedidoDeleteManyArgs} args - Arguments to filter ItemPedidos to delete.
     * @example
     * // Delete a few ItemPedidos
     * const { count } = await prisma.itemPedido.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ItemPedidoDeleteManyArgs>(args?: SelectSubset<T, ItemPedidoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItemPedidos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ItemPedidos
     * const itemPedido = await prisma.itemPedido.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ItemPedidoUpdateManyArgs>(args: SelectSubset<T, ItemPedidoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ItemPedido.
     * @param {ItemPedidoUpsertArgs} args - Arguments to update or create a ItemPedido.
     * @example
     * // Update or create a ItemPedido
     * const itemPedido = await prisma.itemPedido.upsert({
     *   create: {
     *     // ... data to create a ItemPedido
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ItemPedido we want to update
     *   }
     * })
     */
    upsert<T extends ItemPedidoUpsertArgs>(args: SelectSubset<T, ItemPedidoUpsertArgs<ExtArgs>>): Prisma__ItemPedidoClient<$Result.GetResult<Prisma.$ItemPedidoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ItemPedidos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoCountArgs} args - Arguments to filter ItemPedidos to count.
     * @example
     * // Count the number of ItemPedidos
     * const count = await prisma.itemPedido.count({
     *   where: {
     *     // ... the filter for the ItemPedidos we want to count
     *   }
     * })
    **/
    count<T extends ItemPedidoCountArgs>(
      args?: Subset<T, ItemPedidoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ItemPedidoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ItemPedido.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ItemPedidoAggregateArgs>(args: Subset<T, ItemPedidoAggregateArgs>): Prisma.PrismaPromise<GetItemPedidoAggregateType<T>>

    /**
     * Group by ItemPedido.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemPedidoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ItemPedidoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ItemPedidoGroupByArgs['orderBy'] }
        : { orderBy?: ItemPedidoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ItemPedidoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetItemPedidoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ItemPedido model
   */
  readonly fields: ItemPedidoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ItemPedido.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ItemPedidoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pedido<T extends PedidoDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PedidoDefaultArgs<ExtArgs>>): Prisma__PedidoClient<$Result.GetResult<Prisma.$PedidoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ItemPedido model
   */
  interface ItemPedidoFieldRefs {
    readonly id: FieldRef<"ItemPedido", 'String'>
    readonly pedidoId: FieldRef<"ItemPedido", 'String'>
    readonly sku: FieldRef<"ItemPedido", 'String'>
    readonly produto: FieldRef<"ItemPedido", 'String'>
    readonly categoria: FieldRef<"ItemPedido", 'String'>
    readonly quantidade: FieldRef<"ItemPedido", 'Decimal'>
    readonly precoUnit: FieldRef<"ItemPedido", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * ItemPedido findUnique
   */
  export type ItemPedidoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter, which ItemPedido to fetch.
     */
    where: ItemPedidoWhereUniqueInput
  }

  /**
   * ItemPedido findUniqueOrThrow
   */
  export type ItemPedidoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter, which ItemPedido to fetch.
     */
    where: ItemPedidoWhereUniqueInput
  }

  /**
   * ItemPedido findFirst
   */
  export type ItemPedidoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter, which ItemPedido to fetch.
     */
    where?: ItemPedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemPedidos to fetch.
     */
    orderBy?: ItemPedidoOrderByWithRelationInput | ItemPedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemPedidos.
     */
    cursor?: ItemPedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemPedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemPedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemPedidos.
     */
    distinct?: ItemPedidoScalarFieldEnum | ItemPedidoScalarFieldEnum[]
  }

  /**
   * ItemPedido findFirstOrThrow
   */
  export type ItemPedidoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter, which ItemPedido to fetch.
     */
    where?: ItemPedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemPedidos to fetch.
     */
    orderBy?: ItemPedidoOrderByWithRelationInput | ItemPedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemPedidos.
     */
    cursor?: ItemPedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemPedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemPedidos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemPedidos.
     */
    distinct?: ItemPedidoScalarFieldEnum | ItemPedidoScalarFieldEnum[]
  }

  /**
   * ItemPedido findMany
   */
  export type ItemPedidoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter, which ItemPedidos to fetch.
     */
    where?: ItemPedidoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemPedidos to fetch.
     */
    orderBy?: ItemPedidoOrderByWithRelationInput | ItemPedidoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ItemPedidos.
     */
    cursor?: ItemPedidoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemPedidos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemPedidos.
     */
    skip?: number
    distinct?: ItemPedidoScalarFieldEnum | ItemPedidoScalarFieldEnum[]
  }

  /**
   * ItemPedido create
   */
  export type ItemPedidoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * The data needed to create a ItemPedido.
     */
    data: XOR<ItemPedidoCreateInput, ItemPedidoUncheckedCreateInput>
  }

  /**
   * ItemPedido createMany
   */
  export type ItemPedidoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ItemPedidos.
     */
    data: ItemPedidoCreateManyInput | ItemPedidoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ItemPedido update
   */
  export type ItemPedidoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * The data needed to update a ItemPedido.
     */
    data: XOR<ItemPedidoUpdateInput, ItemPedidoUncheckedUpdateInput>
    /**
     * Choose, which ItemPedido to update.
     */
    where: ItemPedidoWhereUniqueInput
  }

  /**
   * ItemPedido updateMany
   */
  export type ItemPedidoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ItemPedidos.
     */
    data: XOR<ItemPedidoUpdateManyMutationInput, ItemPedidoUncheckedUpdateManyInput>
    /**
     * Filter which ItemPedidos to update
     */
    where?: ItemPedidoWhereInput
    /**
     * Limit how many ItemPedidos to update.
     */
    limit?: number
  }

  /**
   * ItemPedido upsert
   */
  export type ItemPedidoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * The filter to search for the ItemPedido to update in case it exists.
     */
    where: ItemPedidoWhereUniqueInput
    /**
     * In case the ItemPedido found by the `where` argument doesn't exist, create a new ItemPedido with this data.
     */
    create: XOR<ItemPedidoCreateInput, ItemPedidoUncheckedCreateInput>
    /**
     * In case the ItemPedido was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ItemPedidoUpdateInput, ItemPedidoUncheckedUpdateInput>
  }

  /**
   * ItemPedido delete
   */
  export type ItemPedidoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
    /**
     * Filter which ItemPedido to delete.
     */
    where: ItemPedidoWhereUniqueInput
  }

  /**
   * ItemPedido deleteMany
   */
  export type ItemPedidoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemPedidos to delete
     */
    where?: ItemPedidoWhereInput
    /**
     * Limit how many ItemPedidos to delete.
     */
    limit?: number
  }

  /**
   * ItemPedido without action
   */
  export type ItemPedidoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemPedido
     */
    select?: ItemPedidoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemPedido
     */
    omit?: ItemPedidoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemPedidoInclude<ExtArgs> | null
  }


  /**
   * Model Interacao
   */

  export type AggregateInteracao = {
    _count: InteracaoCountAggregateOutputType | null
    _avg: InteracaoAvgAggregateOutputType | null
    _sum: InteracaoSumAggregateOutputType | null
    _min: InteracaoMinAggregateOutputType | null
    _max: InteracaoMaxAggregateOutputType | null
  }

  export type InteracaoAvgAggregateOutputType = {
    sentimento: Decimal | null
  }

  export type InteracaoSumAggregateOutputType = {
    sentimento: Decimal | null
  }

  export type InteracaoMinAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoInteracao: $Enums.TipoInteracao | null
    dataInteracao: Date | null
    resumo: string | null
    sentimento: Decimal | null
    oportunidadeDetectada: boolean | null
    riscoDetectado: boolean | null
    conteudoBruto: string | null
  }

  export type InteracaoMaxAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoInteracao: $Enums.TipoInteracao | null
    dataInteracao: Date | null
    resumo: string | null
    sentimento: Decimal | null
    oportunidadeDetectada: boolean | null
    riscoDetectado: boolean | null
    conteudoBruto: string | null
  }

  export type InteracaoCountAggregateOutputType = {
    id: number
    clienteId: number
    tipoInteracao: number
    dataInteracao: number
    resumo: number
    sentimento: number
    oportunidadeDetectada: number
    riscoDetectado: number
    conteudoBruto: number
    _all: number
  }


  export type InteracaoAvgAggregateInputType = {
    sentimento?: true
  }

  export type InteracaoSumAggregateInputType = {
    sentimento?: true
  }

  export type InteracaoMinAggregateInputType = {
    id?: true
    clienteId?: true
    tipoInteracao?: true
    dataInteracao?: true
    resumo?: true
    sentimento?: true
    oportunidadeDetectada?: true
    riscoDetectado?: true
    conteudoBruto?: true
  }

  export type InteracaoMaxAggregateInputType = {
    id?: true
    clienteId?: true
    tipoInteracao?: true
    dataInteracao?: true
    resumo?: true
    sentimento?: true
    oportunidadeDetectada?: true
    riscoDetectado?: true
    conteudoBruto?: true
  }

  export type InteracaoCountAggregateInputType = {
    id?: true
    clienteId?: true
    tipoInteracao?: true
    dataInteracao?: true
    resumo?: true
    sentimento?: true
    oportunidadeDetectada?: true
    riscoDetectado?: true
    conteudoBruto?: true
    _all?: true
  }

  export type InteracaoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Interacao to aggregate.
     */
    where?: InteracaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Interacaos to fetch.
     */
    orderBy?: InteracaoOrderByWithRelationInput | InteracaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InteracaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Interacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Interacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Interacaos
    **/
    _count?: true | InteracaoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InteracaoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InteracaoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InteracaoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InteracaoMaxAggregateInputType
  }

  export type GetInteracaoAggregateType<T extends InteracaoAggregateArgs> = {
        [P in keyof T & keyof AggregateInteracao]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInteracao[P]>
      : GetScalarType<T[P], AggregateInteracao[P]>
  }




  export type InteracaoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InteracaoWhereInput
    orderBy?: InteracaoOrderByWithAggregationInput | InteracaoOrderByWithAggregationInput[]
    by: InteracaoScalarFieldEnum[] | InteracaoScalarFieldEnum
    having?: InteracaoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InteracaoCountAggregateInputType | true
    _avg?: InteracaoAvgAggregateInputType
    _sum?: InteracaoSumAggregateInputType
    _min?: InteracaoMinAggregateInputType
    _max?: InteracaoMaxAggregateInputType
  }

  export type InteracaoGroupByOutputType = {
    id: string
    clienteId: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date
    resumo: string | null
    sentimento: Decimal | null
    oportunidadeDetectada: boolean
    riscoDetectado: boolean
    conteudoBruto: string | null
    _count: InteracaoCountAggregateOutputType | null
    _avg: InteracaoAvgAggregateOutputType | null
    _sum: InteracaoSumAggregateOutputType | null
    _min: InteracaoMinAggregateOutputType | null
    _max: InteracaoMaxAggregateOutputType | null
  }

  type GetInteracaoGroupByPayload<T extends InteracaoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InteracaoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InteracaoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InteracaoGroupByOutputType[P]>
            : GetScalarType<T[P], InteracaoGroupByOutputType[P]>
        }
      >
    >


  export type InteracaoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clienteId?: boolean
    tipoInteracao?: boolean
    dataInteracao?: boolean
    resumo?: boolean
    sentimento?: boolean
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: boolean
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["interacao"]>



  export type InteracaoSelectScalar = {
    id?: boolean
    clienteId?: boolean
    tipoInteracao?: boolean
    dataInteracao?: boolean
    resumo?: boolean
    sentimento?: boolean
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: boolean
  }

  export type InteracaoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clienteId" | "tipoInteracao" | "dataInteracao" | "resumo" | "sentimento" | "oportunidadeDetectada" | "riscoDetectado" | "conteudoBruto", ExtArgs["result"]["interacao"]>
  export type InteracaoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
  }

  export type $InteracaoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Interacao"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clienteId: string
      tipoInteracao: $Enums.TipoInteracao
      dataInteracao: Date
      resumo: string | null
      sentimento: Prisma.Decimal | null
      oportunidadeDetectada: boolean
      riscoDetectado: boolean
      conteudoBruto: string | null
    }, ExtArgs["result"]["interacao"]>
    composites: {}
  }

  type InteracaoGetPayload<S extends boolean | null | undefined | InteracaoDefaultArgs> = $Result.GetResult<Prisma.$InteracaoPayload, S>

  type InteracaoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InteracaoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InteracaoCountAggregateInputType | true
    }

  export interface InteracaoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Interacao'], meta: { name: 'Interacao' } }
    /**
     * Find zero or one Interacao that matches the filter.
     * @param {InteracaoFindUniqueArgs} args - Arguments to find a Interacao
     * @example
     * // Get one Interacao
     * const interacao = await prisma.interacao.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InteracaoFindUniqueArgs>(args: SelectSubset<T, InteracaoFindUniqueArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Interacao that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InteracaoFindUniqueOrThrowArgs} args - Arguments to find a Interacao
     * @example
     * // Get one Interacao
     * const interacao = await prisma.interacao.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InteracaoFindUniqueOrThrowArgs>(args: SelectSubset<T, InteracaoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Interacao that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoFindFirstArgs} args - Arguments to find a Interacao
     * @example
     * // Get one Interacao
     * const interacao = await prisma.interacao.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InteracaoFindFirstArgs>(args?: SelectSubset<T, InteracaoFindFirstArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Interacao that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoFindFirstOrThrowArgs} args - Arguments to find a Interacao
     * @example
     * // Get one Interacao
     * const interacao = await prisma.interacao.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InteracaoFindFirstOrThrowArgs>(args?: SelectSubset<T, InteracaoFindFirstOrThrowArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Interacaos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Interacaos
     * const interacaos = await prisma.interacao.findMany()
     * 
     * // Get first 10 Interacaos
     * const interacaos = await prisma.interacao.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const interacaoWithIdOnly = await prisma.interacao.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InteracaoFindManyArgs>(args?: SelectSubset<T, InteracaoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Interacao.
     * @param {InteracaoCreateArgs} args - Arguments to create a Interacao.
     * @example
     * // Create one Interacao
     * const Interacao = await prisma.interacao.create({
     *   data: {
     *     // ... data to create a Interacao
     *   }
     * })
     * 
     */
    create<T extends InteracaoCreateArgs>(args: SelectSubset<T, InteracaoCreateArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Interacaos.
     * @param {InteracaoCreateManyArgs} args - Arguments to create many Interacaos.
     * @example
     * // Create many Interacaos
     * const interacao = await prisma.interacao.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InteracaoCreateManyArgs>(args?: SelectSubset<T, InteracaoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Interacao.
     * @param {InteracaoDeleteArgs} args - Arguments to delete one Interacao.
     * @example
     * // Delete one Interacao
     * const Interacao = await prisma.interacao.delete({
     *   where: {
     *     // ... filter to delete one Interacao
     *   }
     * })
     * 
     */
    delete<T extends InteracaoDeleteArgs>(args: SelectSubset<T, InteracaoDeleteArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Interacao.
     * @param {InteracaoUpdateArgs} args - Arguments to update one Interacao.
     * @example
     * // Update one Interacao
     * const interacao = await prisma.interacao.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InteracaoUpdateArgs>(args: SelectSubset<T, InteracaoUpdateArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Interacaos.
     * @param {InteracaoDeleteManyArgs} args - Arguments to filter Interacaos to delete.
     * @example
     * // Delete a few Interacaos
     * const { count } = await prisma.interacao.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InteracaoDeleteManyArgs>(args?: SelectSubset<T, InteracaoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Interacaos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Interacaos
     * const interacao = await prisma.interacao.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InteracaoUpdateManyArgs>(args: SelectSubset<T, InteracaoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Interacao.
     * @param {InteracaoUpsertArgs} args - Arguments to update or create a Interacao.
     * @example
     * // Update or create a Interacao
     * const interacao = await prisma.interacao.upsert({
     *   create: {
     *     // ... data to create a Interacao
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Interacao we want to update
     *   }
     * })
     */
    upsert<T extends InteracaoUpsertArgs>(args: SelectSubset<T, InteracaoUpsertArgs<ExtArgs>>): Prisma__InteracaoClient<$Result.GetResult<Prisma.$InteracaoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Interacaos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoCountArgs} args - Arguments to filter Interacaos to count.
     * @example
     * // Count the number of Interacaos
     * const count = await prisma.interacao.count({
     *   where: {
     *     // ... the filter for the Interacaos we want to count
     *   }
     * })
    **/
    count<T extends InteracaoCountArgs>(
      args?: Subset<T, InteracaoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InteracaoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Interacao.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InteracaoAggregateArgs>(args: Subset<T, InteracaoAggregateArgs>): Prisma.PrismaPromise<GetInteracaoAggregateType<T>>

    /**
     * Group by Interacao.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InteracaoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InteracaoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InteracaoGroupByArgs['orderBy'] }
        : { orderBy?: InteracaoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InteracaoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInteracaoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Interacao model
   */
  readonly fields: InteracaoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Interacao.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InteracaoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends ClienteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClienteDefaultArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Interacao model
   */
  interface InteracaoFieldRefs {
    readonly id: FieldRef<"Interacao", 'String'>
    readonly clienteId: FieldRef<"Interacao", 'String'>
    readonly tipoInteracao: FieldRef<"Interacao", 'TipoInteracao'>
    readonly dataInteracao: FieldRef<"Interacao", 'DateTime'>
    readonly resumo: FieldRef<"Interacao", 'String'>
    readonly sentimento: FieldRef<"Interacao", 'Decimal'>
    readonly oportunidadeDetectada: FieldRef<"Interacao", 'Boolean'>
    readonly riscoDetectado: FieldRef<"Interacao", 'Boolean'>
    readonly conteudoBruto: FieldRef<"Interacao", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Interacao findUnique
   */
  export type InteracaoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter, which Interacao to fetch.
     */
    where: InteracaoWhereUniqueInput
  }

  /**
   * Interacao findUniqueOrThrow
   */
  export type InteracaoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter, which Interacao to fetch.
     */
    where: InteracaoWhereUniqueInput
  }

  /**
   * Interacao findFirst
   */
  export type InteracaoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter, which Interacao to fetch.
     */
    where?: InteracaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Interacaos to fetch.
     */
    orderBy?: InteracaoOrderByWithRelationInput | InteracaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Interacaos.
     */
    cursor?: InteracaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Interacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Interacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Interacaos.
     */
    distinct?: InteracaoScalarFieldEnum | InteracaoScalarFieldEnum[]
  }

  /**
   * Interacao findFirstOrThrow
   */
  export type InteracaoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter, which Interacao to fetch.
     */
    where?: InteracaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Interacaos to fetch.
     */
    orderBy?: InteracaoOrderByWithRelationInput | InteracaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Interacaos.
     */
    cursor?: InteracaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Interacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Interacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Interacaos.
     */
    distinct?: InteracaoScalarFieldEnum | InteracaoScalarFieldEnum[]
  }

  /**
   * Interacao findMany
   */
  export type InteracaoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter, which Interacaos to fetch.
     */
    where?: InteracaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Interacaos to fetch.
     */
    orderBy?: InteracaoOrderByWithRelationInput | InteracaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Interacaos.
     */
    cursor?: InteracaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Interacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Interacaos.
     */
    skip?: number
    distinct?: InteracaoScalarFieldEnum | InteracaoScalarFieldEnum[]
  }

  /**
   * Interacao create
   */
  export type InteracaoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * The data needed to create a Interacao.
     */
    data: XOR<InteracaoCreateInput, InteracaoUncheckedCreateInput>
  }

  /**
   * Interacao createMany
   */
  export type InteracaoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Interacaos.
     */
    data: InteracaoCreateManyInput | InteracaoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Interacao update
   */
  export type InteracaoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * The data needed to update a Interacao.
     */
    data: XOR<InteracaoUpdateInput, InteracaoUncheckedUpdateInput>
    /**
     * Choose, which Interacao to update.
     */
    where: InteracaoWhereUniqueInput
  }

  /**
   * Interacao updateMany
   */
  export type InteracaoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Interacaos.
     */
    data: XOR<InteracaoUpdateManyMutationInput, InteracaoUncheckedUpdateManyInput>
    /**
     * Filter which Interacaos to update
     */
    where?: InteracaoWhereInput
    /**
     * Limit how many Interacaos to update.
     */
    limit?: number
  }

  /**
   * Interacao upsert
   */
  export type InteracaoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * The filter to search for the Interacao to update in case it exists.
     */
    where: InteracaoWhereUniqueInput
    /**
     * In case the Interacao found by the `where` argument doesn't exist, create a new Interacao with this data.
     */
    create: XOR<InteracaoCreateInput, InteracaoUncheckedCreateInput>
    /**
     * In case the Interacao was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InteracaoUpdateInput, InteracaoUncheckedUpdateInput>
  }

  /**
   * Interacao delete
   */
  export type InteracaoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
    /**
     * Filter which Interacao to delete.
     */
    where: InteracaoWhereUniqueInput
  }

  /**
   * Interacao deleteMany
   */
  export type InteracaoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Interacaos to delete
     */
    where?: InteracaoWhereInput
    /**
     * Limit how many Interacaos to delete.
     */
    limit?: number
  }

  /**
   * Interacao without action
   */
  export type InteracaoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Interacao
     */
    select?: InteracaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Interacao
     */
    omit?: InteracaoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InteracaoInclude<ExtArgs> | null
  }


  /**
   * Model Oportunidade
   */

  export type AggregateOportunidade = {
    _count: OportunidadeCountAggregateOutputType | null
    _avg: OportunidadeAvgAggregateOutputType | null
    _sum: OportunidadeSumAggregateOutputType | null
    _min: OportunidadeMinAggregateOutputType | null
    _max: OportunidadeMaxAggregateOutputType | null
  }

  export type OportunidadeAvgAggregateOutputType = {
    valorEstimado: Decimal | null
    probabilidadeConversao: Decimal | null
  }

  export type OportunidadeSumAggregateOutputType = {
    valorEstimado: Decimal | null
    probabilidadeConversao: Decimal | null
  }

  export type OportunidadeMinAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoOportunidade: $Enums.TipoOportunidade | null
    descricao: string | null
    valorEstimado: Decimal | null
    probabilidadeConversao: Decimal | null
    prioridade: $Enums.PrioridadeOportunidade | null
    statusOportunidade: $Enums.StatusOportunidade | null
    dataCriacao: Date | null
    dataFechamento: Date | null
    responsavelId: string | null
  }

  export type OportunidadeMaxAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoOportunidade: $Enums.TipoOportunidade | null
    descricao: string | null
    valorEstimado: Decimal | null
    probabilidadeConversao: Decimal | null
    prioridade: $Enums.PrioridadeOportunidade | null
    statusOportunidade: $Enums.StatusOportunidade | null
    dataCriacao: Date | null
    dataFechamento: Date | null
    responsavelId: string | null
  }

  export type OportunidadeCountAggregateOutputType = {
    id: number
    clienteId: number
    tipoOportunidade: number
    descricao: number
    valorEstimado: number
    probabilidadeConversao: number
    prioridade: number
    statusOportunidade: number
    dataCriacao: number
    dataFechamento: number
    responsavelId: number
    _all: number
  }


  export type OportunidadeAvgAggregateInputType = {
    valorEstimado?: true
    probabilidadeConversao?: true
  }

  export type OportunidadeSumAggregateInputType = {
    valorEstimado?: true
    probabilidadeConversao?: true
  }

  export type OportunidadeMinAggregateInputType = {
    id?: true
    clienteId?: true
    tipoOportunidade?: true
    descricao?: true
    valorEstimado?: true
    probabilidadeConversao?: true
    prioridade?: true
    statusOportunidade?: true
    dataCriacao?: true
    dataFechamento?: true
    responsavelId?: true
  }

  export type OportunidadeMaxAggregateInputType = {
    id?: true
    clienteId?: true
    tipoOportunidade?: true
    descricao?: true
    valorEstimado?: true
    probabilidadeConversao?: true
    prioridade?: true
    statusOportunidade?: true
    dataCriacao?: true
    dataFechamento?: true
    responsavelId?: true
  }

  export type OportunidadeCountAggregateInputType = {
    id?: true
    clienteId?: true
    tipoOportunidade?: true
    descricao?: true
    valorEstimado?: true
    probabilidadeConversao?: true
    prioridade?: true
    statusOportunidade?: true
    dataCriacao?: true
    dataFechamento?: true
    responsavelId?: true
    _all?: true
  }

  export type OportunidadeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Oportunidade to aggregate.
     */
    where?: OportunidadeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Oportunidades to fetch.
     */
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OportunidadeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Oportunidades from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Oportunidades.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Oportunidades
    **/
    _count?: true | OportunidadeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OportunidadeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OportunidadeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OportunidadeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OportunidadeMaxAggregateInputType
  }

  export type GetOportunidadeAggregateType<T extends OportunidadeAggregateArgs> = {
        [P in keyof T & keyof AggregateOportunidade]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOportunidade[P]>
      : GetScalarType<T[P], AggregateOportunidade[P]>
  }




  export type OportunidadeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OportunidadeWhereInput
    orderBy?: OportunidadeOrderByWithAggregationInput | OportunidadeOrderByWithAggregationInput[]
    by: OportunidadeScalarFieldEnum[] | OportunidadeScalarFieldEnum
    having?: OportunidadeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OportunidadeCountAggregateInputType | true
    _avg?: OportunidadeAvgAggregateInputType
    _sum?: OportunidadeSumAggregateInputType
    _min?: OportunidadeMinAggregateInputType
    _max?: OportunidadeMaxAggregateInputType
  }

  export type OportunidadeGroupByOutputType = {
    id: string
    clienteId: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado: Decimal | null
    probabilidadeConversao: Decimal | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao: Date
    dataFechamento: Date | null
    responsavelId: string | null
    _count: OportunidadeCountAggregateOutputType | null
    _avg: OportunidadeAvgAggregateOutputType | null
    _sum: OportunidadeSumAggregateOutputType | null
    _min: OportunidadeMinAggregateOutputType | null
    _max: OportunidadeMaxAggregateOutputType | null
  }

  type GetOportunidadeGroupByPayload<T extends OportunidadeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OportunidadeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OportunidadeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OportunidadeGroupByOutputType[P]>
            : GetScalarType<T[P], OportunidadeGroupByOutputType[P]>
        }
      >
    >


  export type OportunidadeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clienteId?: boolean
    tipoOportunidade?: boolean
    descricao?: boolean
    valorEstimado?: boolean
    probabilidadeConversao?: boolean
    prioridade?: boolean
    statusOportunidade?: boolean
    dataCriacao?: boolean
    dataFechamento?: boolean
    responsavelId?: boolean
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    responsavel?: boolean | Oportunidade$responsavelArgs<ExtArgs>
  }, ExtArgs["result"]["oportunidade"]>



  export type OportunidadeSelectScalar = {
    id?: boolean
    clienteId?: boolean
    tipoOportunidade?: boolean
    descricao?: boolean
    valorEstimado?: boolean
    probabilidadeConversao?: boolean
    prioridade?: boolean
    statusOportunidade?: boolean
    dataCriacao?: boolean
    dataFechamento?: boolean
    responsavelId?: boolean
  }

  export type OportunidadeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clienteId" | "tipoOportunidade" | "descricao" | "valorEstimado" | "probabilidadeConversao" | "prioridade" | "statusOportunidade" | "dataCriacao" | "dataFechamento" | "responsavelId", ExtArgs["result"]["oportunidade"]>
  export type OportunidadeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    responsavel?: boolean | Oportunidade$responsavelArgs<ExtArgs>
  }

  export type $OportunidadePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Oportunidade"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs>
      responsavel: Prisma.$UsuarioPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clienteId: string
      tipoOportunidade: $Enums.TipoOportunidade
      descricao: string
      valorEstimado: Prisma.Decimal | null
      probabilidadeConversao: Prisma.Decimal | null
      prioridade: $Enums.PrioridadeOportunidade
      statusOportunidade: $Enums.StatusOportunidade
      dataCriacao: Date
      dataFechamento: Date | null
      responsavelId: string | null
    }, ExtArgs["result"]["oportunidade"]>
    composites: {}
  }

  type OportunidadeGetPayload<S extends boolean | null | undefined | OportunidadeDefaultArgs> = $Result.GetResult<Prisma.$OportunidadePayload, S>

  type OportunidadeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OportunidadeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OportunidadeCountAggregateInputType | true
    }

  export interface OportunidadeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Oportunidade'], meta: { name: 'Oportunidade' } }
    /**
     * Find zero or one Oportunidade that matches the filter.
     * @param {OportunidadeFindUniqueArgs} args - Arguments to find a Oportunidade
     * @example
     * // Get one Oportunidade
     * const oportunidade = await prisma.oportunidade.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OportunidadeFindUniqueArgs>(args: SelectSubset<T, OportunidadeFindUniqueArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Oportunidade that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OportunidadeFindUniqueOrThrowArgs} args - Arguments to find a Oportunidade
     * @example
     * // Get one Oportunidade
     * const oportunidade = await prisma.oportunidade.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OportunidadeFindUniqueOrThrowArgs>(args: SelectSubset<T, OportunidadeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Oportunidade that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeFindFirstArgs} args - Arguments to find a Oportunidade
     * @example
     * // Get one Oportunidade
     * const oportunidade = await prisma.oportunidade.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OportunidadeFindFirstArgs>(args?: SelectSubset<T, OportunidadeFindFirstArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Oportunidade that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeFindFirstOrThrowArgs} args - Arguments to find a Oportunidade
     * @example
     * // Get one Oportunidade
     * const oportunidade = await prisma.oportunidade.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OportunidadeFindFirstOrThrowArgs>(args?: SelectSubset<T, OportunidadeFindFirstOrThrowArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Oportunidades that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Oportunidades
     * const oportunidades = await prisma.oportunidade.findMany()
     * 
     * // Get first 10 Oportunidades
     * const oportunidades = await prisma.oportunidade.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const oportunidadeWithIdOnly = await prisma.oportunidade.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OportunidadeFindManyArgs>(args?: SelectSubset<T, OportunidadeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Oportunidade.
     * @param {OportunidadeCreateArgs} args - Arguments to create a Oportunidade.
     * @example
     * // Create one Oportunidade
     * const Oportunidade = await prisma.oportunidade.create({
     *   data: {
     *     // ... data to create a Oportunidade
     *   }
     * })
     * 
     */
    create<T extends OportunidadeCreateArgs>(args: SelectSubset<T, OportunidadeCreateArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Oportunidades.
     * @param {OportunidadeCreateManyArgs} args - Arguments to create many Oportunidades.
     * @example
     * // Create many Oportunidades
     * const oportunidade = await prisma.oportunidade.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OportunidadeCreateManyArgs>(args?: SelectSubset<T, OportunidadeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Oportunidade.
     * @param {OportunidadeDeleteArgs} args - Arguments to delete one Oportunidade.
     * @example
     * // Delete one Oportunidade
     * const Oportunidade = await prisma.oportunidade.delete({
     *   where: {
     *     // ... filter to delete one Oportunidade
     *   }
     * })
     * 
     */
    delete<T extends OportunidadeDeleteArgs>(args: SelectSubset<T, OportunidadeDeleteArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Oportunidade.
     * @param {OportunidadeUpdateArgs} args - Arguments to update one Oportunidade.
     * @example
     * // Update one Oportunidade
     * const oportunidade = await prisma.oportunidade.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OportunidadeUpdateArgs>(args: SelectSubset<T, OportunidadeUpdateArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Oportunidades.
     * @param {OportunidadeDeleteManyArgs} args - Arguments to filter Oportunidades to delete.
     * @example
     * // Delete a few Oportunidades
     * const { count } = await prisma.oportunidade.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OportunidadeDeleteManyArgs>(args?: SelectSubset<T, OportunidadeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Oportunidades.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Oportunidades
     * const oportunidade = await prisma.oportunidade.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OportunidadeUpdateManyArgs>(args: SelectSubset<T, OportunidadeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Oportunidade.
     * @param {OportunidadeUpsertArgs} args - Arguments to update or create a Oportunidade.
     * @example
     * // Update or create a Oportunidade
     * const oportunidade = await prisma.oportunidade.upsert({
     *   create: {
     *     // ... data to create a Oportunidade
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Oportunidade we want to update
     *   }
     * })
     */
    upsert<T extends OportunidadeUpsertArgs>(args: SelectSubset<T, OportunidadeUpsertArgs<ExtArgs>>): Prisma__OportunidadeClient<$Result.GetResult<Prisma.$OportunidadePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Oportunidades.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeCountArgs} args - Arguments to filter Oportunidades to count.
     * @example
     * // Count the number of Oportunidades
     * const count = await prisma.oportunidade.count({
     *   where: {
     *     // ... the filter for the Oportunidades we want to count
     *   }
     * })
    **/
    count<T extends OportunidadeCountArgs>(
      args?: Subset<T, OportunidadeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OportunidadeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Oportunidade.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OportunidadeAggregateArgs>(args: Subset<T, OportunidadeAggregateArgs>): Prisma.PrismaPromise<GetOportunidadeAggregateType<T>>

    /**
     * Group by Oportunidade.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OportunidadeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OportunidadeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OportunidadeGroupByArgs['orderBy'] }
        : { orderBy?: OportunidadeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OportunidadeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOportunidadeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Oportunidade model
   */
  readonly fields: OportunidadeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Oportunidade.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OportunidadeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends ClienteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClienteDefaultArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    responsavel<T extends Oportunidade$responsavelArgs<ExtArgs> = {}>(args?: Subset<T, Oportunidade$responsavelArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Oportunidade model
   */
  interface OportunidadeFieldRefs {
    readonly id: FieldRef<"Oportunidade", 'String'>
    readonly clienteId: FieldRef<"Oportunidade", 'String'>
    readonly tipoOportunidade: FieldRef<"Oportunidade", 'TipoOportunidade'>
    readonly descricao: FieldRef<"Oportunidade", 'String'>
    readonly valorEstimado: FieldRef<"Oportunidade", 'Decimal'>
    readonly probabilidadeConversao: FieldRef<"Oportunidade", 'Decimal'>
    readonly prioridade: FieldRef<"Oportunidade", 'PrioridadeOportunidade'>
    readonly statusOportunidade: FieldRef<"Oportunidade", 'StatusOportunidade'>
    readonly dataCriacao: FieldRef<"Oportunidade", 'DateTime'>
    readonly dataFechamento: FieldRef<"Oportunidade", 'DateTime'>
    readonly responsavelId: FieldRef<"Oportunidade", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Oportunidade findUnique
   */
  export type OportunidadeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter, which Oportunidade to fetch.
     */
    where: OportunidadeWhereUniqueInput
  }

  /**
   * Oportunidade findUniqueOrThrow
   */
  export type OportunidadeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter, which Oportunidade to fetch.
     */
    where: OportunidadeWhereUniqueInput
  }

  /**
   * Oportunidade findFirst
   */
  export type OportunidadeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter, which Oportunidade to fetch.
     */
    where?: OportunidadeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Oportunidades to fetch.
     */
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Oportunidades.
     */
    cursor?: OportunidadeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Oportunidades from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Oportunidades.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Oportunidades.
     */
    distinct?: OportunidadeScalarFieldEnum | OportunidadeScalarFieldEnum[]
  }

  /**
   * Oportunidade findFirstOrThrow
   */
  export type OportunidadeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter, which Oportunidade to fetch.
     */
    where?: OportunidadeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Oportunidades to fetch.
     */
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Oportunidades.
     */
    cursor?: OportunidadeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Oportunidades from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Oportunidades.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Oportunidades.
     */
    distinct?: OportunidadeScalarFieldEnum | OportunidadeScalarFieldEnum[]
  }

  /**
   * Oportunidade findMany
   */
  export type OportunidadeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter, which Oportunidades to fetch.
     */
    where?: OportunidadeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Oportunidades to fetch.
     */
    orderBy?: OportunidadeOrderByWithRelationInput | OportunidadeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Oportunidades.
     */
    cursor?: OportunidadeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Oportunidades from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Oportunidades.
     */
    skip?: number
    distinct?: OportunidadeScalarFieldEnum | OportunidadeScalarFieldEnum[]
  }

  /**
   * Oportunidade create
   */
  export type OportunidadeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * The data needed to create a Oportunidade.
     */
    data: XOR<OportunidadeCreateInput, OportunidadeUncheckedCreateInput>
  }

  /**
   * Oportunidade createMany
   */
  export type OportunidadeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Oportunidades.
     */
    data: OportunidadeCreateManyInput | OportunidadeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Oportunidade update
   */
  export type OportunidadeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * The data needed to update a Oportunidade.
     */
    data: XOR<OportunidadeUpdateInput, OportunidadeUncheckedUpdateInput>
    /**
     * Choose, which Oportunidade to update.
     */
    where: OportunidadeWhereUniqueInput
  }

  /**
   * Oportunidade updateMany
   */
  export type OportunidadeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Oportunidades.
     */
    data: XOR<OportunidadeUpdateManyMutationInput, OportunidadeUncheckedUpdateManyInput>
    /**
     * Filter which Oportunidades to update
     */
    where?: OportunidadeWhereInput
    /**
     * Limit how many Oportunidades to update.
     */
    limit?: number
  }

  /**
   * Oportunidade upsert
   */
  export type OportunidadeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * The filter to search for the Oportunidade to update in case it exists.
     */
    where: OportunidadeWhereUniqueInput
    /**
     * In case the Oportunidade found by the `where` argument doesn't exist, create a new Oportunidade with this data.
     */
    create: XOR<OportunidadeCreateInput, OportunidadeUncheckedCreateInput>
    /**
     * In case the Oportunidade was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OportunidadeUpdateInput, OportunidadeUncheckedUpdateInput>
  }

  /**
   * Oportunidade delete
   */
  export type OportunidadeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
    /**
     * Filter which Oportunidade to delete.
     */
    where: OportunidadeWhereUniqueInput
  }

  /**
   * Oportunidade deleteMany
   */
  export type OportunidadeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Oportunidades to delete
     */
    where?: OportunidadeWhereInput
    /**
     * Limit how many Oportunidades to delete.
     */
    limit?: number
  }

  /**
   * Oportunidade.responsavel
   */
  export type Oportunidade$responsavelArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    where?: UsuarioWhereInput
  }

  /**
   * Oportunidade without action
   */
  export type OportunidadeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Oportunidade
     */
    select?: OportunidadeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Oportunidade
     */
    omit?: OportunidadeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OportunidadeInclude<ExtArgs> | null
  }


  /**
   * Model Mensagem
   */

  export type AggregateMensagem = {
    _count: MensagemCountAggregateOutputType | null
    _min: MensagemMinAggregateOutputType | null
    _max: MensagemMaxAggregateOutputType | null
  }

  export type MensagemMinAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoMensagem: $Enums.TipoMensagem | null
    conteudoSugerido: string | null
    conteudoFinal: string | null
    statusEnvio: $Enums.StatusEnvioMensagem | null
    sensivel: boolean | null
    dataCriacao: Date | null
    dataAprovacao: Date | null
    dataEnvio: Date | null
    aprovadorId: string | null
    canalEnvio: string | null
    agendadoPara: Date | null
    justificativaRejeicao: string | null
  }

  export type MensagemMaxAggregateOutputType = {
    id: string | null
    clienteId: string | null
    tipoMensagem: $Enums.TipoMensagem | null
    conteudoSugerido: string | null
    conteudoFinal: string | null
    statusEnvio: $Enums.StatusEnvioMensagem | null
    sensivel: boolean | null
    dataCriacao: Date | null
    dataAprovacao: Date | null
    dataEnvio: Date | null
    aprovadorId: string | null
    canalEnvio: string | null
    agendadoPara: Date | null
    justificativaRejeicao: string | null
  }

  export type MensagemCountAggregateOutputType = {
    id: number
    clienteId: number
    tipoMensagem: number
    conteudoSugerido: number
    conteudoFinal: number
    statusEnvio: number
    sensivel: number
    dataCriacao: number
    dataAprovacao: number
    dataEnvio: number
    aprovadorId: number
    canalEnvio: number
    agendadoPara: number
    justificativaRejeicao: number
    _all: number
  }


  export type MensagemMinAggregateInputType = {
    id?: true
    clienteId?: true
    tipoMensagem?: true
    conteudoSugerido?: true
    conteudoFinal?: true
    statusEnvio?: true
    sensivel?: true
    dataCriacao?: true
    dataAprovacao?: true
    dataEnvio?: true
    aprovadorId?: true
    canalEnvio?: true
    agendadoPara?: true
    justificativaRejeicao?: true
  }

  export type MensagemMaxAggregateInputType = {
    id?: true
    clienteId?: true
    tipoMensagem?: true
    conteudoSugerido?: true
    conteudoFinal?: true
    statusEnvio?: true
    sensivel?: true
    dataCriacao?: true
    dataAprovacao?: true
    dataEnvio?: true
    aprovadorId?: true
    canalEnvio?: true
    agendadoPara?: true
    justificativaRejeicao?: true
  }

  export type MensagemCountAggregateInputType = {
    id?: true
    clienteId?: true
    tipoMensagem?: true
    conteudoSugerido?: true
    conteudoFinal?: true
    statusEnvio?: true
    sensivel?: true
    dataCriacao?: true
    dataAprovacao?: true
    dataEnvio?: true
    aprovadorId?: true
    canalEnvio?: true
    agendadoPara?: true
    justificativaRejeicao?: true
    _all?: true
  }

  export type MensagemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Mensagem to aggregate.
     */
    where?: MensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Mensagems to fetch.
     */
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Mensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Mensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Mensagems
    **/
    _count?: true | MensagemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MensagemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MensagemMaxAggregateInputType
  }

  export type GetMensagemAggregateType<T extends MensagemAggregateArgs> = {
        [P in keyof T & keyof AggregateMensagem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMensagem[P]>
      : GetScalarType<T[P], AggregateMensagem[P]>
  }




  export type MensagemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MensagemWhereInput
    orderBy?: MensagemOrderByWithAggregationInput | MensagemOrderByWithAggregationInput[]
    by: MensagemScalarFieldEnum[] | MensagemScalarFieldEnum
    having?: MensagemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MensagemCountAggregateInputType | true
    _min?: MensagemMinAggregateInputType
    _max?: MensagemMaxAggregateInputType
  }

  export type MensagemGroupByOutputType = {
    id: string
    clienteId: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel: boolean
    dataCriacao: Date
    dataAprovacao: Date | null
    dataEnvio: Date | null
    aprovadorId: string | null
    canalEnvio: string
    agendadoPara: Date | null
    justificativaRejeicao: string | null
    _count: MensagemCountAggregateOutputType | null
    _min: MensagemMinAggregateOutputType | null
    _max: MensagemMaxAggregateOutputType | null
  }

  type GetMensagemGroupByPayload<T extends MensagemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MensagemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MensagemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MensagemGroupByOutputType[P]>
            : GetScalarType<T[P], MensagemGroupByOutputType[P]>
        }
      >
    >


  export type MensagemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clienteId?: boolean
    tipoMensagem?: boolean
    conteudoSugerido?: boolean
    conteudoFinal?: boolean
    statusEnvio?: boolean
    sensivel?: boolean
    dataCriacao?: boolean
    dataAprovacao?: boolean
    dataEnvio?: boolean
    aprovadorId?: boolean
    canalEnvio?: boolean
    agendadoPara?: boolean
    justificativaRejeicao?: boolean
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    aprovador?: boolean | Mensagem$aprovadorArgs<ExtArgs>
  }, ExtArgs["result"]["mensagem"]>



  export type MensagemSelectScalar = {
    id?: boolean
    clienteId?: boolean
    tipoMensagem?: boolean
    conteudoSugerido?: boolean
    conteudoFinal?: boolean
    statusEnvio?: boolean
    sensivel?: boolean
    dataCriacao?: boolean
    dataAprovacao?: boolean
    dataEnvio?: boolean
    aprovadorId?: boolean
    canalEnvio?: boolean
    agendadoPara?: boolean
    justificativaRejeicao?: boolean
  }

  export type MensagemOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clienteId" | "tipoMensagem" | "conteudoSugerido" | "conteudoFinal" | "statusEnvio" | "sensivel" | "dataCriacao" | "dataAprovacao" | "dataEnvio" | "aprovadorId" | "canalEnvio" | "agendadoPara" | "justificativaRejeicao", ExtArgs["result"]["mensagem"]>
  export type MensagemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | ClienteDefaultArgs<ExtArgs>
    aprovador?: boolean | Mensagem$aprovadorArgs<ExtArgs>
  }

  export type $MensagemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Mensagem"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs>
      aprovador: Prisma.$UsuarioPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clienteId: string
      tipoMensagem: $Enums.TipoMensagem
      conteudoSugerido: string
      conteudoFinal: string | null
      statusEnvio: $Enums.StatusEnvioMensagem
      sensivel: boolean
      dataCriacao: Date
      dataAprovacao: Date | null
      dataEnvio: Date | null
      aprovadorId: string | null
      canalEnvio: string
      agendadoPara: Date | null
      justificativaRejeicao: string | null
    }, ExtArgs["result"]["mensagem"]>
    composites: {}
  }

  type MensagemGetPayload<S extends boolean | null | undefined | MensagemDefaultArgs> = $Result.GetResult<Prisma.$MensagemPayload, S>

  type MensagemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MensagemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MensagemCountAggregateInputType | true
    }

  export interface MensagemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Mensagem'], meta: { name: 'Mensagem' } }
    /**
     * Find zero or one Mensagem that matches the filter.
     * @param {MensagemFindUniqueArgs} args - Arguments to find a Mensagem
     * @example
     * // Get one Mensagem
     * const mensagem = await prisma.mensagem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MensagemFindUniqueArgs>(args: SelectSubset<T, MensagemFindUniqueArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Mensagem that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MensagemFindUniqueOrThrowArgs} args - Arguments to find a Mensagem
     * @example
     * // Get one Mensagem
     * const mensagem = await prisma.mensagem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MensagemFindUniqueOrThrowArgs>(args: SelectSubset<T, MensagemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mensagem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemFindFirstArgs} args - Arguments to find a Mensagem
     * @example
     * // Get one Mensagem
     * const mensagem = await prisma.mensagem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MensagemFindFirstArgs>(args?: SelectSubset<T, MensagemFindFirstArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Mensagem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemFindFirstOrThrowArgs} args - Arguments to find a Mensagem
     * @example
     * // Get one Mensagem
     * const mensagem = await prisma.mensagem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MensagemFindFirstOrThrowArgs>(args?: SelectSubset<T, MensagemFindFirstOrThrowArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Mensagems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Mensagems
     * const mensagems = await prisma.mensagem.findMany()
     * 
     * // Get first 10 Mensagems
     * const mensagems = await prisma.mensagem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const mensagemWithIdOnly = await prisma.mensagem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MensagemFindManyArgs>(args?: SelectSubset<T, MensagemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Mensagem.
     * @param {MensagemCreateArgs} args - Arguments to create a Mensagem.
     * @example
     * // Create one Mensagem
     * const Mensagem = await prisma.mensagem.create({
     *   data: {
     *     // ... data to create a Mensagem
     *   }
     * })
     * 
     */
    create<T extends MensagemCreateArgs>(args: SelectSubset<T, MensagemCreateArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Mensagems.
     * @param {MensagemCreateManyArgs} args - Arguments to create many Mensagems.
     * @example
     * // Create many Mensagems
     * const mensagem = await prisma.mensagem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MensagemCreateManyArgs>(args?: SelectSubset<T, MensagemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Mensagem.
     * @param {MensagemDeleteArgs} args - Arguments to delete one Mensagem.
     * @example
     * // Delete one Mensagem
     * const Mensagem = await prisma.mensagem.delete({
     *   where: {
     *     // ... filter to delete one Mensagem
     *   }
     * })
     * 
     */
    delete<T extends MensagemDeleteArgs>(args: SelectSubset<T, MensagemDeleteArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Mensagem.
     * @param {MensagemUpdateArgs} args - Arguments to update one Mensagem.
     * @example
     * // Update one Mensagem
     * const mensagem = await prisma.mensagem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MensagemUpdateArgs>(args: SelectSubset<T, MensagemUpdateArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Mensagems.
     * @param {MensagemDeleteManyArgs} args - Arguments to filter Mensagems to delete.
     * @example
     * // Delete a few Mensagems
     * const { count } = await prisma.mensagem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MensagemDeleteManyArgs>(args?: SelectSubset<T, MensagemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Mensagems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Mensagems
     * const mensagem = await prisma.mensagem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MensagemUpdateManyArgs>(args: SelectSubset<T, MensagemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Mensagem.
     * @param {MensagemUpsertArgs} args - Arguments to update or create a Mensagem.
     * @example
     * // Update or create a Mensagem
     * const mensagem = await prisma.mensagem.upsert({
     *   create: {
     *     // ... data to create a Mensagem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Mensagem we want to update
     *   }
     * })
     */
    upsert<T extends MensagemUpsertArgs>(args: SelectSubset<T, MensagemUpsertArgs<ExtArgs>>): Prisma__MensagemClient<$Result.GetResult<Prisma.$MensagemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Mensagems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemCountArgs} args - Arguments to filter Mensagems to count.
     * @example
     * // Count the number of Mensagems
     * const count = await prisma.mensagem.count({
     *   where: {
     *     // ... the filter for the Mensagems we want to count
     *   }
     * })
    **/
    count<T extends MensagemCountArgs>(
      args?: Subset<T, MensagemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MensagemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Mensagem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MensagemAggregateArgs>(args: Subset<T, MensagemAggregateArgs>): Prisma.PrismaPromise<GetMensagemAggregateType<T>>

    /**
     * Group by Mensagem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MensagemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MensagemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MensagemGroupByArgs['orderBy'] }
        : { orderBy?: MensagemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MensagemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMensagemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Mensagem model
   */
  readonly fields: MensagemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Mensagem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MensagemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends ClienteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ClienteDefaultArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    aprovador<T extends Mensagem$aprovadorArgs<ExtArgs> = {}>(args?: Subset<T, Mensagem$aprovadorArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Mensagem model
   */
  interface MensagemFieldRefs {
    readonly id: FieldRef<"Mensagem", 'String'>
    readonly clienteId: FieldRef<"Mensagem", 'String'>
    readonly tipoMensagem: FieldRef<"Mensagem", 'TipoMensagem'>
    readonly conteudoSugerido: FieldRef<"Mensagem", 'String'>
    readonly conteudoFinal: FieldRef<"Mensagem", 'String'>
    readonly statusEnvio: FieldRef<"Mensagem", 'StatusEnvioMensagem'>
    readonly sensivel: FieldRef<"Mensagem", 'Boolean'>
    readonly dataCriacao: FieldRef<"Mensagem", 'DateTime'>
    readonly dataAprovacao: FieldRef<"Mensagem", 'DateTime'>
    readonly dataEnvio: FieldRef<"Mensagem", 'DateTime'>
    readonly aprovadorId: FieldRef<"Mensagem", 'String'>
    readonly canalEnvio: FieldRef<"Mensagem", 'String'>
    readonly agendadoPara: FieldRef<"Mensagem", 'DateTime'>
    readonly justificativaRejeicao: FieldRef<"Mensagem", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Mensagem findUnique
   */
  export type MensagemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter, which Mensagem to fetch.
     */
    where: MensagemWhereUniqueInput
  }

  /**
   * Mensagem findUniqueOrThrow
   */
  export type MensagemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter, which Mensagem to fetch.
     */
    where: MensagemWhereUniqueInput
  }

  /**
   * Mensagem findFirst
   */
  export type MensagemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter, which Mensagem to fetch.
     */
    where?: MensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Mensagems to fetch.
     */
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Mensagems.
     */
    cursor?: MensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Mensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Mensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Mensagems.
     */
    distinct?: MensagemScalarFieldEnum | MensagemScalarFieldEnum[]
  }

  /**
   * Mensagem findFirstOrThrow
   */
  export type MensagemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter, which Mensagem to fetch.
     */
    where?: MensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Mensagems to fetch.
     */
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Mensagems.
     */
    cursor?: MensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Mensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Mensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Mensagems.
     */
    distinct?: MensagemScalarFieldEnum | MensagemScalarFieldEnum[]
  }

  /**
   * Mensagem findMany
   */
  export type MensagemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter, which Mensagems to fetch.
     */
    where?: MensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Mensagems to fetch.
     */
    orderBy?: MensagemOrderByWithRelationInput | MensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Mensagems.
     */
    cursor?: MensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Mensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Mensagems.
     */
    skip?: number
    distinct?: MensagemScalarFieldEnum | MensagemScalarFieldEnum[]
  }

  /**
   * Mensagem create
   */
  export type MensagemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * The data needed to create a Mensagem.
     */
    data: XOR<MensagemCreateInput, MensagemUncheckedCreateInput>
  }

  /**
   * Mensagem createMany
   */
  export type MensagemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Mensagems.
     */
    data: MensagemCreateManyInput | MensagemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Mensagem update
   */
  export type MensagemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * The data needed to update a Mensagem.
     */
    data: XOR<MensagemUpdateInput, MensagemUncheckedUpdateInput>
    /**
     * Choose, which Mensagem to update.
     */
    where: MensagemWhereUniqueInput
  }

  /**
   * Mensagem updateMany
   */
  export type MensagemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Mensagems.
     */
    data: XOR<MensagemUpdateManyMutationInput, MensagemUncheckedUpdateManyInput>
    /**
     * Filter which Mensagems to update
     */
    where?: MensagemWhereInput
    /**
     * Limit how many Mensagems to update.
     */
    limit?: number
  }

  /**
   * Mensagem upsert
   */
  export type MensagemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * The filter to search for the Mensagem to update in case it exists.
     */
    where: MensagemWhereUniqueInput
    /**
     * In case the Mensagem found by the `where` argument doesn't exist, create a new Mensagem with this data.
     */
    create: XOR<MensagemCreateInput, MensagemUncheckedCreateInput>
    /**
     * In case the Mensagem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MensagemUpdateInput, MensagemUncheckedUpdateInput>
  }

  /**
   * Mensagem delete
   */
  export type MensagemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
    /**
     * Filter which Mensagem to delete.
     */
    where: MensagemWhereUniqueInput
  }

  /**
   * Mensagem deleteMany
   */
  export type MensagemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Mensagems to delete
     */
    where?: MensagemWhereInput
    /**
     * Limit how many Mensagems to delete.
     */
    limit?: number
  }

  /**
   * Mensagem.aprovador
   */
  export type Mensagem$aprovadorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    where?: UsuarioWhereInput
  }

  /**
   * Mensagem without action
   */
  export type MensagemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Mensagem
     */
    select?: MensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Mensagem
     */
    omit?: MensagemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MensagemInclude<ExtArgs> | null
  }


  /**
   * Model ExecucaoApi
   */

  export type AggregateExecucaoApi = {
    _count: ExecucaoApiCountAggregateOutputType | null
    _avg: ExecucaoApiAvgAggregateOutputType | null
    _sum: ExecucaoApiSumAggregateOutputType | null
    _min: ExecucaoApiMinAggregateOutputType | null
    _max: ExecucaoApiMaxAggregateOutputType | null
  }

  export type ExecucaoApiAvgAggregateOutputType = {
    duracaoMs: number | null
  }

  export type ExecucaoApiSumAggregateOutputType = {
    duracaoMs: number | null
  }

  export type ExecucaoApiMinAggregateOutputType = {
    id: string | null
    acaoApi: $Enums.AcaoApi | null
    dataExecucao: Date | null
    statusExecucao: $Enums.StatusExecucaoApi | null
    clienteId: string | null
    mensagemErro: string | null
    duracaoMs: number | null
  }

  export type ExecucaoApiMaxAggregateOutputType = {
    id: string | null
    acaoApi: $Enums.AcaoApi | null
    dataExecucao: Date | null
    statusExecucao: $Enums.StatusExecucaoApi | null
    clienteId: string | null
    mensagemErro: string | null
    duracaoMs: number | null
  }

  export type ExecucaoApiCountAggregateOutputType = {
    id: number
    acaoApi: number
    dataExecucao: number
    statusExecucao: number
    clienteId: number
    detalhesExecucao: number
    mensagemErro: number
    duracaoMs: number
    _all: number
  }


  export type ExecucaoApiAvgAggregateInputType = {
    duracaoMs?: true
  }

  export type ExecucaoApiSumAggregateInputType = {
    duracaoMs?: true
  }

  export type ExecucaoApiMinAggregateInputType = {
    id?: true
    acaoApi?: true
    dataExecucao?: true
    statusExecucao?: true
    clienteId?: true
    mensagemErro?: true
    duracaoMs?: true
  }

  export type ExecucaoApiMaxAggregateInputType = {
    id?: true
    acaoApi?: true
    dataExecucao?: true
    statusExecucao?: true
    clienteId?: true
    mensagemErro?: true
    duracaoMs?: true
  }

  export type ExecucaoApiCountAggregateInputType = {
    id?: true
    acaoApi?: true
    dataExecucao?: true
    statusExecucao?: true
    clienteId?: true
    detalhesExecucao?: true
    mensagemErro?: true
    duracaoMs?: true
    _all?: true
  }

  export type ExecucaoApiAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExecucaoApi to aggregate.
     */
    where?: ExecucaoApiWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecucaoApis to fetch.
     */
    orderBy?: ExecucaoApiOrderByWithRelationInput | ExecucaoApiOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExecucaoApiWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecucaoApis from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecucaoApis.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExecucaoApis
    **/
    _count?: true | ExecucaoApiCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ExecucaoApiAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ExecucaoApiSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExecucaoApiMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExecucaoApiMaxAggregateInputType
  }

  export type GetExecucaoApiAggregateType<T extends ExecucaoApiAggregateArgs> = {
        [P in keyof T & keyof AggregateExecucaoApi]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExecucaoApi[P]>
      : GetScalarType<T[P], AggregateExecucaoApi[P]>
  }




  export type ExecucaoApiGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExecucaoApiWhereInput
    orderBy?: ExecucaoApiOrderByWithAggregationInput | ExecucaoApiOrderByWithAggregationInput[]
    by: ExecucaoApiScalarFieldEnum[] | ExecucaoApiScalarFieldEnum
    having?: ExecucaoApiScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExecucaoApiCountAggregateInputType | true
    _avg?: ExecucaoApiAvgAggregateInputType
    _sum?: ExecucaoApiSumAggregateInputType
    _min?: ExecucaoApiMinAggregateInputType
    _max?: ExecucaoApiMaxAggregateInputType
  }

  export type ExecucaoApiGroupByOutputType = {
    id: string
    acaoApi: $Enums.AcaoApi
    dataExecucao: Date
    statusExecucao: $Enums.StatusExecucaoApi
    clienteId: string | null
    detalhesExecucao: JsonValue
    mensagemErro: string | null
    duracaoMs: number | null
    _count: ExecucaoApiCountAggregateOutputType | null
    _avg: ExecucaoApiAvgAggregateOutputType | null
    _sum: ExecucaoApiSumAggregateOutputType | null
    _min: ExecucaoApiMinAggregateOutputType | null
    _max: ExecucaoApiMaxAggregateOutputType | null
  }

  type GetExecucaoApiGroupByPayload<T extends ExecucaoApiGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExecucaoApiGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExecucaoApiGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExecucaoApiGroupByOutputType[P]>
            : GetScalarType<T[P], ExecucaoApiGroupByOutputType[P]>
        }
      >
    >


  export type ExecucaoApiSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    acaoApi?: boolean
    dataExecucao?: boolean
    statusExecucao?: boolean
    clienteId?: boolean
    detalhesExecucao?: boolean
    mensagemErro?: boolean
    duracaoMs?: boolean
    cliente?: boolean | ExecucaoApi$clienteArgs<ExtArgs>
  }, ExtArgs["result"]["execucaoApi"]>



  export type ExecucaoApiSelectScalar = {
    id?: boolean
    acaoApi?: boolean
    dataExecucao?: boolean
    statusExecucao?: boolean
    clienteId?: boolean
    detalhesExecucao?: boolean
    mensagemErro?: boolean
    duracaoMs?: boolean
  }

  export type ExecucaoApiOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "acaoApi" | "dataExecucao" | "statusExecucao" | "clienteId" | "detalhesExecucao" | "mensagemErro" | "duracaoMs", ExtArgs["result"]["execucaoApi"]>
  export type ExecucaoApiInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | ExecucaoApi$clienteArgs<ExtArgs>
  }

  export type $ExecucaoApiPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExecucaoApi"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      acaoApi: $Enums.AcaoApi
      dataExecucao: Date
      statusExecucao: $Enums.StatusExecucaoApi
      clienteId: string | null
      detalhesExecucao: Prisma.JsonValue
      mensagemErro: string | null
      duracaoMs: number | null
    }, ExtArgs["result"]["execucaoApi"]>
    composites: {}
  }

  type ExecucaoApiGetPayload<S extends boolean | null | undefined | ExecucaoApiDefaultArgs> = $Result.GetResult<Prisma.$ExecucaoApiPayload, S>

  type ExecucaoApiCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ExecucaoApiFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ExecucaoApiCountAggregateInputType | true
    }

  export interface ExecucaoApiDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExecucaoApi'], meta: { name: 'ExecucaoApi' } }
    /**
     * Find zero or one ExecucaoApi that matches the filter.
     * @param {ExecucaoApiFindUniqueArgs} args - Arguments to find a ExecucaoApi
     * @example
     * // Get one ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExecucaoApiFindUniqueArgs>(args: SelectSubset<T, ExecucaoApiFindUniqueArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ExecucaoApi that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ExecucaoApiFindUniqueOrThrowArgs} args - Arguments to find a ExecucaoApi
     * @example
     * // Get one ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExecucaoApiFindUniqueOrThrowArgs>(args: SelectSubset<T, ExecucaoApiFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExecucaoApi that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiFindFirstArgs} args - Arguments to find a ExecucaoApi
     * @example
     * // Get one ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExecucaoApiFindFirstArgs>(args?: SelectSubset<T, ExecucaoApiFindFirstArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExecucaoApi that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiFindFirstOrThrowArgs} args - Arguments to find a ExecucaoApi
     * @example
     * // Get one ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExecucaoApiFindFirstOrThrowArgs>(args?: SelectSubset<T, ExecucaoApiFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ExecucaoApis that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExecucaoApis
     * const execucaoApis = await prisma.execucaoApi.findMany()
     * 
     * // Get first 10 ExecucaoApis
     * const execucaoApis = await prisma.execucaoApi.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const execucaoApiWithIdOnly = await prisma.execucaoApi.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExecucaoApiFindManyArgs>(args?: SelectSubset<T, ExecucaoApiFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ExecucaoApi.
     * @param {ExecucaoApiCreateArgs} args - Arguments to create a ExecucaoApi.
     * @example
     * // Create one ExecucaoApi
     * const ExecucaoApi = await prisma.execucaoApi.create({
     *   data: {
     *     // ... data to create a ExecucaoApi
     *   }
     * })
     * 
     */
    create<T extends ExecucaoApiCreateArgs>(args: SelectSubset<T, ExecucaoApiCreateArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ExecucaoApis.
     * @param {ExecucaoApiCreateManyArgs} args - Arguments to create many ExecucaoApis.
     * @example
     * // Create many ExecucaoApis
     * const execucaoApi = await prisma.execucaoApi.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExecucaoApiCreateManyArgs>(args?: SelectSubset<T, ExecucaoApiCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ExecucaoApi.
     * @param {ExecucaoApiDeleteArgs} args - Arguments to delete one ExecucaoApi.
     * @example
     * // Delete one ExecucaoApi
     * const ExecucaoApi = await prisma.execucaoApi.delete({
     *   where: {
     *     // ... filter to delete one ExecucaoApi
     *   }
     * })
     * 
     */
    delete<T extends ExecucaoApiDeleteArgs>(args: SelectSubset<T, ExecucaoApiDeleteArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ExecucaoApi.
     * @param {ExecucaoApiUpdateArgs} args - Arguments to update one ExecucaoApi.
     * @example
     * // Update one ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExecucaoApiUpdateArgs>(args: SelectSubset<T, ExecucaoApiUpdateArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ExecucaoApis.
     * @param {ExecucaoApiDeleteManyArgs} args - Arguments to filter ExecucaoApis to delete.
     * @example
     * // Delete a few ExecucaoApis
     * const { count } = await prisma.execucaoApi.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExecucaoApiDeleteManyArgs>(args?: SelectSubset<T, ExecucaoApiDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExecucaoApis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExecucaoApis
     * const execucaoApi = await prisma.execucaoApi.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExecucaoApiUpdateManyArgs>(args: SelectSubset<T, ExecucaoApiUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ExecucaoApi.
     * @param {ExecucaoApiUpsertArgs} args - Arguments to update or create a ExecucaoApi.
     * @example
     * // Update or create a ExecucaoApi
     * const execucaoApi = await prisma.execucaoApi.upsert({
     *   create: {
     *     // ... data to create a ExecucaoApi
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExecucaoApi we want to update
     *   }
     * })
     */
    upsert<T extends ExecucaoApiUpsertArgs>(args: SelectSubset<T, ExecucaoApiUpsertArgs<ExtArgs>>): Prisma__ExecucaoApiClient<$Result.GetResult<Prisma.$ExecucaoApiPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ExecucaoApis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiCountArgs} args - Arguments to filter ExecucaoApis to count.
     * @example
     * // Count the number of ExecucaoApis
     * const count = await prisma.execucaoApi.count({
     *   where: {
     *     // ... the filter for the ExecucaoApis we want to count
     *   }
     * })
    **/
    count<T extends ExecucaoApiCountArgs>(
      args?: Subset<T, ExecucaoApiCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExecucaoApiCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExecucaoApi.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExecucaoApiAggregateArgs>(args: Subset<T, ExecucaoApiAggregateArgs>): Prisma.PrismaPromise<GetExecucaoApiAggregateType<T>>

    /**
     * Group by ExecucaoApi.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecucaoApiGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExecucaoApiGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExecucaoApiGroupByArgs['orderBy'] }
        : { orderBy?: ExecucaoApiGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExecucaoApiGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExecucaoApiGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExecucaoApi model
   */
  readonly fields: ExecucaoApiFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExecucaoApi.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExecucaoApiClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends ExecucaoApi$clienteArgs<ExtArgs> = {}>(args?: Subset<T, ExecucaoApi$clienteArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ExecucaoApi model
   */
  interface ExecucaoApiFieldRefs {
    readonly id: FieldRef<"ExecucaoApi", 'String'>
    readonly acaoApi: FieldRef<"ExecucaoApi", 'AcaoApi'>
    readonly dataExecucao: FieldRef<"ExecucaoApi", 'DateTime'>
    readonly statusExecucao: FieldRef<"ExecucaoApi", 'StatusExecucaoApi'>
    readonly clienteId: FieldRef<"ExecucaoApi", 'String'>
    readonly detalhesExecucao: FieldRef<"ExecucaoApi", 'Json'>
    readonly mensagemErro: FieldRef<"ExecucaoApi", 'String'>
    readonly duracaoMs: FieldRef<"ExecucaoApi", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * ExecucaoApi findUnique
   */
  export type ExecucaoApiFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter, which ExecucaoApi to fetch.
     */
    where: ExecucaoApiWhereUniqueInput
  }

  /**
   * ExecucaoApi findUniqueOrThrow
   */
  export type ExecucaoApiFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter, which ExecucaoApi to fetch.
     */
    where: ExecucaoApiWhereUniqueInput
  }

  /**
   * ExecucaoApi findFirst
   */
  export type ExecucaoApiFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter, which ExecucaoApi to fetch.
     */
    where?: ExecucaoApiWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecucaoApis to fetch.
     */
    orderBy?: ExecucaoApiOrderByWithRelationInput | ExecucaoApiOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExecucaoApis.
     */
    cursor?: ExecucaoApiWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecucaoApis from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecucaoApis.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExecucaoApis.
     */
    distinct?: ExecucaoApiScalarFieldEnum | ExecucaoApiScalarFieldEnum[]
  }

  /**
   * ExecucaoApi findFirstOrThrow
   */
  export type ExecucaoApiFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter, which ExecucaoApi to fetch.
     */
    where?: ExecucaoApiWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecucaoApis to fetch.
     */
    orderBy?: ExecucaoApiOrderByWithRelationInput | ExecucaoApiOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExecucaoApis.
     */
    cursor?: ExecucaoApiWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecucaoApis from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecucaoApis.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExecucaoApis.
     */
    distinct?: ExecucaoApiScalarFieldEnum | ExecucaoApiScalarFieldEnum[]
  }

  /**
   * ExecucaoApi findMany
   */
  export type ExecucaoApiFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter, which ExecucaoApis to fetch.
     */
    where?: ExecucaoApiWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecucaoApis to fetch.
     */
    orderBy?: ExecucaoApiOrderByWithRelationInput | ExecucaoApiOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExecucaoApis.
     */
    cursor?: ExecucaoApiWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecucaoApis from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecucaoApis.
     */
    skip?: number
    distinct?: ExecucaoApiScalarFieldEnum | ExecucaoApiScalarFieldEnum[]
  }

  /**
   * ExecucaoApi create
   */
  export type ExecucaoApiCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * The data needed to create a ExecucaoApi.
     */
    data: XOR<ExecucaoApiCreateInput, ExecucaoApiUncheckedCreateInput>
  }

  /**
   * ExecucaoApi createMany
   */
  export type ExecucaoApiCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExecucaoApis.
     */
    data: ExecucaoApiCreateManyInput | ExecucaoApiCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExecucaoApi update
   */
  export type ExecucaoApiUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * The data needed to update a ExecucaoApi.
     */
    data: XOR<ExecucaoApiUpdateInput, ExecucaoApiUncheckedUpdateInput>
    /**
     * Choose, which ExecucaoApi to update.
     */
    where: ExecucaoApiWhereUniqueInput
  }

  /**
   * ExecucaoApi updateMany
   */
  export type ExecucaoApiUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExecucaoApis.
     */
    data: XOR<ExecucaoApiUpdateManyMutationInput, ExecucaoApiUncheckedUpdateManyInput>
    /**
     * Filter which ExecucaoApis to update
     */
    where?: ExecucaoApiWhereInput
    /**
     * Limit how many ExecucaoApis to update.
     */
    limit?: number
  }

  /**
   * ExecucaoApi upsert
   */
  export type ExecucaoApiUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * The filter to search for the ExecucaoApi to update in case it exists.
     */
    where: ExecucaoApiWhereUniqueInput
    /**
     * In case the ExecucaoApi found by the `where` argument doesn't exist, create a new ExecucaoApi with this data.
     */
    create: XOR<ExecucaoApiCreateInput, ExecucaoApiUncheckedCreateInput>
    /**
     * In case the ExecucaoApi was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExecucaoApiUpdateInput, ExecucaoApiUncheckedUpdateInput>
  }

  /**
   * ExecucaoApi delete
   */
  export type ExecucaoApiDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
    /**
     * Filter which ExecucaoApi to delete.
     */
    where: ExecucaoApiWhereUniqueInput
  }

  /**
   * ExecucaoApi deleteMany
   */
  export type ExecucaoApiDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExecucaoApis to delete
     */
    where?: ExecucaoApiWhereInput
    /**
     * Limit how many ExecucaoApis to delete.
     */
    limit?: number
  }

  /**
   * ExecucaoApi.cliente
   */
  export type ExecucaoApi$clienteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    where?: ClienteWhereInput
  }

  /**
   * ExecucaoApi without action
   */
  export type ExecucaoApiDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecucaoApi
     */
    select?: ExecucaoApiSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExecucaoApi
     */
    omit?: ExecucaoApiOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecucaoApiInclude<ExtArgs> | null
  }


  /**
   * Model KpiSnapshot
   */

  export type AggregateKpiSnapshot = {
    _count: KpiSnapshotCountAggregateOutputType | null
    _avg: KpiSnapshotAvgAggregateOutputType | null
    _sum: KpiSnapshotSumAggregateOutputType | null
    _min: KpiSnapshotMinAggregateOutputType | null
    _max: KpiSnapshotMaxAggregateOutputType | null
  }

  export type KpiSnapshotAvgAggregateOutputType = {
    valor: Decimal | null
  }

  export type KpiSnapshotSumAggregateOutputType = {
    valor: Decimal | null
  }

  export type KpiSnapshotMinAggregateOutputType = {
    id: string | null
    nomeKpi: string | null
    valor: Decimal | null
    periodo: $Enums.PeriodoKpi | null
    dataReferencia: Date | null
  }

  export type KpiSnapshotMaxAggregateOutputType = {
    id: string | null
    nomeKpi: string | null
    valor: Decimal | null
    periodo: $Enums.PeriodoKpi | null
    dataReferencia: Date | null
  }

  export type KpiSnapshotCountAggregateOutputType = {
    id: number
    nomeKpi: number
    valor: number
    periodo: number
    dataReferencia: number
    payload: number
    _all: number
  }


  export type KpiSnapshotAvgAggregateInputType = {
    valor?: true
  }

  export type KpiSnapshotSumAggregateInputType = {
    valor?: true
  }

  export type KpiSnapshotMinAggregateInputType = {
    id?: true
    nomeKpi?: true
    valor?: true
    periodo?: true
    dataReferencia?: true
  }

  export type KpiSnapshotMaxAggregateInputType = {
    id?: true
    nomeKpi?: true
    valor?: true
    periodo?: true
    dataReferencia?: true
  }

  export type KpiSnapshotCountAggregateInputType = {
    id?: true
    nomeKpi?: true
    valor?: true
    periodo?: true
    dataReferencia?: true
    payload?: true
    _all?: true
  }

  export type KpiSnapshotAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KpiSnapshot to aggregate.
     */
    where?: KpiSnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiSnapshots to fetch.
     */
    orderBy?: KpiSnapshotOrderByWithRelationInput | KpiSnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: KpiSnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiSnapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiSnapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned KpiSnapshots
    **/
    _count?: true | KpiSnapshotCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: KpiSnapshotAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: KpiSnapshotSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: KpiSnapshotMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: KpiSnapshotMaxAggregateInputType
  }

  export type GetKpiSnapshotAggregateType<T extends KpiSnapshotAggregateArgs> = {
        [P in keyof T & keyof AggregateKpiSnapshot]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateKpiSnapshot[P]>
      : GetScalarType<T[P], AggregateKpiSnapshot[P]>
  }




  export type KpiSnapshotGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: KpiSnapshotWhereInput
    orderBy?: KpiSnapshotOrderByWithAggregationInput | KpiSnapshotOrderByWithAggregationInput[]
    by: KpiSnapshotScalarFieldEnum[] | KpiSnapshotScalarFieldEnum
    having?: KpiSnapshotScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: KpiSnapshotCountAggregateInputType | true
    _avg?: KpiSnapshotAvgAggregateInputType
    _sum?: KpiSnapshotSumAggregateInputType
    _min?: KpiSnapshotMinAggregateInputType
    _max?: KpiSnapshotMaxAggregateInputType
  }

  export type KpiSnapshotGroupByOutputType = {
    id: string
    nomeKpi: string
    valor: Decimal
    periodo: $Enums.PeriodoKpi
    dataReferencia: Date
    payload: JsonValue | null
    _count: KpiSnapshotCountAggregateOutputType | null
    _avg: KpiSnapshotAvgAggregateOutputType | null
    _sum: KpiSnapshotSumAggregateOutputType | null
    _min: KpiSnapshotMinAggregateOutputType | null
    _max: KpiSnapshotMaxAggregateOutputType | null
  }

  type GetKpiSnapshotGroupByPayload<T extends KpiSnapshotGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<KpiSnapshotGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof KpiSnapshotGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], KpiSnapshotGroupByOutputType[P]>
            : GetScalarType<T[P], KpiSnapshotGroupByOutputType[P]>
        }
      >
    >


  export type KpiSnapshotSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nomeKpi?: boolean
    valor?: boolean
    periodo?: boolean
    dataReferencia?: boolean
    payload?: boolean
  }, ExtArgs["result"]["kpiSnapshot"]>



  export type KpiSnapshotSelectScalar = {
    id?: boolean
    nomeKpi?: boolean
    valor?: boolean
    periodo?: boolean
    dataReferencia?: boolean
    payload?: boolean
  }

  export type KpiSnapshotOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nomeKpi" | "valor" | "periodo" | "dataReferencia" | "payload", ExtArgs["result"]["kpiSnapshot"]>

  export type $KpiSnapshotPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "KpiSnapshot"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nomeKpi: string
      valor: Prisma.Decimal
      periodo: $Enums.PeriodoKpi
      dataReferencia: Date
      payload: Prisma.JsonValue | null
    }, ExtArgs["result"]["kpiSnapshot"]>
    composites: {}
  }

  type KpiSnapshotGetPayload<S extends boolean | null | undefined | KpiSnapshotDefaultArgs> = $Result.GetResult<Prisma.$KpiSnapshotPayload, S>

  type KpiSnapshotCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<KpiSnapshotFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: KpiSnapshotCountAggregateInputType | true
    }

  export interface KpiSnapshotDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['KpiSnapshot'], meta: { name: 'KpiSnapshot' } }
    /**
     * Find zero or one KpiSnapshot that matches the filter.
     * @param {KpiSnapshotFindUniqueArgs} args - Arguments to find a KpiSnapshot
     * @example
     * // Get one KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends KpiSnapshotFindUniqueArgs>(args: SelectSubset<T, KpiSnapshotFindUniqueArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one KpiSnapshot that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {KpiSnapshotFindUniqueOrThrowArgs} args - Arguments to find a KpiSnapshot
     * @example
     * // Get one KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends KpiSnapshotFindUniqueOrThrowArgs>(args: SelectSubset<T, KpiSnapshotFindUniqueOrThrowArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first KpiSnapshot that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotFindFirstArgs} args - Arguments to find a KpiSnapshot
     * @example
     * // Get one KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends KpiSnapshotFindFirstArgs>(args?: SelectSubset<T, KpiSnapshotFindFirstArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first KpiSnapshot that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotFindFirstOrThrowArgs} args - Arguments to find a KpiSnapshot
     * @example
     * // Get one KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends KpiSnapshotFindFirstOrThrowArgs>(args?: SelectSubset<T, KpiSnapshotFindFirstOrThrowArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more KpiSnapshots that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all KpiSnapshots
     * const kpiSnapshots = await prisma.kpiSnapshot.findMany()
     * 
     * // Get first 10 KpiSnapshots
     * const kpiSnapshots = await prisma.kpiSnapshot.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const kpiSnapshotWithIdOnly = await prisma.kpiSnapshot.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends KpiSnapshotFindManyArgs>(args?: SelectSubset<T, KpiSnapshotFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a KpiSnapshot.
     * @param {KpiSnapshotCreateArgs} args - Arguments to create a KpiSnapshot.
     * @example
     * // Create one KpiSnapshot
     * const KpiSnapshot = await prisma.kpiSnapshot.create({
     *   data: {
     *     // ... data to create a KpiSnapshot
     *   }
     * })
     * 
     */
    create<T extends KpiSnapshotCreateArgs>(args: SelectSubset<T, KpiSnapshotCreateArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many KpiSnapshots.
     * @param {KpiSnapshotCreateManyArgs} args - Arguments to create many KpiSnapshots.
     * @example
     * // Create many KpiSnapshots
     * const kpiSnapshot = await prisma.kpiSnapshot.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends KpiSnapshotCreateManyArgs>(args?: SelectSubset<T, KpiSnapshotCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a KpiSnapshot.
     * @param {KpiSnapshotDeleteArgs} args - Arguments to delete one KpiSnapshot.
     * @example
     * // Delete one KpiSnapshot
     * const KpiSnapshot = await prisma.kpiSnapshot.delete({
     *   where: {
     *     // ... filter to delete one KpiSnapshot
     *   }
     * })
     * 
     */
    delete<T extends KpiSnapshotDeleteArgs>(args: SelectSubset<T, KpiSnapshotDeleteArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one KpiSnapshot.
     * @param {KpiSnapshotUpdateArgs} args - Arguments to update one KpiSnapshot.
     * @example
     * // Update one KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends KpiSnapshotUpdateArgs>(args: SelectSubset<T, KpiSnapshotUpdateArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more KpiSnapshots.
     * @param {KpiSnapshotDeleteManyArgs} args - Arguments to filter KpiSnapshots to delete.
     * @example
     * // Delete a few KpiSnapshots
     * const { count } = await prisma.kpiSnapshot.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends KpiSnapshotDeleteManyArgs>(args?: SelectSubset<T, KpiSnapshotDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more KpiSnapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many KpiSnapshots
     * const kpiSnapshot = await prisma.kpiSnapshot.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends KpiSnapshotUpdateManyArgs>(args: SelectSubset<T, KpiSnapshotUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one KpiSnapshot.
     * @param {KpiSnapshotUpsertArgs} args - Arguments to update or create a KpiSnapshot.
     * @example
     * // Update or create a KpiSnapshot
     * const kpiSnapshot = await prisma.kpiSnapshot.upsert({
     *   create: {
     *     // ... data to create a KpiSnapshot
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the KpiSnapshot we want to update
     *   }
     * })
     */
    upsert<T extends KpiSnapshotUpsertArgs>(args: SelectSubset<T, KpiSnapshotUpsertArgs<ExtArgs>>): Prisma__KpiSnapshotClient<$Result.GetResult<Prisma.$KpiSnapshotPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of KpiSnapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotCountArgs} args - Arguments to filter KpiSnapshots to count.
     * @example
     * // Count the number of KpiSnapshots
     * const count = await prisma.kpiSnapshot.count({
     *   where: {
     *     // ... the filter for the KpiSnapshots we want to count
     *   }
     * })
    **/
    count<T extends KpiSnapshotCountArgs>(
      args?: Subset<T, KpiSnapshotCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], KpiSnapshotCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a KpiSnapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends KpiSnapshotAggregateArgs>(args: Subset<T, KpiSnapshotAggregateArgs>): Prisma.PrismaPromise<GetKpiSnapshotAggregateType<T>>

    /**
     * Group by KpiSnapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiSnapshotGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends KpiSnapshotGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: KpiSnapshotGroupByArgs['orderBy'] }
        : { orderBy?: KpiSnapshotGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, KpiSnapshotGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetKpiSnapshotGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the KpiSnapshot model
   */
  readonly fields: KpiSnapshotFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for KpiSnapshot.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__KpiSnapshotClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the KpiSnapshot model
   */
  interface KpiSnapshotFieldRefs {
    readonly id: FieldRef<"KpiSnapshot", 'String'>
    readonly nomeKpi: FieldRef<"KpiSnapshot", 'String'>
    readonly valor: FieldRef<"KpiSnapshot", 'Decimal'>
    readonly periodo: FieldRef<"KpiSnapshot", 'PeriodoKpi'>
    readonly dataReferencia: FieldRef<"KpiSnapshot", 'DateTime'>
    readonly payload: FieldRef<"KpiSnapshot", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * KpiSnapshot findUnique
   */
  export type KpiSnapshotFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter, which KpiSnapshot to fetch.
     */
    where: KpiSnapshotWhereUniqueInput
  }

  /**
   * KpiSnapshot findUniqueOrThrow
   */
  export type KpiSnapshotFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter, which KpiSnapshot to fetch.
     */
    where: KpiSnapshotWhereUniqueInput
  }

  /**
   * KpiSnapshot findFirst
   */
  export type KpiSnapshotFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter, which KpiSnapshot to fetch.
     */
    where?: KpiSnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiSnapshots to fetch.
     */
    orderBy?: KpiSnapshotOrderByWithRelationInput | KpiSnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KpiSnapshots.
     */
    cursor?: KpiSnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiSnapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiSnapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KpiSnapshots.
     */
    distinct?: KpiSnapshotScalarFieldEnum | KpiSnapshotScalarFieldEnum[]
  }

  /**
   * KpiSnapshot findFirstOrThrow
   */
  export type KpiSnapshotFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter, which KpiSnapshot to fetch.
     */
    where?: KpiSnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiSnapshots to fetch.
     */
    orderBy?: KpiSnapshotOrderByWithRelationInput | KpiSnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KpiSnapshots.
     */
    cursor?: KpiSnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiSnapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiSnapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KpiSnapshots.
     */
    distinct?: KpiSnapshotScalarFieldEnum | KpiSnapshotScalarFieldEnum[]
  }

  /**
   * KpiSnapshot findMany
   */
  export type KpiSnapshotFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter, which KpiSnapshots to fetch.
     */
    where?: KpiSnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiSnapshots to fetch.
     */
    orderBy?: KpiSnapshotOrderByWithRelationInput | KpiSnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing KpiSnapshots.
     */
    cursor?: KpiSnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiSnapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiSnapshots.
     */
    skip?: number
    distinct?: KpiSnapshotScalarFieldEnum | KpiSnapshotScalarFieldEnum[]
  }

  /**
   * KpiSnapshot create
   */
  export type KpiSnapshotCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * The data needed to create a KpiSnapshot.
     */
    data: XOR<KpiSnapshotCreateInput, KpiSnapshotUncheckedCreateInput>
  }

  /**
   * KpiSnapshot createMany
   */
  export type KpiSnapshotCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many KpiSnapshots.
     */
    data: KpiSnapshotCreateManyInput | KpiSnapshotCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * KpiSnapshot update
   */
  export type KpiSnapshotUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * The data needed to update a KpiSnapshot.
     */
    data: XOR<KpiSnapshotUpdateInput, KpiSnapshotUncheckedUpdateInput>
    /**
     * Choose, which KpiSnapshot to update.
     */
    where: KpiSnapshotWhereUniqueInput
  }

  /**
   * KpiSnapshot updateMany
   */
  export type KpiSnapshotUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update KpiSnapshots.
     */
    data: XOR<KpiSnapshotUpdateManyMutationInput, KpiSnapshotUncheckedUpdateManyInput>
    /**
     * Filter which KpiSnapshots to update
     */
    where?: KpiSnapshotWhereInput
    /**
     * Limit how many KpiSnapshots to update.
     */
    limit?: number
  }

  /**
   * KpiSnapshot upsert
   */
  export type KpiSnapshotUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * The filter to search for the KpiSnapshot to update in case it exists.
     */
    where: KpiSnapshotWhereUniqueInput
    /**
     * In case the KpiSnapshot found by the `where` argument doesn't exist, create a new KpiSnapshot with this data.
     */
    create: XOR<KpiSnapshotCreateInput, KpiSnapshotUncheckedCreateInput>
    /**
     * In case the KpiSnapshot was found with the provided `where` argument, update it with this data.
     */
    update: XOR<KpiSnapshotUpdateInput, KpiSnapshotUncheckedUpdateInput>
  }

  /**
   * KpiSnapshot delete
   */
  export type KpiSnapshotDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
    /**
     * Filter which KpiSnapshot to delete.
     */
    where: KpiSnapshotWhereUniqueInput
  }

  /**
   * KpiSnapshot deleteMany
   */
  export type KpiSnapshotDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KpiSnapshots to delete
     */
    where?: KpiSnapshotWhereInput
    /**
     * Limit how many KpiSnapshots to delete.
     */
    limit?: number
  }

  /**
   * KpiSnapshot without action
   */
  export type KpiSnapshotDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiSnapshot
     */
    select?: KpiSnapshotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiSnapshot
     */
    omit?: KpiSnapshotOmit<ExtArgs> | null
  }


  /**
   * Model IntegrationCredential
   */

  export type AggregateIntegrationCredential = {
    _count: IntegrationCredentialCountAggregateOutputType | null
    _min: IntegrationCredentialMinAggregateOutputType | null
    _max: IntegrationCredentialMaxAggregateOutputType | null
  }

  export type IntegrationCredentialMinAggregateOutputType = {
    id: string | null
    provider: string | null
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    atualizadoEm: Date | null
  }

  export type IntegrationCredentialMaxAggregateOutputType = {
    id: string | null
    provider: string | null
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    atualizadoEm: Date | null
  }

  export type IntegrationCredentialCountAggregateOutputType = {
    id: number
    provider: number
    accessToken: number
    refreshToken: number
    expiresAt: number
    metadata: number
    atualizadoEm: number
    _all: number
  }


  export type IntegrationCredentialMinAggregateInputType = {
    id?: true
    provider?: true
    accessToken?: true
    refreshToken?: true
    expiresAt?: true
    atualizadoEm?: true
  }

  export type IntegrationCredentialMaxAggregateInputType = {
    id?: true
    provider?: true
    accessToken?: true
    refreshToken?: true
    expiresAt?: true
    atualizadoEm?: true
  }

  export type IntegrationCredentialCountAggregateInputType = {
    id?: true
    provider?: true
    accessToken?: true
    refreshToken?: true
    expiresAt?: true
    metadata?: true
    atualizadoEm?: true
    _all?: true
  }

  export type IntegrationCredentialAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IntegrationCredential to aggregate.
     */
    where?: IntegrationCredentialWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationCredentials to fetch.
     */
    orderBy?: IntegrationCredentialOrderByWithRelationInput | IntegrationCredentialOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: IntegrationCredentialWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationCredentials from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationCredentials.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned IntegrationCredentials
    **/
    _count?: true | IntegrationCredentialCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: IntegrationCredentialMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: IntegrationCredentialMaxAggregateInputType
  }

  export type GetIntegrationCredentialAggregateType<T extends IntegrationCredentialAggregateArgs> = {
        [P in keyof T & keyof AggregateIntegrationCredential]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateIntegrationCredential[P]>
      : GetScalarType<T[P], AggregateIntegrationCredential[P]>
  }




  export type IntegrationCredentialGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: IntegrationCredentialWhereInput
    orderBy?: IntegrationCredentialOrderByWithAggregationInput | IntegrationCredentialOrderByWithAggregationInput[]
    by: IntegrationCredentialScalarFieldEnum[] | IntegrationCredentialScalarFieldEnum
    having?: IntegrationCredentialScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: IntegrationCredentialCountAggregateInputType | true
    _min?: IntegrationCredentialMinAggregateInputType
    _max?: IntegrationCredentialMaxAggregateInputType
  }

  export type IntegrationCredentialGroupByOutputType = {
    id: string
    provider: string
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    metadata: JsonValue | null
    atualizadoEm: Date
    _count: IntegrationCredentialCountAggregateOutputType | null
    _min: IntegrationCredentialMinAggregateOutputType | null
    _max: IntegrationCredentialMaxAggregateOutputType | null
  }

  type GetIntegrationCredentialGroupByPayload<T extends IntegrationCredentialGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<IntegrationCredentialGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof IntegrationCredentialGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], IntegrationCredentialGroupByOutputType[P]>
            : GetScalarType<T[P], IntegrationCredentialGroupByOutputType[P]>
        }
      >
    >


  export type IntegrationCredentialSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    expiresAt?: boolean
    metadata?: boolean
    atualizadoEm?: boolean
  }, ExtArgs["result"]["integrationCredential"]>



  export type IntegrationCredentialSelectScalar = {
    id?: boolean
    provider?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    expiresAt?: boolean
    metadata?: boolean
    atualizadoEm?: boolean
  }

  export type IntegrationCredentialOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "provider" | "accessToken" | "refreshToken" | "expiresAt" | "metadata" | "atualizadoEm", ExtArgs["result"]["integrationCredential"]>

  export type $IntegrationCredentialPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "IntegrationCredential"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      provider: string
      accessToken: string | null
      refreshToken: string | null
      expiresAt: Date | null
      metadata: Prisma.JsonValue | null
      atualizadoEm: Date
    }, ExtArgs["result"]["integrationCredential"]>
    composites: {}
  }

  type IntegrationCredentialGetPayload<S extends boolean | null | undefined | IntegrationCredentialDefaultArgs> = $Result.GetResult<Prisma.$IntegrationCredentialPayload, S>

  type IntegrationCredentialCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<IntegrationCredentialFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: IntegrationCredentialCountAggregateInputType | true
    }

  export interface IntegrationCredentialDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['IntegrationCredential'], meta: { name: 'IntegrationCredential' } }
    /**
     * Find zero or one IntegrationCredential that matches the filter.
     * @param {IntegrationCredentialFindUniqueArgs} args - Arguments to find a IntegrationCredential
     * @example
     * // Get one IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends IntegrationCredentialFindUniqueArgs>(args: SelectSubset<T, IntegrationCredentialFindUniqueArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one IntegrationCredential that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {IntegrationCredentialFindUniqueOrThrowArgs} args - Arguments to find a IntegrationCredential
     * @example
     * // Get one IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends IntegrationCredentialFindUniqueOrThrowArgs>(args: SelectSubset<T, IntegrationCredentialFindUniqueOrThrowArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IntegrationCredential that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialFindFirstArgs} args - Arguments to find a IntegrationCredential
     * @example
     * // Get one IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends IntegrationCredentialFindFirstArgs>(args?: SelectSubset<T, IntegrationCredentialFindFirstArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first IntegrationCredential that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialFindFirstOrThrowArgs} args - Arguments to find a IntegrationCredential
     * @example
     * // Get one IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends IntegrationCredentialFindFirstOrThrowArgs>(args?: SelectSubset<T, IntegrationCredentialFindFirstOrThrowArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more IntegrationCredentials that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all IntegrationCredentials
     * const integrationCredentials = await prisma.integrationCredential.findMany()
     * 
     * // Get first 10 IntegrationCredentials
     * const integrationCredentials = await prisma.integrationCredential.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const integrationCredentialWithIdOnly = await prisma.integrationCredential.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends IntegrationCredentialFindManyArgs>(args?: SelectSubset<T, IntegrationCredentialFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a IntegrationCredential.
     * @param {IntegrationCredentialCreateArgs} args - Arguments to create a IntegrationCredential.
     * @example
     * // Create one IntegrationCredential
     * const IntegrationCredential = await prisma.integrationCredential.create({
     *   data: {
     *     // ... data to create a IntegrationCredential
     *   }
     * })
     * 
     */
    create<T extends IntegrationCredentialCreateArgs>(args: SelectSubset<T, IntegrationCredentialCreateArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many IntegrationCredentials.
     * @param {IntegrationCredentialCreateManyArgs} args - Arguments to create many IntegrationCredentials.
     * @example
     * // Create many IntegrationCredentials
     * const integrationCredential = await prisma.integrationCredential.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends IntegrationCredentialCreateManyArgs>(args?: SelectSubset<T, IntegrationCredentialCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a IntegrationCredential.
     * @param {IntegrationCredentialDeleteArgs} args - Arguments to delete one IntegrationCredential.
     * @example
     * // Delete one IntegrationCredential
     * const IntegrationCredential = await prisma.integrationCredential.delete({
     *   where: {
     *     // ... filter to delete one IntegrationCredential
     *   }
     * })
     * 
     */
    delete<T extends IntegrationCredentialDeleteArgs>(args: SelectSubset<T, IntegrationCredentialDeleteArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one IntegrationCredential.
     * @param {IntegrationCredentialUpdateArgs} args - Arguments to update one IntegrationCredential.
     * @example
     * // Update one IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends IntegrationCredentialUpdateArgs>(args: SelectSubset<T, IntegrationCredentialUpdateArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more IntegrationCredentials.
     * @param {IntegrationCredentialDeleteManyArgs} args - Arguments to filter IntegrationCredentials to delete.
     * @example
     * // Delete a few IntegrationCredentials
     * const { count } = await prisma.integrationCredential.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends IntegrationCredentialDeleteManyArgs>(args?: SelectSubset<T, IntegrationCredentialDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more IntegrationCredentials.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many IntegrationCredentials
     * const integrationCredential = await prisma.integrationCredential.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends IntegrationCredentialUpdateManyArgs>(args: SelectSubset<T, IntegrationCredentialUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one IntegrationCredential.
     * @param {IntegrationCredentialUpsertArgs} args - Arguments to update or create a IntegrationCredential.
     * @example
     * // Update or create a IntegrationCredential
     * const integrationCredential = await prisma.integrationCredential.upsert({
     *   create: {
     *     // ... data to create a IntegrationCredential
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the IntegrationCredential we want to update
     *   }
     * })
     */
    upsert<T extends IntegrationCredentialUpsertArgs>(args: SelectSubset<T, IntegrationCredentialUpsertArgs<ExtArgs>>): Prisma__IntegrationCredentialClient<$Result.GetResult<Prisma.$IntegrationCredentialPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of IntegrationCredentials.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialCountArgs} args - Arguments to filter IntegrationCredentials to count.
     * @example
     * // Count the number of IntegrationCredentials
     * const count = await prisma.integrationCredential.count({
     *   where: {
     *     // ... the filter for the IntegrationCredentials we want to count
     *   }
     * })
    **/
    count<T extends IntegrationCredentialCountArgs>(
      args?: Subset<T, IntegrationCredentialCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], IntegrationCredentialCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a IntegrationCredential.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends IntegrationCredentialAggregateArgs>(args: Subset<T, IntegrationCredentialAggregateArgs>): Prisma.PrismaPromise<GetIntegrationCredentialAggregateType<T>>

    /**
     * Group by IntegrationCredential.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {IntegrationCredentialGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends IntegrationCredentialGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: IntegrationCredentialGroupByArgs['orderBy'] }
        : { orderBy?: IntegrationCredentialGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, IntegrationCredentialGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetIntegrationCredentialGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the IntegrationCredential model
   */
  readonly fields: IntegrationCredentialFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for IntegrationCredential.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__IntegrationCredentialClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the IntegrationCredential model
   */
  interface IntegrationCredentialFieldRefs {
    readonly id: FieldRef<"IntegrationCredential", 'String'>
    readonly provider: FieldRef<"IntegrationCredential", 'String'>
    readonly accessToken: FieldRef<"IntegrationCredential", 'String'>
    readonly refreshToken: FieldRef<"IntegrationCredential", 'String'>
    readonly expiresAt: FieldRef<"IntegrationCredential", 'DateTime'>
    readonly metadata: FieldRef<"IntegrationCredential", 'Json'>
    readonly atualizadoEm: FieldRef<"IntegrationCredential", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * IntegrationCredential findUnique
   */
  export type IntegrationCredentialFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationCredential to fetch.
     */
    where: IntegrationCredentialWhereUniqueInput
  }

  /**
   * IntegrationCredential findUniqueOrThrow
   */
  export type IntegrationCredentialFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationCredential to fetch.
     */
    where: IntegrationCredentialWhereUniqueInput
  }

  /**
   * IntegrationCredential findFirst
   */
  export type IntegrationCredentialFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationCredential to fetch.
     */
    where?: IntegrationCredentialWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationCredentials to fetch.
     */
    orderBy?: IntegrationCredentialOrderByWithRelationInput | IntegrationCredentialOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IntegrationCredentials.
     */
    cursor?: IntegrationCredentialWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationCredentials from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationCredentials.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IntegrationCredentials.
     */
    distinct?: IntegrationCredentialScalarFieldEnum | IntegrationCredentialScalarFieldEnum[]
  }

  /**
   * IntegrationCredential findFirstOrThrow
   */
  export type IntegrationCredentialFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationCredential to fetch.
     */
    where?: IntegrationCredentialWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationCredentials to fetch.
     */
    orderBy?: IntegrationCredentialOrderByWithRelationInput | IntegrationCredentialOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for IntegrationCredentials.
     */
    cursor?: IntegrationCredentialWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationCredentials from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationCredentials.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of IntegrationCredentials.
     */
    distinct?: IntegrationCredentialScalarFieldEnum | IntegrationCredentialScalarFieldEnum[]
  }

  /**
   * IntegrationCredential findMany
   */
  export type IntegrationCredentialFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter, which IntegrationCredentials to fetch.
     */
    where?: IntegrationCredentialWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of IntegrationCredentials to fetch.
     */
    orderBy?: IntegrationCredentialOrderByWithRelationInput | IntegrationCredentialOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing IntegrationCredentials.
     */
    cursor?: IntegrationCredentialWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` IntegrationCredentials from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` IntegrationCredentials.
     */
    skip?: number
    distinct?: IntegrationCredentialScalarFieldEnum | IntegrationCredentialScalarFieldEnum[]
  }

  /**
   * IntegrationCredential create
   */
  export type IntegrationCredentialCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * The data needed to create a IntegrationCredential.
     */
    data: XOR<IntegrationCredentialCreateInput, IntegrationCredentialUncheckedCreateInput>
  }

  /**
   * IntegrationCredential createMany
   */
  export type IntegrationCredentialCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many IntegrationCredentials.
     */
    data: IntegrationCredentialCreateManyInput | IntegrationCredentialCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * IntegrationCredential update
   */
  export type IntegrationCredentialUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * The data needed to update a IntegrationCredential.
     */
    data: XOR<IntegrationCredentialUpdateInput, IntegrationCredentialUncheckedUpdateInput>
    /**
     * Choose, which IntegrationCredential to update.
     */
    where: IntegrationCredentialWhereUniqueInput
  }

  /**
   * IntegrationCredential updateMany
   */
  export type IntegrationCredentialUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update IntegrationCredentials.
     */
    data: XOR<IntegrationCredentialUpdateManyMutationInput, IntegrationCredentialUncheckedUpdateManyInput>
    /**
     * Filter which IntegrationCredentials to update
     */
    where?: IntegrationCredentialWhereInput
    /**
     * Limit how many IntegrationCredentials to update.
     */
    limit?: number
  }

  /**
   * IntegrationCredential upsert
   */
  export type IntegrationCredentialUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * The filter to search for the IntegrationCredential to update in case it exists.
     */
    where: IntegrationCredentialWhereUniqueInput
    /**
     * In case the IntegrationCredential found by the `where` argument doesn't exist, create a new IntegrationCredential with this data.
     */
    create: XOR<IntegrationCredentialCreateInput, IntegrationCredentialUncheckedCreateInput>
    /**
     * In case the IntegrationCredential was found with the provided `where` argument, update it with this data.
     */
    update: XOR<IntegrationCredentialUpdateInput, IntegrationCredentialUncheckedUpdateInput>
  }

  /**
   * IntegrationCredential delete
   */
  export type IntegrationCredentialDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
    /**
     * Filter which IntegrationCredential to delete.
     */
    where: IntegrationCredentialWhereUniqueInput
  }

  /**
   * IntegrationCredential deleteMany
   */
  export type IntegrationCredentialDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which IntegrationCredentials to delete
     */
    where?: IntegrationCredentialWhereInput
    /**
     * Limit how many IntegrationCredentials to delete.
     */
    limit?: number
  }

  /**
   * IntegrationCredential without action
   */
  export type IntegrationCredentialDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the IntegrationCredential
     */
    select?: IntegrationCredentialSelect<ExtArgs> | null
    /**
     * Omit specific fields from the IntegrationCredential
     */
    omit?: IntegrationCredentialOmit<ExtArgs> | null
  }


  /**
   * Model SyncState
   */

  export type AggregateSyncState = {
    _count: SyncStateCountAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  export type SyncStateMinAggregateOutputType = {
    id: string | null
    provider: string | null
    cursor: string | null
    lastSyncAt: Date | null
  }

  export type SyncStateMaxAggregateOutputType = {
    id: string | null
    provider: string | null
    cursor: string | null
    lastSyncAt: Date | null
  }

  export type SyncStateCountAggregateOutputType = {
    id: number
    provider: number
    cursor: number
    lastSyncAt: number
    _all: number
  }


  export type SyncStateMinAggregateInputType = {
    id?: true
    provider?: true
    cursor?: true
    lastSyncAt?: true
  }

  export type SyncStateMaxAggregateInputType = {
    id?: true
    provider?: true
    cursor?: true
    lastSyncAt?: true
  }

  export type SyncStateCountAggregateInputType = {
    id?: true
    provider?: true
    cursor?: true
    lastSyncAt?: true
    _all?: true
  }

  export type SyncStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncState to aggregate.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SyncStates
    **/
    _count?: true | SyncStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SyncStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SyncStateMaxAggregateInputType
  }

  export type GetSyncStateAggregateType<T extends SyncStateAggregateArgs> = {
        [P in keyof T & keyof AggregateSyncState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSyncState[P]>
      : GetScalarType<T[P], AggregateSyncState[P]>
  }




  export type SyncStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SyncStateWhereInput
    orderBy?: SyncStateOrderByWithAggregationInput | SyncStateOrderByWithAggregationInput[]
    by: SyncStateScalarFieldEnum[] | SyncStateScalarFieldEnum
    having?: SyncStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SyncStateCountAggregateInputType | true
    _min?: SyncStateMinAggregateInputType
    _max?: SyncStateMaxAggregateInputType
  }

  export type SyncStateGroupByOutputType = {
    id: string
    provider: string
    cursor: string | null
    lastSyncAt: Date | null
    _count: SyncStateCountAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  type GetSyncStateGroupByPayload<T extends SyncStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SyncStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SyncStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
            : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
        }
      >
    >


  export type SyncStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    cursor?: boolean
    lastSyncAt?: boolean
  }, ExtArgs["result"]["syncState"]>



  export type SyncStateSelectScalar = {
    id?: boolean
    provider?: boolean
    cursor?: boolean
    lastSyncAt?: boolean
  }

  export type SyncStateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "provider" | "cursor" | "lastSyncAt", ExtArgs["result"]["syncState"]>

  export type $SyncStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SyncState"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      provider: string
      cursor: string | null
      lastSyncAt: Date | null
    }, ExtArgs["result"]["syncState"]>
    composites: {}
  }

  type SyncStateGetPayload<S extends boolean | null | undefined | SyncStateDefaultArgs> = $Result.GetResult<Prisma.$SyncStatePayload, S>

  type SyncStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SyncStateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SyncStateCountAggregateInputType | true
    }

  export interface SyncStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SyncState'], meta: { name: 'SyncState' } }
    /**
     * Find zero or one SyncState that matches the filter.
     * @param {SyncStateFindUniqueArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SyncStateFindUniqueArgs>(args: SelectSubset<T, SyncStateFindUniqueArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SyncState that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SyncStateFindUniqueOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SyncStateFindUniqueOrThrowArgs>(args: SelectSubset<T, SyncStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SyncState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SyncStateFindFirstArgs>(args?: SelectSubset<T, SyncStateFindFirstArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SyncState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SyncStateFindFirstOrThrowArgs>(args?: SelectSubset<T, SyncStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SyncStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SyncStates
     * const syncStates = await prisma.syncState.findMany()
     * 
     * // Get first 10 SyncStates
     * const syncStates = await prisma.syncState.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const syncStateWithIdOnly = await prisma.syncState.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SyncStateFindManyArgs>(args?: SelectSubset<T, SyncStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SyncState.
     * @param {SyncStateCreateArgs} args - Arguments to create a SyncState.
     * @example
     * // Create one SyncState
     * const SyncState = await prisma.syncState.create({
     *   data: {
     *     // ... data to create a SyncState
     *   }
     * })
     * 
     */
    create<T extends SyncStateCreateArgs>(args: SelectSubset<T, SyncStateCreateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SyncStates.
     * @param {SyncStateCreateManyArgs} args - Arguments to create many SyncStates.
     * @example
     * // Create many SyncStates
     * const syncState = await prisma.syncState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SyncStateCreateManyArgs>(args?: SelectSubset<T, SyncStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a SyncState.
     * @param {SyncStateDeleteArgs} args - Arguments to delete one SyncState.
     * @example
     * // Delete one SyncState
     * const SyncState = await prisma.syncState.delete({
     *   where: {
     *     // ... filter to delete one SyncState
     *   }
     * })
     * 
     */
    delete<T extends SyncStateDeleteArgs>(args: SelectSubset<T, SyncStateDeleteArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SyncState.
     * @param {SyncStateUpdateArgs} args - Arguments to update one SyncState.
     * @example
     * // Update one SyncState
     * const syncState = await prisma.syncState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SyncStateUpdateArgs>(args: SelectSubset<T, SyncStateUpdateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SyncStates.
     * @param {SyncStateDeleteManyArgs} args - Arguments to filter SyncStates to delete.
     * @example
     * // Delete a few SyncStates
     * const { count } = await prisma.syncState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SyncStateDeleteManyArgs>(args?: SelectSubset<T, SyncStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SyncStates
     * const syncState = await prisma.syncState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SyncStateUpdateManyArgs>(args: SelectSubset<T, SyncStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SyncState.
     * @param {SyncStateUpsertArgs} args - Arguments to update or create a SyncState.
     * @example
     * // Update or create a SyncState
     * const syncState = await prisma.syncState.upsert({
     *   create: {
     *     // ... data to create a SyncState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SyncState we want to update
     *   }
     * })
     */
    upsert<T extends SyncStateUpsertArgs>(args: SelectSubset<T, SyncStateUpsertArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateCountArgs} args - Arguments to filter SyncStates to count.
     * @example
     * // Count the number of SyncStates
     * const count = await prisma.syncState.count({
     *   where: {
     *     // ... the filter for the SyncStates we want to count
     *   }
     * })
    **/
    count<T extends SyncStateCountArgs>(
      args?: Subset<T, SyncStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SyncStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SyncStateAggregateArgs>(args: Subset<T, SyncStateAggregateArgs>): Prisma.PrismaPromise<GetSyncStateAggregateType<T>>

    /**
     * Group by SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SyncStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SyncStateGroupByArgs['orderBy'] }
        : { orderBy?: SyncStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SyncStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSyncStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SyncState model
   */
  readonly fields: SyncStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SyncState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SyncStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SyncState model
   */
  interface SyncStateFieldRefs {
    readonly id: FieldRef<"SyncState", 'String'>
    readonly provider: FieldRef<"SyncState", 'String'>
    readonly cursor: FieldRef<"SyncState", 'String'>
    readonly lastSyncAt: FieldRef<"SyncState", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SyncState findUnique
   */
  export type SyncStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findUniqueOrThrow
   */
  export type SyncStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findFirst
   */
  export type SyncStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findFirstOrThrow
   */
  export type SyncStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findMany
   */
  export type SyncStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter, which SyncStates to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState create
   */
  export type SyncStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * The data needed to create a SyncState.
     */
    data: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
  }

  /**
   * SyncState createMany
   */
  export type SyncStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SyncStates.
     */
    data: SyncStateCreateManyInput | SyncStateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SyncState update
   */
  export type SyncStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * The data needed to update a SyncState.
     */
    data: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
    /**
     * Choose, which SyncState to update.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState updateMany
   */
  export type SyncStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SyncStates.
     */
    data: XOR<SyncStateUpdateManyMutationInput, SyncStateUncheckedUpdateManyInput>
    /**
     * Filter which SyncStates to update
     */
    where?: SyncStateWhereInput
    /**
     * Limit how many SyncStates to update.
     */
    limit?: number
  }

  /**
   * SyncState upsert
   */
  export type SyncStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * The filter to search for the SyncState to update in case it exists.
     */
    where: SyncStateWhereUniqueInput
    /**
     * In case the SyncState found by the `where` argument doesn't exist, create a new SyncState with this data.
     */
    create: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
    /**
     * In case the SyncState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
  }

  /**
   * SyncState delete
   */
  export type SyncStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
    /**
     * Filter which SyncState to delete.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState deleteMany
   */
  export type SyncStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncStates to delete
     */
    where?: SyncStateWhereInput
    /**
     * Limit how many SyncStates to delete.
     */
    limit?: number
  }

  /**
   * SyncState without action
   */
  export type SyncStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SyncState
     */
    omit?: SyncStateOmit<ExtArgs> | null
  }


  /**
   * Model RegraClassificacao
   */

  export type AggregateRegraClassificacao = {
    _count: RegraClassificacaoCountAggregateOutputType | null
    _min: RegraClassificacaoMinAggregateOutputType | null
    _max: RegraClassificacaoMaxAggregateOutputType | null
  }

  export type RegraClassificacaoMinAggregateOutputType = {
    id: string | null
    nome: string | null
    ativo: boolean | null
    criadoEm: Date | null
  }

  export type RegraClassificacaoMaxAggregateOutputType = {
    id: string | null
    nome: string | null
    ativo: boolean | null
    criadoEm: Date | null
  }

  export type RegraClassificacaoCountAggregateOutputType = {
    id: number
    nome: number
    payload: number
    ativo: number
    criadoEm: number
    _all: number
  }


  export type RegraClassificacaoMinAggregateInputType = {
    id?: true
    nome?: true
    ativo?: true
    criadoEm?: true
  }

  export type RegraClassificacaoMaxAggregateInputType = {
    id?: true
    nome?: true
    ativo?: true
    criadoEm?: true
  }

  export type RegraClassificacaoCountAggregateInputType = {
    id?: true
    nome?: true
    payload?: true
    ativo?: true
    criadoEm?: true
    _all?: true
  }

  export type RegraClassificacaoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RegraClassificacao to aggregate.
     */
    where?: RegraClassificacaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RegraClassificacaos to fetch.
     */
    orderBy?: RegraClassificacaoOrderByWithRelationInput | RegraClassificacaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RegraClassificacaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RegraClassificacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RegraClassificacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RegraClassificacaos
    **/
    _count?: true | RegraClassificacaoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RegraClassificacaoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RegraClassificacaoMaxAggregateInputType
  }

  export type GetRegraClassificacaoAggregateType<T extends RegraClassificacaoAggregateArgs> = {
        [P in keyof T & keyof AggregateRegraClassificacao]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRegraClassificacao[P]>
      : GetScalarType<T[P], AggregateRegraClassificacao[P]>
  }




  export type RegraClassificacaoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegraClassificacaoWhereInput
    orderBy?: RegraClassificacaoOrderByWithAggregationInput | RegraClassificacaoOrderByWithAggregationInput[]
    by: RegraClassificacaoScalarFieldEnum[] | RegraClassificacaoScalarFieldEnum
    having?: RegraClassificacaoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RegraClassificacaoCountAggregateInputType | true
    _min?: RegraClassificacaoMinAggregateInputType
    _max?: RegraClassificacaoMaxAggregateInputType
  }

  export type RegraClassificacaoGroupByOutputType = {
    id: string
    nome: string
    payload: JsonValue
    ativo: boolean
    criadoEm: Date
    _count: RegraClassificacaoCountAggregateOutputType | null
    _min: RegraClassificacaoMinAggregateOutputType | null
    _max: RegraClassificacaoMaxAggregateOutputType | null
  }

  type GetRegraClassificacaoGroupByPayload<T extends RegraClassificacaoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RegraClassificacaoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RegraClassificacaoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RegraClassificacaoGroupByOutputType[P]>
            : GetScalarType<T[P], RegraClassificacaoGroupByOutputType[P]>
        }
      >
    >


  export type RegraClassificacaoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    payload?: boolean
    ativo?: boolean
    criadoEm?: boolean
  }, ExtArgs["result"]["regraClassificacao"]>



  export type RegraClassificacaoSelectScalar = {
    id?: boolean
    nome?: boolean
    payload?: boolean
    ativo?: boolean
    criadoEm?: boolean
  }

  export type RegraClassificacaoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "payload" | "ativo" | "criadoEm", ExtArgs["result"]["regraClassificacao"]>

  export type $RegraClassificacaoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RegraClassificacao"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nome: string
      payload: Prisma.JsonValue
      ativo: boolean
      criadoEm: Date
    }, ExtArgs["result"]["regraClassificacao"]>
    composites: {}
  }

  type RegraClassificacaoGetPayload<S extends boolean | null | undefined | RegraClassificacaoDefaultArgs> = $Result.GetResult<Prisma.$RegraClassificacaoPayload, S>

  type RegraClassificacaoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RegraClassificacaoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RegraClassificacaoCountAggregateInputType | true
    }

  export interface RegraClassificacaoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RegraClassificacao'], meta: { name: 'RegraClassificacao' } }
    /**
     * Find zero or one RegraClassificacao that matches the filter.
     * @param {RegraClassificacaoFindUniqueArgs} args - Arguments to find a RegraClassificacao
     * @example
     * // Get one RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RegraClassificacaoFindUniqueArgs>(args: SelectSubset<T, RegraClassificacaoFindUniqueArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RegraClassificacao that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RegraClassificacaoFindUniqueOrThrowArgs} args - Arguments to find a RegraClassificacao
     * @example
     * // Get one RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RegraClassificacaoFindUniqueOrThrowArgs>(args: SelectSubset<T, RegraClassificacaoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RegraClassificacao that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoFindFirstArgs} args - Arguments to find a RegraClassificacao
     * @example
     * // Get one RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RegraClassificacaoFindFirstArgs>(args?: SelectSubset<T, RegraClassificacaoFindFirstArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RegraClassificacao that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoFindFirstOrThrowArgs} args - Arguments to find a RegraClassificacao
     * @example
     * // Get one RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RegraClassificacaoFindFirstOrThrowArgs>(args?: SelectSubset<T, RegraClassificacaoFindFirstOrThrowArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RegraClassificacaos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RegraClassificacaos
     * const regraClassificacaos = await prisma.regraClassificacao.findMany()
     * 
     * // Get first 10 RegraClassificacaos
     * const regraClassificacaos = await prisma.regraClassificacao.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const regraClassificacaoWithIdOnly = await prisma.regraClassificacao.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RegraClassificacaoFindManyArgs>(args?: SelectSubset<T, RegraClassificacaoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RegraClassificacao.
     * @param {RegraClassificacaoCreateArgs} args - Arguments to create a RegraClassificacao.
     * @example
     * // Create one RegraClassificacao
     * const RegraClassificacao = await prisma.regraClassificacao.create({
     *   data: {
     *     // ... data to create a RegraClassificacao
     *   }
     * })
     * 
     */
    create<T extends RegraClassificacaoCreateArgs>(args: SelectSubset<T, RegraClassificacaoCreateArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RegraClassificacaos.
     * @param {RegraClassificacaoCreateManyArgs} args - Arguments to create many RegraClassificacaos.
     * @example
     * // Create many RegraClassificacaos
     * const regraClassificacao = await prisma.regraClassificacao.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RegraClassificacaoCreateManyArgs>(args?: SelectSubset<T, RegraClassificacaoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a RegraClassificacao.
     * @param {RegraClassificacaoDeleteArgs} args - Arguments to delete one RegraClassificacao.
     * @example
     * // Delete one RegraClassificacao
     * const RegraClassificacao = await prisma.regraClassificacao.delete({
     *   where: {
     *     // ... filter to delete one RegraClassificacao
     *   }
     * })
     * 
     */
    delete<T extends RegraClassificacaoDeleteArgs>(args: SelectSubset<T, RegraClassificacaoDeleteArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RegraClassificacao.
     * @param {RegraClassificacaoUpdateArgs} args - Arguments to update one RegraClassificacao.
     * @example
     * // Update one RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RegraClassificacaoUpdateArgs>(args: SelectSubset<T, RegraClassificacaoUpdateArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RegraClassificacaos.
     * @param {RegraClassificacaoDeleteManyArgs} args - Arguments to filter RegraClassificacaos to delete.
     * @example
     * // Delete a few RegraClassificacaos
     * const { count } = await prisma.regraClassificacao.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RegraClassificacaoDeleteManyArgs>(args?: SelectSubset<T, RegraClassificacaoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RegraClassificacaos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RegraClassificacaos
     * const regraClassificacao = await prisma.regraClassificacao.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RegraClassificacaoUpdateManyArgs>(args: SelectSubset<T, RegraClassificacaoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RegraClassificacao.
     * @param {RegraClassificacaoUpsertArgs} args - Arguments to update or create a RegraClassificacao.
     * @example
     * // Update or create a RegraClassificacao
     * const regraClassificacao = await prisma.regraClassificacao.upsert({
     *   create: {
     *     // ... data to create a RegraClassificacao
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RegraClassificacao we want to update
     *   }
     * })
     */
    upsert<T extends RegraClassificacaoUpsertArgs>(args: SelectSubset<T, RegraClassificacaoUpsertArgs<ExtArgs>>): Prisma__RegraClassificacaoClient<$Result.GetResult<Prisma.$RegraClassificacaoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RegraClassificacaos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoCountArgs} args - Arguments to filter RegraClassificacaos to count.
     * @example
     * // Count the number of RegraClassificacaos
     * const count = await prisma.regraClassificacao.count({
     *   where: {
     *     // ... the filter for the RegraClassificacaos we want to count
     *   }
     * })
    **/
    count<T extends RegraClassificacaoCountArgs>(
      args?: Subset<T, RegraClassificacaoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RegraClassificacaoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RegraClassificacao.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RegraClassificacaoAggregateArgs>(args: Subset<T, RegraClassificacaoAggregateArgs>): Prisma.PrismaPromise<GetRegraClassificacaoAggregateType<T>>

    /**
     * Group by RegraClassificacao.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegraClassificacaoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RegraClassificacaoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RegraClassificacaoGroupByArgs['orderBy'] }
        : { orderBy?: RegraClassificacaoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RegraClassificacaoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRegraClassificacaoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RegraClassificacao model
   */
  readonly fields: RegraClassificacaoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RegraClassificacao.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RegraClassificacaoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RegraClassificacao model
   */
  interface RegraClassificacaoFieldRefs {
    readonly id: FieldRef<"RegraClassificacao", 'String'>
    readonly nome: FieldRef<"RegraClassificacao", 'String'>
    readonly payload: FieldRef<"RegraClassificacao", 'Json'>
    readonly ativo: FieldRef<"RegraClassificacao", 'Boolean'>
    readonly criadoEm: FieldRef<"RegraClassificacao", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RegraClassificacao findUnique
   */
  export type RegraClassificacaoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter, which RegraClassificacao to fetch.
     */
    where: RegraClassificacaoWhereUniqueInput
  }

  /**
   * RegraClassificacao findUniqueOrThrow
   */
  export type RegraClassificacaoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter, which RegraClassificacao to fetch.
     */
    where: RegraClassificacaoWhereUniqueInput
  }

  /**
   * RegraClassificacao findFirst
   */
  export type RegraClassificacaoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter, which RegraClassificacao to fetch.
     */
    where?: RegraClassificacaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RegraClassificacaos to fetch.
     */
    orderBy?: RegraClassificacaoOrderByWithRelationInput | RegraClassificacaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RegraClassificacaos.
     */
    cursor?: RegraClassificacaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RegraClassificacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RegraClassificacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RegraClassificacaos.
     */
    distinct?: RegraClassificacaoScalarFieldEnum | RegraClassificacaoScalarFieldEnum[]
  }

  /**
   * RegraClassificacao findFirstOrThrow
   */
  export type RegraClassificacaoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter, which RegraClassificacao to fetch.
     */
    where?: RegraClassificacaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RegraClassificacaos to fetch.
     */
    orderBy?: RegraClassificacaoOrderByWithRelationInput | RegraClassificacaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RegraClassificacaos.
     */
    cursor?: RegraClassificacaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RegraClassificacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RegraClassificacaos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RegraClassificacaos.
     */
    distinct?: RegraClassificacaoScalarFieldEnum | RegraClassificacaoScalarFieldEnum[]
  }

  /**
   * RegraClassificacao findMany
   */
  export type RegraClassificacaoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter, which RegraClassificacaos to fetch.
     */
    where?: RegraClassificacaoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RegraClassificacaos to fetch.
     */
    orderBy?: RegraClassificacaoOrderByWithRelationInput | RegraClassificacaoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RegraClassificacaos.
     */
    cursor?: RegraClassificacaoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RegraClassificacaos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RegraClassificacaos.
     */
    skip?: number
    distinct?: RegraClassificacaoScalarFieldEnum | RegraClassificacaoScalarFieldEnum[]
  }

  /**
   * RegraClassificacao create
   */
  export type RegraClassificacaoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * The data needed to create a RegraClassificacao.
     */
    data: XOR<RegraClassificacaoCreateInput, RegraClassificacaoUncheckedCreateInput>
  }

  /**
   * RegraClassificacao createMany
   */
  export type RegraClassificacaoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RegraClassificacaos.
     */
    data: RegraClassificacaoCreateManyInput | RegraClassificacaoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RegraClassificacao update
   */
  export type RegraClassificacaoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * The data needed to update a RegraClassificacao.
     */
    data: XOR<RegraClassificacaoUpdateInput, RegraClassificacaoUncheckedUpdateInput>
    /**
     * Choose, which RegraClassificacao to update.
     */
    where: RegraClassificacaoWhereUniqueInput
  }

  /**
   * RegraClassificacao updateMany
   */
  export type RegraClassificacaoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RegraClassificacaos.
     */
    data: XOR<RegraClassificacaoUpdateManyMutationInput, RegraClassificacaoUncheckedUpdateManyInput>
    /**
     * Filter which RegraClassificacaos to update
     */
    where?: RegraClassificacaoWhereInput
    /**
     * Limit how many RegraClassificacaos to update.
     */
    limit?: number
  }

  /**
   * RegraClassificacao upsert
   */
  export type RegraClassificacaoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * The filter to search for the RegraClassificacao to update in case it exists.
     */
    where: RegraClassificacaoWhereUniqueInput
    /**
     * In case the RegraClassificacao found by the `where` argument doesn't exist, create a new RegraClassificacao with this data.
     */
    create: XOR<RegraClassificacaoCreateInput, RegraClassificacaoUncheckedCreateInput>
    /**
     * In case the RegraClassificacao was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RegraClassificacaoUpdateInput, RegraClassificacaoUncheckedUpdateInput>
  }

  /**
   * RegraClassificacao delete
   */
  export type RegraClassificacaoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
    /**
     * Filter which RegraClassificacao to delete.
     */
    where: RegraClassificacaoWhereUniqueInput
  }

  /**
   * RegraClassificacao deleteMany
   */
  export type RegraClassificacaoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RegraClassificacaos to delete
     */
    where?: RegraClassificacaoWhereInput
    /**
     * Limit how many RegraClassificacaos to delete.
     */
    limit?: number
  }

  /**
   * RegraClassificacao without action
   */
  export type RegraClassificacaoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegraClassificacao
     */
    select?: RegraClassificacaoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RegraClassificacao
     */
    omit?: RegraClassificacaoOmit<ExtArgs> | null
  }


  /**
   * Model TemplateMensagem
   */

  export type AggregateTemplateMensagem = {
    _count: TemplateMensagemCountAggregateOutputType | null
    _min: TemplateMensagemMinAggregateOutputType | null
    _max: TemplateMensagemMaxAggregateOutputType | null
  }

  export type TemplateMensagemMinAggregateOutputType = {
    id: string | null
    nome: string | null
    tipo: $Enums.TipoMensagem | null
    corpo: string | null
    ativo: boolean | null
    criadoEm: Date | null
  }

  export type TemplateMensagemMaxAggregateOutputType = {
    id: string | null
    nome: string | null
    tipo: $Enums.TipoMensagem | null
    corpo: string | null
    ativo: boolean | null
    criadoEm: Date | null
  }

  export type TemplateMensagemCountAggregateOutputType = {
    id: number
    nome: number
    tipo: number
    corpo: number
    ativo: number
    criadoEm: number
    _all: number
  }


  export type TemplateMensagemMinAggregateInputType = {
    id?: true
    nome?: true
    tipo?: true
    corpo?: true
    ativo?: true
    criadoEm?: true
  }

  export type TemplateMensagemMaxAggregateInputType = {
    id?: true
    nome?: true
    tipo?: true
    corpo?: true
    ativo?: true
    criadoEm?: true
  }

  export type TemplateMensagemCountAggregateInputType = {
    id?: true
    nome?: true
    tipo?: true
    corpo?: true
    ativo?: true
    criadoEm?: true
    _all?: true
  }

  export type TemplateMensagemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateMensagem to aggregate.
     */
    where?: TemplateMensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateMensagems to fetch.
     */
    orderBy?: TemplateMensagemOrderByWithRelationInput | TemplateMensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TemplateMensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateMensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateMensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TemplateMensagems
    **/
    _count?: true | TemplateMensagemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TemplateMensagemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TemplateMensagemMaxAggregateInputType
  }

  export type GetTemplateMensagemAggregateType<T extends TemplateMensagemAggregateArgs> = {
        [P in keyof T & keyof AggregateTemplateMensagem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTemplateMensagem[P]>
      : GetScalarType<T[P], AggregateTemplateMensagem[P]>
  }




  export type TemplateMensagemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateMensagemWhereInput
    orderBy?: TemplateMensagemOrderByWithAggregationInput | TemplateMensagemOrderByWithAggregationInput[]
    by: TemplateMensagemScalarFieldEnum[] | TemplateMensagemScalarFieldEnum
    having?: TemplateMensagemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TemplateMensagemCountAggregateInputType | true
    _min?: TemplateMensagemMinAggregateInputType
    _max?: TemplateMensagemMaxAggregateInputType
  }

  export type TemplateMensagemGroupByOutputType = {
    id: string
    nome: string
    tipo: $Enums.TipoMensagem
    corpo: string
    ativo: boolean
    criadoEm: Date
    _count: TemplateMensagemCountAggregateOutputType | null
    _min: TemplateMensagemMinAggregateOutputType | null
    _max: TemplateMensagemMaxAggregateOutputType | null
  }

  type GetTemplateMensagemGroupByPayload<T extends TemplateMensagemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TemplateMensagemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TemplateMensagemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TemplateMensagemGroupByOutputType[P]>
            : GetScalarType<T[P], TemplateMensagemGroupByOutputType[P]>
        }
      >
    >


  export type TemplateMensagemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    tipo?: boolean
    corpo?: boolean
    ativo?: boolean
    criadoEm?: boolean
  }, ExtArgs["result"]["templateMensagem"]>



  export type TemplateMensagemSelectScalar = {
    id?: boolean
    nome?: boolean
    tipo?: boolean
    corpo?: boolean
    ativo?: boolean
    criadoEm?: boolean
  }

  export type TemplateMensagemOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "tipo" | "corpo" | "ativo" | "criadoEm", ExtArgs["result"]["templateMensagem"]>

  export type $TemplateMensagemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TemplateMensagem"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nome: string
      tipo: $Enums.TipoMensagem
      corpo: string
      ativo: boolean
      criadoEm: Date
    }, ExtArgs["result"]["templateMensagem"]>
    composites: {}
  }

  type TemplateMensagemGetPayload<S extends boolean | null | undefined | TemplateMensagemDefaultArgs> = $Result.GetResult<Prisma.$TemplateMensagemPayload, S>

  type TemplateMensagemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TemplateMensagemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TemplateMensagemCountAggregateInputType | true
    }

  export interface TemplateMensagemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TemplateMensagem'], meta: { name: 'TemplateMensagem' } }
    /**
     * Find zero or one TemplateMensagem that matches the filter.
     * @param {TemplateMensagemFindUniqueArgs} args - Arguments to find a TemplateMensagem
     * @example
     * // Get one TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TemplateMensagemFindUniqueArgs>(args: SelectSubset<T, TemplateMensagemFindUniqueArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TemplateMensagem that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TemplateMensagemFindUniqueOrThrowArgs} args - Arguments to find a TemplateMensagem
     * @example
     * // Get one TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TemplateMensagemFindUniqueOrThrowArgs>(args: SelectSubset<T, TemplateMensagemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TemplateMensagem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemFindFirstArgs} args - Arguments to find a TemplateMensagem
     * @example
     * // Get one TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TemplateMensagemFindFirstArgs>(args?: SelectSubset<T, TemplateMensagemFindFirstArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TemplateMensagem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemFindFirstOrThrowArgs} args - Arguments to find a TemplateMensagem
     * @example
     * // Get one TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TemplateMensagemFindFirstOrThrowArgs>(args?: SelectSubset<T, TemplateMensagemFindFirstOrThrowArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TemplateMensagems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TemplateMensagems
     * const templateMensagems = await prisma.templateMensagem.findMany()
     * 
     * // Get first 10 TemplateMensagems
     * const templateMensagems = await prisma.templateMensagem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const templateMensagemWithIdOnly = await prisma.templateMensagem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TemplateMensagemFindManyArgs>(args?: SelectSubset<T, TemplateMensagemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TemplateMensagem.
     * @param {TemplateMensagemCreateArgs} args - Arguments to create a TemplateMensagem.
     * @example
     * // Create one TemplateMensagem
     * const TemplateMensagem = await prisma.templateMensagem.create({
     *   data: {
     *     // ... data to create a TemplateMensagem
     *   }
     * })
     * 
     */
    create<T extends TemplateMensagemCreateArgs>(args: SelectSubset<T, TemplateMensagemCreateArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TemplateMensagems.
     * @param {TemplateMensagemCreateManyArgs} args - Arguments to create many TemplateMensagems.
     * @example
     * // Create many TemplateMensagems
     * const templateMensagem = await prisma.templateMensagem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TemplateMensagemCreateManyArgs>(args?: SelectSubset<T, TemplateMensagemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a TemplateMensagem.
     * @param {TemplateMensagemDeleteArgs} args - Arguments to delete one TemplateMensagem.
     * @example
     * // Delete one TemplateMensagem
     * const TemplateMensagem = await prisma.templateMensagem.delete({
     *   where: {
     *     // ... filter to delete one TemplateMensagem
     *   }
     * })
     * 
     */
    delete<T extends TemplateMensagemDeleteArgs>(args: SelectSubset<T, TemplateMensagemDeleteArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TemplateMensagem.
     * @param {TemplateMensagemUpdateArgs} args - Arguments to update one TemplateMensagem.
     * @example
     * // Update one TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TemplateMensagemUpdateArgs>(args: SelectSubset<T, TemplateMensagemUpdateArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TemplateMensagems.
     * @param {TemplateMensagemDeleteManyArgs} args - Arguments to filter TemplateMensagems to delete.
     * @example
     * // Delete a few TemplateMensagems
     * const { count } = await prisma.templateMensagem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TemplateMensagemDeleteManyArgs>(args?: SelectSubset<T, TemplateMensagemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TemplateMensagems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TemplateMensagems
     * const templateMensagem = await prisma.templateMensagem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TemplateMensagemUpdateManyArgs>(args: SelectSubset<T, TemplateMensagemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TemplateMensagem.
     * @param {TemplateMensagemUpsertArgs} args - Arguments to update or create a TemplateMensagem.
     * @example
     * // Update or create a TemplateMensagem
     * const templateMensagem = await prisma.templateMensagem.upsert({
     *   create: {
     *     // ... data to create a TemplateMensagem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TemplateMensagem we want to update
     *   }
     * })
     */
    upsert<T extends TemplateMensagemUpsertArgs>(args: SelectSubset<T, TemplateMensagemUpsertArgs<ExtArgs>>): Prisma__TemplateMensagemClient<$Result.GetResult<Prisma.$TemplateMensagemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TemplateMensagems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemCountArgs} args - Arguments to filter TemplateMensagems to count.
     * @example
     * // Count the number of TemplateMensagems
     * const count = await prisma.templateMensagem.count({
     *   where: {
     *     // ... the filter for the TemplateMensagems we want to count
     *   }
     * })
    **/
    count<T extends TemplateMensagemCountArgs>(
      args?: Subset<T, TemplateMensagemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TemplateMensagemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TemplateMensagem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TemplateMensagemAggregateArgs>(args: Subset<T, TemplateMensagemAggregateArgs>): Prisma.PrismaPromise<GetTemplateMensagemAggregateType<T>>

    /**
     * Group by TemplateMensagem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateMensagemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TemplateMensagemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TemplateMensagemGroupByArgs['orderBy'] }
        : { orderBy?: TemplateMensagemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TemplateMensagemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTemplateMensagemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TemplateMensagem model
   */
  readonly fields: TemplateMensagemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TemplateMensagem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TemplateMensagemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TemplateMensagem model
   */
  interface TemplateMensagemFieldRefs {
    readonly id: FieldRef<"TemplateMensagem", 'String'>
    readonly nome: FieldRef<"TemplateMensagem", 'String'>
    readonly tipo: FieldRef<"TemplateMensagem", 'TipoMensagem'>
    readonly corpo: FieldRef<"TemplateMensagem", 'String'>
    readonly ativo: FieldRef<"TemplateMensagem", 'Boolean'>
    readonly criadoEm: FieldRef<"TemplateMensagem", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TemplateMensagem findUnique
   */
  export type TemplateMensagemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter, which TemplateMensagem to fetch.
     */
    where: TemplateMensagemWhereUniqueInput
  }

  /**
   * TemplateMensagem findUniqueOrThrow
   */
  export type TemplateMensagemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter, which TemplateMensagem to fetch.
     */
    where: TemplateMensagemWhereUniqueInput
  }

  /**
   * TemplateMensagem findFirst
   */
  export type TemplateMensagemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter, which TemplateMensagem to fetch.
     */
    where?: TemplateMensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateMensagems to fetch.
     */
    orderBy?: TemplateMensagemOrderByWithRelationInput | TemplateMensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateMensagems.
     */
    cursor?: TemplateMensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateMensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateMensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateMensagems.
     */
    distinct?: TemplateMensagemScalarFieldEnum | TemplateMensagemScalarFieldEnum[]
  }

  /**
   * TemplateMensagem findFirstOrThrow
   */
  export type TemplateMensagemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter, which TemplateMensagem to fetch.
     */
    where?: TemplateMensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateMensagems to fetch.
     */
    orderBy?: TemplateMensagemOrderByWithRelationInput | TemplateMensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateMensagems.
     */
    cursor?: TemplateMensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateMensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateMensagems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateMensagems.
     */
    distinct?: TemplateMensagemScalarFieldEnum | TemplateMensagemScalarFieldEnum[]
  }

  /**
   * TemplateMensagem findMany
   */
  export type TemplateMensagemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter, which TemplateMensagems to fetch.
     */
    where?: TemplateMensagemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateMensagems to fetch.
     */
    orderBy?: TemplateMensagemOrderByWithRelationInput | TemplateMensagemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TemplateMensagems.
     */
    cursor?: TemplateMensagemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateMensagems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateMensagems.
     */
    skip?: number
    distinct?: TemplateMensagemScalarFieldEnum | TemplateMensagemScalarFieldEnum[]
  }

  /**
   * TemplateMensagem create
   */
  export type TemplateMensagemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * The data needed to create a TemplateMensagem.
     */
    data: XOR<TemplateMensagemCreateInput, TemplateMensagemUncheckedCreateInput>
  }

  /**
   * TemplateMensagem createMany
   */
  export type TemplateMensagemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TemplateMensagems.
     */
    data: TemplateMensagemCreateManyInput | TemplateMensagemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TemplateMensagem update
   */
  export type TemplateMensagemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * The data needed to update a TemplateMensagem.
     */
    data: XOR<TemplateMensagemUpdateInput, TemplateMensagemUncheckedUpdateInput>
    /**
     * Choose, which TemplateMensagem to update.
     */
    where: TemplateMensagemWhereUniqueInput
  }

  /**
   * TemplateMensagem updateMany
   */
  export type TemplateMensagemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TemplateMensagems.
     */
    data: XOR<TemplateMensagemUpdateManyMutationInput, TemplateMensagemUncheckedUpdateManyInput>
    /**
     * Filter which TemplateMensagems to update
     */
    where?: TemplateMensagemWhereInput
    /**
     * Limit how many TemplateMensagems to update.
     */
    limit?: number
  }

  /**
   * TemplateMensagem upsert
   */
  export type TemplateMensagemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * The filter to search for the TemplateMensagem to update in case it exists.
     */
    where: TemplateMensagemWhereUniqueInput
    /**
     * In case the TemplateMensagem found by the `where` argument doesn't exist, create a new TemplateMensagem with this data.
     */
    create: XOR<TemplateMensagemCreateInput, TemplateMensagemUncheckedCreateInput>
    /**
     * In case the TemplateMensagem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TemplateMensagemUpdateInput, TemplateMensagemUncheckedUpdateInput>
  }

  /**
   * TemplateMensagem delete
   */
  export type TemplateMensagemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
    /**
     * Filter which TemplateMensagem to delete.
     */
    where: TemplateMensagemWhereUniqueInput
  }

  /**
   * TemplateMensagem deleteMany
   */
  export type TemplateMensagemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateMensagems to delete
     */
    where?: TemplateMensagemWhereInput
    /**
     * Limit how many TemplateMensagems to delete.
     */
    limit?: number
  }

  /**
   * TemplateMensagem without action
   */
  export type TemplateMensagemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateMensagem
     */
    select?: TemplateMensagemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TemplateMensagem
     */
    omit?: TemplateMensagemOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UsuarioScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    email: 'email',
    senhaHash: 'senhaHash',
    perfil: 'perfil',
    status: 'status',
    dataCadastro: 'dataCadastro'
  };

  export type UsuarioScalarFieldEnum = (typeof UsuarioScalarFieldEnum)[keyof typeof UsuarioScalarFieldEnum]


  export const RefreshTokenScalarFieldEnum: {
    id: 'id',
    usuarioId: 'usuarioId',
    tokenHash: 'tokenHash',
    expiresEm: 'expiresEm',
    revogadoEm: 'revogadoEm'
  };

  export type RefreshTokenScalarFieldEnum = (typeof RefreshTokenScalarFieldEnum)[keyof typeof RefreshTokenScalarFieldEnum]


  export const ClienteScalarFieldEnum: {
    id: 'id',
    externalId: 'externalId',
    nome: 'nome',
    tipo: 'tipo',
    cnpjCpf: 'cnpjCpf',
    endereco: 'endereco',
    contatoPrincipal: 'contatoPrincipal',
    emailPrincipal: 'emailPrincipal',
    telefoneWhatsapp: 'telefoneWhatsapp',
    scoreComercial: 'scoreComercial',
    statusRelacionamento: 'statusRelacionamento',
    tags: 'tags',
    urlInstagram: 'urlInstagram',
    urlSite: 'urlSite',
    dataCadastro: 'dataCadastro',
    dataUltimaAtualizacao: 'dataUltimaAtualizacao'
  };

  export type ClienteScalarFieldEnum = (typeof ClienteScalarFieldEnum)[keyof typeof ClienteScalarFieldEnum]


  export const PedidoScalarFieldEnum: {
    id: 'id',
    externalId: 'externalId',
    clienteId: 'clienteId',
    dataPedido: 'dataPedido',
    valorTotal: 'valorTotal',
    statusPedido: 'statusPedido',
    origemPedido: 'origemPedido'
  };

  export type PedidoScalarFieldEnum = (typeof PedidoScalarFieldEnum)[keyof typeof PedidoScalarFieldEnum]


  export const ItemPedidoScalarFieldEnum: {
    id: 'id',
    pedidoId: 'pedidoId',
    sku: 'sku',
    produto: 'produto',
    categoria: 'categoria',
    quantidade: 'quantidade',
    precoUnit: 'precoUnit'
  };

  export type ItemPedidoScalarFieldEnum = (typeof ItemPedidoScalarFieldEnum)[keyof typeof ItemPedidoScalarFieldEnum]


  export const InteracaoScalarFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    tipoInteracao: 'tipoInteracao',
    dataInteracao: 'dataInteracao',
    resumo: 'resumo',
    sentimento: 'sentimento',
    oportunidadeDetectada: 'oportunidadeDetectada',
    riscoDetectado: 'riscoDetectado',
    conteudoBruto: 'conteudoBruto'
  };

  export type InteracaoScalarFieldEnum = (typeof InteracaoScalarFieldEnum)[keyof typeof InteracaoScalarFieldEnum]


  export const OportunidadeScalarFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    tipoOportunidade: 'tipoOportunidade',
    descricao: 'descricao',
    valorEstimado: 'valorEstimado',
    probabilidadeConversao: 'probabilidadeConversao',
    prioridade: 'prioridade',
    statusOportunidade: 'statusOportunidade',
    dataCriacao: 'dataCriacao',
    dataFechamento: 'dataFechamento',
    responsavelId: 'responsavelId'
  };

  export type OportunidadeScalarFieldEnum = (typeof OportunidadeScalarFieldEnum)[keyof typeof OportunidadeScalarFieldEnum]


  export const MensagemScalarFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    tipoMensagem: 'tipoMensagem',
    conteudoSugerido: 'conteudoSugerido',
    conteudoFinal: 'conteudoFinal',
    statusEnvio: 'statusEnvio',
    sensivel: 'sensivel',
    dataCriacao: 'dataCriacao',
    dataAprovacao: 'dataAprovacao',
    dataEnvio: 'dataEnvio',
    aprovadorId: 'aprovadorId',
    canalEnvio: 'canalEnvio',
    agendadoPara: 'agendadoPara',
    justificativaRejeicao: 'justificativaRejeicao'
  };

  export type MensagemScalarFieldEnum = (typeof MensagemScalarFieldEnum)[keyof typeof MensagemScalarFieldEnum]


  export const ExecucaoApiScalarFieldEnum: {
    id: 'id',
    acaoApi: 'acaoApi',
    dataExecucao: 'dataExecucao',
    statusExecucao: 'statusExecucao',
    clienteId: 'clienteId',
    detalhesExecucao: 'detalhesExecucao',
    mensagemErro: 'mensagemErro',
    duracaoMs: 'duracaoMs'
  };

  export type ExecucaoApiScalarFieldEnum = (typeof ExecucaoApiScalarFieldEnum)[keyof typeof ExecucaoApiScalarFieldEnum]


  export const KpiSnapshotScalarFieldEnum: {
    id: 'id',
    nomeKpi: 'nomeKpi',
    valor: 'valor',
    periodo: 'periodo',
    dataReferencia: 'dataReferencia',
    payload: 'payload'
  };

  export type KpiSnapshotScalarFieldEnum = (typeof KpiSnapshotScalarFieldEnum)[keyof typeof KpiSnapshotScalarFieldEnum]


  export const IntegrationCredentialScalarFieldEnum: {
    id: 'id',
    provider: 'provider',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    expiresAt: 'expiresAt',
    metadata: 'metadata',
    atualizadoEm: 'atualizadoEm'
  };

  export type IntegrationCredentialScalarFieldEnum = (typeof IntegrationCredentialScalarFieldEnum)[keyof typeof IntegrationCredentialScalarFieldEnum]


  export const SyncStateScalarFieldEnum: {
    id: 'id',
    provider: 'provider',
    cursor: 'cursor',
    lastSyncAt: 'lastSyncAt'
  };

  export type SyncStateScalarFieldEnum = (typeof SyncStateScalarFieldEnum)[keyof typeof SyncStateScalarFieldEnum]


  export const RegraClassificacaoScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    payload: 'payload',
    ativo: 'ativo',
    criadoEm: 'criadoEm'
  };

  export type RegraClassificacaoScalarFieldEnum = (typeof RegraClassificacaoScalarFieldEnum)[keyof typeof RegraClassificacaoScalarFieldEnum]


  export const TemplateMensagemScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    tipo: 'tipo',
    corpo: 'corpo',
    ativo: 'ativo',
    criadoEm: 'criadoEm'
  };

  export type TemplateMensagemScalarFieldEnum = (typeof TemplateMensagemScalarFieldEnum)[keyof typeof TemplateMensagemScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const UsuarioOrderByRelevanceFieldEnum: {
    id: 'id',
    nome: 'nome',
    email: 'email',
    senhaHash: 'senhaHash'
  };

  export type UsuarioOrderByRelevanceFieldEnum = (typeof UsuarioOrderByRelevanceFieldEnum)[keyof typeof UsuarioOrderByRelevanceFieldEnum]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const RefreshTokenOrderByRelevanceFieldEnum: {
    id: 'id',
    usuarioId: 'usuarioId',
    tokenHash: 'tokenHash'
  };

  export type RefreshTokenOrderByRelevanceFieldEnum = (typeof RefreshTokenOrderByRelevanceFieldEnum)[keyof typeof RefreshTokenOrderByRelevanceFieldEnum]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const ClienteOrderByRelevanceFieldEnum: {
    id: 'id',
    externalId: 'externalId',
    nome: 'nome',
    cnpjCpf: 'cnpjCpf',
    endereco: 'endereco',
    contatoPrincipal: 'contatoPrincipal',
    emailPrincipal: 'emailPrincipal',
    telefoneWhatsapp: 'telefoneWhatsapp',
    urlInstagram: 'urlInstagram',
    urlSite: 'urlSite'
  };

  export type ClienteOrderByRelevanceFieldEnum = (typeof ClienteOrderByRelevanceFieldEnum)[keyof typeof ClienteOrderByRelevanceFieldEnum]


  export const PedidoOrderByRelevanceFieldEnum: {
    id: 'id',
    externalId: 'externalId',
    clienteId: 'clienteId',
    statusPedido: 'statusPedido'
  };

  export type PedidoOrderByRelevanceFieldEnum = (typeof PedidoOrderByRelevanceFieldEnum)[keyof typeof PedidoOrderByRelevanceFieldEnum]


  export const ItemPedidoOrderByRelevanceFieldEnum: {
    id: 'id',
    pedidoId: 'pedidoId',
    sku: 'sku',
    produto: 'produto',
    categoria: 'categoria'
  };

  export type ItemPedidoOrderByRelevanceFieldEnum = (typeof ItemPedidoOrderByRelevanceFieldEnum)[keyof typeof ItemPedidoOrderByRelevanceFieldEnum]


  export const InteracaoOrderByRelevanceFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    resumo: 'resumo',
    conteudoBruto: 'conteudoBruto'
  };

  export type InteracaoOrderByRelevanceFieldEnum = (typeof InteracaoOrderByRelevanceFieldEnum)[keyof typeof InteracaoOrderByRelevanceFieldEnum]


  export const OportunidadeOrderByRelevanceFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    descricao: 'descricao',
    responsavelId: 'responsavelId'
  };

  export type OportunidadeOrderByRelevanceFieldEnum = (typeof OportunidadeOrderByRelevanceFieldEnum)[keyof typeof OportunidadeOrderByRelevanceFieldEnum]


  export const MensagemOrderByRelevanceFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    conteudoSugerido: 'conteudoSugerido',
    conteudoFinal: 'conteudoFinal',
    aprovadorId: 'aprovadorId',
    canalEnvio: 'canalEnvio',
    justificativaRejeicao: 'justificativaRejeicao'
  };

  export type MensagemOrderByRelevanceFieldEnum = (typeof MensagemOrderByRelevanceFieldEnum)[keyof typeof MensagemOrderByRelevanceFieldEnum]


  export const ExecucaoApiOrderByRelevanceFieldEnum: {
    id: 'id',
    clienteId: 'clienteId',
    mensagemErro: 'mensagemErro'
  };

  export type ExecucaoApiOrderByRelevanceFieldEnum = (typeof ExecucaoApiOrderByRelevanceFieldEnum)[keyof typeof ExecucaoApiOrderByRelevanceFieldEnum]


  export const KpiSnapshotOrderByRelevanceFieldEnum: {
    id: 'id',
    nomeKpi: 'nomeKpi'
  };

  export type KpiSnapshotOrderByRelevanceFieldEnum = (typeof KpiSnapshotOrderByRelevanceFieldEnum)[keyof typeof KpiSnapshotOrderByRelevanceFieldEnum]


  export const IntegrationCredentialOrderByRelevanceFieldEnum: {
    id: 'id',
    provider: 'provider',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken'
  };

  export type IntegrationCredentialOrderByRelevanceFieldEnum = (typeof IntegrationCredentialOrderByRelevanceFieldEnum)[keyof typeof IntegrationCredentialOrderByRelevanceFieldEnum]


  export const SyncStateOrderByRelevanceFieldEnum: {
    id: 'id',
    provider: 'provider',
    cursor: 'cursor'
  };

  export type SyncStateOrderByRelevanceFieldEnum = (typeof SyncStateOrderByRelevanceFieldEnum)[keyof typeof SyncStateOrderByRelevanceFieldEnum]


  export const RegraClassificacaoOrderByRelevanceFieldEnum: {
    id: 'id',
    nome: 'nome'
  };

  export type RegraClassificacaoOrderByRelevanceFieldEnum = (typeof RegraClassificacaoOrderByRelevanceFieldEnum)[keyof typeof RegraClassificacaoOrderByRelevanceFieldEnum]


  export const TemplateMensagemOrderByRelevanceFieldEnum: {
    id: 'id',
    nome: 'nome',
    corpo: 'corpo'
  };

  export type TemplateMensagemOrderByRelevanceFieldEnum = (typeof TemplateMensagemOrderByRelevanceFieldEnum)[keyof typeof TemplateMensagemOrderByRelevanceFieldEnum]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'PerfilUsuario'
   */
  export type EnumPerfilUsuarioFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PerfilUsuario'>
    


  /**
   * Reference to a field of type 'StatusUsuario'
   */
  export type EnumStatusUsuarioFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StatusUsuario'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'TipoCliente'
   */
  export type EnumTipoClienteFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoCliente'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'StatusRelacionamento'
   */
  export type EnumStatusRelacionamentoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StatusRelacionamento'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'OrigemPedido'
   */
  export type EnumOrigemPedidoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrigemPedido'>
    


  /**
   * Reference to a field of type 'TipoInteracao'
   */
  export type EnumTipoInteracaoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoInteracao'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'TipoOportunidade'
   */
  export type EnumTipoOportunidadeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoOportunidade'>
    


  /**
   * Reference to a field of type 'PrioridadeOportunidade'
   */
  export type EnumPrioridadeOportunidadeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PrioridadeOportunidade'>
    


  /**
   * Reference to a field of type 'StatusOportunidade'
   */
  export type EnumStatusOportunidadeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StatusOportunidade'>
    


  /**
   * Reference to a field of type 'TipoMensagem'
   */
  export type EnumTipoMensagemFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoMensagem'>
    


  /**
   * Reference to a field of type 'StatusEnvioMensagem'
   */
  export type EnumStatusEnvioMensagemFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StatusEnvioMensagem'>
    


  /**
   * Reference to a field of type 'AcaoApi'
   */
  export type EnumAcaoApiFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AcaoApi'>
    


  /**
   * Reference to a field of type 'StatusExecucaoApi'
   */
  export type EnumStatusExecucaoApiFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StatusExecucaoApi'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'PeriodoKpi'
   */
  export type EnumPeriodoKpiFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PeriodoKpi'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UsuarioWhereInput = {
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    id?: StringFilter<"Usuario"> | string
    nome?: StringFilter<"Usuario"> | string
    email?: StringFilter<"Usuario"> | string
    senhaHash?: StringFilter<"Usuario"> | string
    perfil?: EnumPerfilUsuarioFilter<"Usuario"> | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFilter<"Usuario"> | $Enums.StatusUsuario
    dataCadastro?: DateTimeFilter<"Usuario"> | Date | string
    mensagens?: MensagemListRelationFilter
    refreshTokens?: RefreshTokenListRelationFilter
    oportunidades?: OportunidadeListRelationFilter
  }

  export type UsuarioOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    email?: SortOrder
    senhaHash?: SortOrder
    perfil?: SortOrder
    status?: SortOrder
    dataCadastro?: SortOrder
    mensagens?: MensagemOrderByRelationAggregateInput
    refreshTokens?: RefreshTokenOrderByRelationAggregateInput
    oportunidades?: OportunidadeOrderByRelationAggregateInput
    _relevance?: UsuarioOrderByRelevanceInput
  }

  export type UsuarioWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    nome?: StringFilter<"Usuario"> | string
    senhaHash?: StringFilter<"Usuario"> | string
    perfil?: EnumPerfilUsuarioFilter<"Usuario"> | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFilter<"Usuario"> | $Enums.StatusUsuario
    dataCadastro?: DateTimeFilter<"Usuario"> | Date | string
    mensagens?: MensagemListRelationFilter
    refreshTokens?: RefreshTokenListRelationFilter
    oportunidades?: OportunidadeListRelationFilter
  }, "id" | "email">

  export type UsuarioOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    email?: SortOrder
    senhaHash?: SortOrder
    perfil?: SortOrder
    status?: SortOrder
    dataCadastro?: SortOrder
    _count?: UsuarioCountOrderByAggregateInput
    _max?: UsuarioMaxOrderByAggregateInput
    _min?: UsuarioMinOrderByAggregateInput
  }

  export type UsuarioScalarWhereWithAggregatesInput = {
    AND?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    OR?: UsuarioScalarWhereWithAggregatesInput[]
    NOT?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Usuario"> | string
    nome?: StringWithAggregatesFilter<"Usuario"> | string
    email?: StringWithAggregatesFilter<"Usuario"> | string
    senhaHash?: StringWithAggregatesFilter<"Usuario"> | string
    perfil?: EnumPerfilUsuarioWithAggregatesFilter<"Usuario"> | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioWithAggregatesFilter<"Usuario"> | $Enums.StatusUsuario
    dataCadastro?: DateTimeWithAggregatesFilter<"Usuario"> | Date | string
  }

  export type RefreshTokenWhereInput = {
    AND?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    OR?: RefreshTokenWhereInput[]
    NOT?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    id?: StringFilter<"RefreshToken"> | string
    usuarioId?: StringFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    expiresEm?: DateTimeFilter<"RefreshToken"> | Date | string
    revogadoEm?: DateTimeNullableFilter<"RefreshToken"> | Date | string | null
    usuario?: XOR<UsuarioScalarRelationFilter, UsuarioWhereInput>
  }

  export type RefreshTokenOrderByWithRelationInput = {
    id?: SortOrder
    usuarioId?: SortOrder
    tokenHash?: SortOrder
    expiresEm?: SortOrder
    revogadoEm?: SortOrderInput | SortOrder
    usuario?: UsuarioOrderByWithRelationInput
    _relevance?: RefreshTokenOrderByRelevanceInput
  }

  export type RefreshTokenWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    OR?: RefreshTokenWhereInput[]
    NOT?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    usuarioId?: StringFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    expiresEm?: DateTimeFilter<"RefreshToken"> | Date | string
    revogadoEm?: DateTimeNullableFilter<"RefreshToken"> | Date | string | null
    usuario?: XOR<UsuarioScalarRelationFilter, UsuarioWhereInput>
  }, "id">

  export type RefreshTokenOrderByWithAggregationInput = {
    id?: SortOrder
    usuarioId?: SortOrder
    tokenHash?: SortOrder
    expiresEm?: SortOrder
    revogadoEm?: SortOrderInput | SortOrder
    _count?: RefreshTokenCountOrderByAggregateInput
    _max?: RefreshTokenMaxOrderByAggregateInput
    _min?: RefreshTokenMinOrderByAggregateInput
  }

  export type RefreshTokenScalarWhereWithAggregatesInput = {
    AND?: RefreshTokenScalarWhereWithAggregatesInput | RefreshTokenScalarWhereWithAggregatesInput[]
    OR?: RefreshTokenScalarWhereWithAggregatesInput[]
    NOT?: RefreshTokenScalarWhereWithAggregatesInput | RefreshTokenScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RefreshToken"> | string
    usuarioId?: StringWithAggregatesFilter<"RefreshToken"> | string
    tokenHash?: StringWithAggregatesFilter<"RefreshToken"> | string
    expiresEm?: DateTimeWithAggregatesFilter<"RefreshToken"> | Date | string
    revogadoEm?: DateTimeNullableWithAggregatesFilter<"RefreshToken"> | Date | string | null
  }

  export type ClienteWhereInput = {
    AND?: ClienteWhereInput | ClienteWhereInput[]
    OR?: ClienteWhereInput[]
    NOT?: ClienteWhereInput | ClienteWhereInput[]
    id?: StringFilter<"Cliente"> | string
    externalId?: StringNullableFilter<"Cliente"> | string | null
    nome?: StringFilter<"Cliente"> | string
    tipo?: EnumTipoClienteFilter<"Cliente"> | $Enums.TipoCliente
    cnpjCpf?: StringNullableFilter<"Cliente"> | string | null
    endereco?: StringNullableFilter<"Cliente"> | string | null
    contatoPrincipal?: StringNullableFilter<"Cliente"> | string | null
    emailPrincipal?: StringNullableFilter<"Cliente"> | string | null
    telefoneWhatsapp?: StringNullableFilter<"Cliente"> | string | null
    scoreComercial?: DecimalNullableFilter<"Cliente"> | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFilter<"Cliente"> | $Enums.StatusRelacionamento
    tags?: JsonFilter<"Cliente">
    urlInstagram?: StringNullableFilter<"Cliente"> | string | null
    urlSite?: StringNullableFilter<"Cliente"> | string | null
    dataCadastro?: DateTimeFilter<"Cliente"> | Date | string
    dataUltimaAtualizacao?: DateTimeFilter<"Cliente"> | Date | string
    pedidos?: PedidoListRelationFilter
    interacoes?: InteracaoListRelationFilter
    oportunidades?: OportunidadeListRelationFilter
    mensagens?: MensagemListRelationFilter
    execucoes?: ExecucaoApiListRelationFilter
  }

  export type ClienteOrderByWithRelationInput = {
    id?: SortOrder
    externalId?: SortOrderInput | SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    cnpjCpf?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    contatoPrincipal?: SortOrderInput | SortOrder
    emailPrincipal?: SortOrderInput | SortOrder
    telefoneWhatsapp?: SortOrderInput | SortOrder
    scoreComercial?: SortOrderInput | SortOrder
    statusRelacionamento?: SortOrder
    tags?: SortOrder
    urlInstagram?: SortOrderInput | SortOrder
    urlSite?: SortOrderInput | SortOrder
    dataCadastro?: SortOrder
    dataUltimaAtualizacao?: SortOrder
    pedidos?: PedidoOrderByRelationAggregateInput
    interacoes?: InteracaoOrderByRelationAggregateInput
    oportunidades?: OportunidadeOrderByRelationAggregateInput
    mensagens?: MensagemOrderByRelationAggregateInput
    execucoes?: ExecucaoApiOrderByRelationAggregateInput
    _relevance?: ClienteOrderByRelevanceInput
  }

  export type ClienteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    externalId?: string
    AND?: ClienteWhereInput | ClienteWhereInput[]
    OR?: ClienteWhereInput[]
    NOT?: ClienteWhereInput | ClienteWhereInput[]
    nome?: StringFilter<"Cliente"> | string
    tipo?: EnumTipoClienteFilter<"Cliente"> | $Enums.TipoCliente
    cnpjCpf?: StringNullableFilter<"Cliente"> | string | null
    endereco?: StringNullableFilter<"Cliente"> | string | null
    contatoPrincipal?: StringNullableFilter<"Cliente"> | string | null
    emailPrincipal?: StringNullableFilter<"Cliente"> | string | null
    telefoneWhatsapp?: StringNullableFilter<"Cliente"> | string | null
    scoreComercial?: DecimalNullableFilter<"Cliente"> | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFilter<"Cliente"> | $Enums.StatusRelacionamento
    tags?: JsonFilter<"Cliente">
    urlInstagram?: StringNullableFilter<"Cliente"> | string | null
    urlSite?: StringNullableFilter<"Cliente"> | string | null
    dataCadastro?: DateTimeFilter<"Cliente"> | Date | string
    dataUltimaAtualizacao?: DateTimeFilter<"Cliente"> | Date | string
    pedidos?: PedidoListRelationFilter
    interacoes?: InteracaoListRelationFilter
    oportunidades?: OportunidadeListRelationFilter
    mensagens?: MensagemListRelationFilter
    execucoes?: ExecucaoApiListRelationFilter
  }, "id" | "externalId">

  export type ClienteOrderByWithAggregationInput = {
    id?: SortOrder
    externalId?: SortOrderInput | SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    cnpjCpf?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    contatoPrincipal?: SortOrderInput | SortOrder
    emailPrincipal?: SortOrderInput | SortOrder
    telefoneWhatsapp?: SortOrderInput | SortOrder
    scoreComercial?: SortOrderInput | SortOrder
    statusRelacionamento?: SortOrder
    tags?: SortOrder
    urlInstagram?: SortOrderInput | SortOrder
    urlSite?: SortOrderInput | SortOrder
    dataCadastro?: SortOrder
    dataUltimaAtualizacao?: SortOrder
    _count?: ClienteCountOrderByAggregateInput
    _avg?: ClienteAvgOrderByAggregateInput
    _max?: ClienteMaxOrderByAggregateInput
    _min?: ClienteMinOrderByAggregateInput
    _sum?: ClienteSumOrderByAggregateInput
  }

  export type ClienteScalarWhereWithAggregatesInput = {
    AND?: ClienteScalarWhereWithAggregatesInput | ClienteScalarWhereWithAggregatesInput[]
    OR?: ClienteScalarWhereWithAggregatesInput[]
    NOT?: ClienteScalarWhereWithAggregatesInput | ClienteScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Cliente"> | string
    externalId?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    nome?: StringWithAggregatesFilter<"Cliente"> | string
    tipo?: EnumTipoClienteWithAggregatesFilter<"Cliente"> | $Enums.TipoCliente
    cnpjCpf?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    endereco?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    contatoPrincipal?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    emailPrincipal?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    telefoneWhatsapp?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    scoreComercial?: DecimalNullableWithAggregatesFilter<"Cliente"> | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoWithAggregatesFilter<"Cliente"> | $Enums.StatusRelacionamento
    tags?: JsonWithAggregatesFilter<"Cliente">
    urlInstagram?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    urlSite?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    dataCadastro?: DateTimeWithAggregatesFilter<"Cliente"> | Date | string
    dataUltimaAtualizacao?: DateTimeWithAggregatesFilter<"Cliente"> | Date | string
  }

  export type PedidoWhereInput = {
    AND?: PedidoWhereInput | PedidoWhereInput[]
    OR?: PedidoWhereInput[]
    NOT?: PedidoWhereInput | PedidoWhereInput[]
    id?: StringFilter<"Pedido"> | string
    externalId?: StringNullableFilter<"Pedido"> | string | null
    clienteId?: StringFilter<"Pedido"> | string
    dataPedido?: DateTimeFilter<"Pedido"> | Date | string
    valorTotal?: DecimalFilter<"Pedido"> | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFilter<"Pedido"> | string
    origemPedido?: EnumOrigemPedidoFilter<"Pedido"> | $Enums.OrigemPedido
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    itens?: ItemPedidoListRelationFilter
  }

  export type PedidoOrderByWithRelationInput = {
    id?: SortOrder
    externalId?: SortOrderInput | SortOrder
    clienteId?: SortOrder
    dataPedido?: SortOrder
    valorTotal?: SortOrder
    statusPedido?: SortOrder
    origemPedido?: SortOrder
    cliente?: ClienteOrderByWithRelationInput
    itens?: ItemPedidoOrderByRelationAggregateInput
    _relevance?: PedidoOrderByRelevanceInput
  }

  export type PedidoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    externalId?: string
    AND?: PedidoWhereInput | PedidoWhereInput[]
    OR?: PedidoWhereInput[]
    NOT?: PedidoWhereInput | PedidoWhereInput[]
    clienteId?: StringFilter<"Pedido"> | string
    dataPedido?: DateTimeFilter<"Pedido"> | Date | string
    valorTotal?: DecimalFilter<"Pedido"> | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFilter<"Pedido"> | string
    origemPedido?: EnumOrigemPedidoFilter<"Pedido"> | $Enums.OrigemPedido
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    itens?: ItemPedidoListRelationFilter
  }, "id" | "externalId">

  export type PedidoOrderByWithAggregationInput = {
    id?: SortOrder
    externalId?: SortOrderInput | SortOrder
    clienteId?: SortOrder
    dataPedido?: SortOrder
    valorTotal?: SortOrder
    statusPedido?: SortOrder
    origemPedido?: SortOrder
    _count?: PedidoCountOrderByAggregateInput
    _avg?: PedidoAvgOrderByAggregateInput
    _max?: PedidoMaxOrderByAggregateInput
    _min?: PedidoMinOrderByAggregateInput
    _sum?: PedidoSumOrderByAggregateInput
  }

  export type PedidoScalarWhereWithAggregatesInput = {
    AND?: PedidoScalarWhereWithAggregatesInput | PedidoScalarWhereWithAggregatesInput[]
    OR?: PedidoScalarWhereWithAggregatesInput[]
    NOT?: PedidoScalarWhereWithAggregatesInput | PedidoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Pedido"> | string
    externalId?: StringNullableWithAggregatesFilter<"Pedido"> | string | null
    clienteId?: StringWithAggregatesFilter<"Pedido"> | string
    dataPedido?: DateTimeWithAggregatesFilter<"Pedido"> | Date | string
    valorTotal?: DecimalWithAggregatesFilter<"Pedido"> | Decimal | DecimalJsLike | number | string
    statusPedido?: StringWithAggregatesFilter<"Pedido"> | string
    origemPedido?: EnumOrigemPedidoWithAggregatesFilter<"Pedido"> | $Enums.OrigemPedido
  }

  export type ItemPedidoWhereInput = {
    AND?: ItemPedidoWhereInput | ItemPedidoWhereInput[]
    OR?: ItemPedidoWhereInput[]
    NOT?: ItemPedidoWhereInput | ItemPedidoWhereInput[]
    id?: StringFilter<"ItemPedido"> | string
    pedidoId?: StringFilter<"ItemPedido"> | string
    sku?: StringNullableFilter<"ItemPedido"> | string | null
    produto?: StringFilter<"ItemPedido"> | string
    categoria?: StringNullableFilter<"ItemPedido"> | string | null
    quantidade?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    pedido?: XOR<PedidoScalarRelationFilter, PedidoWhereInput>
  }

  export type ItemPedidoOrderByWithRelationInput = {
    id?: SortOrder
    pedidoId?: SortOrder
    sku?: SortOrderInput | SortOrder
    produto?: SortOrder
    categoria?: SortOrderInput | SortOrder
    quantidade?: SortOrder
    precoUnit?: SortOrder
    pedido?: PedidoOrderByWithRelationInput
    _relevance?: ItemPedidoOrderByRelevanceInput
  }

  export type ItemPedidoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ItemPedidoWhereInput | ItemPedidoWhereInput[]
    OR?: ItemPedidoWhereInput[]
    NOT?: ItemPedidoWhereInput | ItemPedidoWhereInput[]
    pedidoId?: StringFilter<"ItemPedido"> | string
    sku?: StringNullableFilter<"ItemPedido"> | string | null
    produto?: StringFilter<"ItemPedido"> | string
    categoria?: StringNullableFilter<"ItemPedido"> | string | null
    quantidade?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    pedido?: XOR<PedidoScalarRelationFilter, PedidoWhereInput>
  }, "id">

  export type ItemPedidoOrderByWithAggregationInput = {
    id?: SortOrder
    pedidoId?: SortOrder
    sku?: SortOrderInput | SortOrder
    produto?: SortOrder
    categoria?: SortOrderInput | SortOrder
    quantidade?: SortOrder
    precoUnit?: SortOrder
    _count?: ItemPedidoCountOrderByAggregateInput
    _avg?: ItemPedidoAvgOrderByAggregateInput
    _max?: ItemPedidoMaxOrderByAggregateInput
    _min?: ItemPedidoMinOrderByAggregateInput
    _sum?: ItemPedidoSumOrderByAggregateInput
  }

  export type ItemPedidoScalarWhereWithAggregatesInput = {
    AND?: ItemPedidoScalarWhereWithAggregatesInput | ItemPedidoScalarWhereWithAggregatesInput[]
    OR?: ItemPedidoScalarWhereWithAggregatesInput[]
    NOT?: ItemPedidoScalarWhereWithAggregatesInput | ItemPedidoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ItemPedido"> | string
    pedidoId?: StringWithAggregatesFilter<"ItemPedido"> | string
    sku?: StringNullableWithAggregatesFilter<"ItemPedido"> | string | null
    produto?: StringWithAggregatesFilter<"ItemPedido"> | string
    categoria?: StringNullableWithAggregatesFilter<"ItemPedido"> | string | null
    quantidade?: DecimalWithAggregatesFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalWithAggregatesFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
  }

  export type InteracaoWhereInput = {
    AND?: InteracaoWhereInput | InteracaoWhereInput[]
    OR?: InteracaoWhereInput[]
    NOT?: InteracaoWhereInput | InteracaoWhereInput[]
    id?: StringFilter<"Interacao"> | string
    clienteId?: StringFilter<"Interacao"> | string
    tipoInteracao?: EnumTipoInteracaoFilter<"Interacao"> | $Enums.TipoInteracao
    dataInteracao?: DateTimeFilter<"Interacao"> | Date | string
    resumo?: StringNullableFilter<"Interacao"> | string | null
    sentimento?: DecimalNullableFilter<"Interacao"> | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFilter<"Interacao"> | boolean
    riscoDetectado?: BoolFilter<"Interacao"> | boolean
    conteudoBruto?: StringNullableFilter<"Interacao"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
  }

  export type InteracaoOrderByWithRelationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoInteracao?: SortOrder
    dataInteracao?: SortOrder
    resumo?: SortOrderInput | SortOrder
    sentimento?: SortOrderInput | SortOrder
    oportunidadeDetectada?: SortOrder
    riscoDetectado?: SortOrder
    conteudoBruto?: SortOrderInput | SortOrder
    cliente?: ClienteOrderByWithRelationInput
    _relevance?: InteracaoOrderByRelevanceInput
  }

  export type InteracaoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InteracaoWhereInput | InteracaoWhereInput[]
    OR?: InteracaoWhereInput[]
    NOT?: InteracaoWhereInput | InteracaoWhereInput[]
    clienteId?: StringFilter<"Interacao"> | string
    tipoInteracao?: EnumTipoInteracaoFilter<"Interacao"> | $Enums.TipoInteracao
    dataInteracao?: DateTimeFilter<"Interacao"> | Date | string
    resumo?: StringNullableFilter<"Interacao"> | string | null
    sentimento?: DecimalNullableFilter<"Interacao"> | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFilter<"Interacao"> | boolean
    riscoDetectado?: BoolFilter<"Interacao"> | boolean
    conteudoBruto?: StringNullableFilter<"Interacao"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
  }, "id">

  export type InteracaoOrderByWithAggregationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoInteracao?: SortOrder
    dataInteracao?: SortOrder
    resumo?: SortOrderInput | SortOrder
    sentimento?: SortOrderInput | SortOrder
    oportunidadeDetectada?: SortOrder
    riscoDetectado?: SortOrder
    conteudoBruto?: SortOrderInput | SortOrder
    _count?: InteracaoCountOrderByAggregateInput
    _avg?: InteracaoAvgOrderByAggregateInput
    _max?: InteracaoMaxOrderByAggregateInput
    _min?: InteracaoMinOrderByAggregateInput
    _sum?: InteracaoSumOrderByAggregateInput
  }

  export type InteracaoScalarWhereWithAggregatesInput = {
    AND?: InteracaoScalarWhereWithAggregatesInput | InteracaoScalarWhereWithAggregatesInput[]
    OR?: InteracaoScalarWhereWithAggregatesInput[]
    NOT?: InteracaoScalarWhereWithAggregatesInput | InteracaoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Interacao"> | string
    clienteId?: StringWithAggregatesFilter<"Interacao"> | string
    tipoInteracao?: EnumTipoInteracaoWithAggregatesFilter<"Interacao"> | $Enums.TipoInteracao
    dataInteracao?: DateTimeWithAggregatesFilter<"Interacao"> | Date | string
    resumo?: StringNullableWithAggregatesFilter<"Interacao"> | string | null
    sentimento?: DecimalNullableWithAggregatesFilter<"Interacao"> | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolWithAggregatesFilter<"Interacao"> | boolean
    riscoDetectado?: BoolWithAggregatesFilter<"Interacao"> | boolean
    conteudoBruto?: StringNullableWithAggregatesFilter<"Interacao"> | string | null
  }

  export type OportunidadeWhereInput = {
    AND?: OportunidadeWhereInput | OportunidadeWhereInput[]
    OR?: OportunidadeWhereInput[]
    NOT?: OportunidadeWhereInput | OportunidadeWhereInput[]
    id?: StringFilter<"Oportunidade"> | string
    clienteId?: StringFilter<"Oportunidade"> | string
    tipoOportunidade?: EnumTipoOportunidadeFilter<"Oportunidade"> | $Enums.TipoOportunidade
    descricao?: StringFilter<"Oportunidade"> | string
    valorEstimado?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFilter<"Oportunidade"> | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFilter<"Oportunidade"> | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFilter<"Oportunidade"> | Date | string
    dataFechamento?: DateTimeNullableFilter<"Oportunidade"> | Date | string | null
    responsavelId?: StringNullableFilter<"Oportunidade"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    responsavel?: XOR<UsuarioNullableScalarRelationFilter, UsuarioWhereInput> | null
  }

  export type OportunidadeOrderByWithRelationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoOportunidade?: SortOrder
    descricao?: SortOrder
    valorEstimado?: SortOrderInput | SortOrder
    probabilidadeConversao?: SortOrderInput | SortOrder
    prioridade?: SortOrder
    statusOportunidade?: SortOrder
    dataCriacao?: SortOrder
    dataFechamento?: SortOrderInput | SortOrder
    responsavelId?: SortOrderInput | SortOrder
    cliente?: ClienteOrderByWithRelationInput
    responsavel?: UsuarioOrderByWithRelationInput
    _relevance?: OportunidadeOrderByRelevanceInput
  }

  export type OportunidadeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OportunidadeWhereInput | OportunidadeWhereInput[]
    OR?: OportunidadeWhereInput[]
    NOT?: OportunidadeWhereInput | OportunidadeWhereInput[]
    clienteId?: StringFilter<"Oportunidade"> | string
    tipoOportunidade?: EnumTipoOportunidadeFilter<"Oportunidade"> | $Enums.TipoOportunidade
    descricao?: StringFilter<"Oportunidade"> | string
    valorEstimado?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFilter<"Oportunidade"> | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFilter<"Oportunidade"> | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFilter<"Oportunidade"> | Date | string
    dataFechamento?: DateTimeNullableFilter<"Oportunidade"> | Date | string | null
    responsavelId?: StringNullableFilter<"Oportunidade"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    responsavel?: XOR<UsuarioNullableScalarRelationFilter, UsuarioWhereInput> | null
  }, "id">

  export type OportunidadeOrderByWithAggregationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoOportunidade?: SortOrder
    descricao?: SortOrder
    valorEstimado?: SortOrderInput | SortOrder
    probabilidadeConversao?: SortOrderInput | SortOrder
    prioridade?: SortOrder
    statusOportunidade?: SortOrder
    dataCriacao?: SortOrder
    dataFechamento?: SortOrderInput | SortOrder
    responsavelId?: SortOrderInput | SortOrder
    _count?: OportunidadeCountOrderByAggregateInput
    _avg?: OportunidadeAvgOrderByAggregateInput
    _max?: OportunidadeMaxOrderByAggregateInput
    _min?: OportunidadeMinOrderByAggregateInput
    _sum?: OportunidadeSumOrderByAggregateInput
  }

  export type OportunidadeScalarWhereWithAggregatesInput = {
    AND?: OportunidadeScalarWhereWithAggregatesInput | OportunidadeScalarWhereWithAggregatesInput[]
    OR?: OportunidadeScalarWhereWithAggregatesInput[]
    NOT?: OportunidadeScalarWhereWithAggregatesInput | OportunidadeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Oportunidade"> | string
    clienteId?: StringWithAggregatesFilter<"Oportunidade"> | string
    tipoOportunidade?: EnumTipoOportunidadeWithAggregatesFilter<"Oportunidade"> | $Enums.TipoOportunidade
    descricao?: StringWithAggregatesFilter<"Oportunidade"> | string
    valorEstimado?: DecimalNullableWithAggregatesFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: DecimalNullableWithAggregatesFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeWithAggregatesFilter<"Oportunidade"> | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeWithAggregatesFilter<"Oportunidade"> | $Enums.StatusOportunidade
    dataCriacao?: DateTimeWithAggregatesFilter<"Oportunidade"> | Date | string
    dataFechamento?: DateTimeNullableWithAggregatesFilter<"Oportunidade"> | Date | string | null
    responsavelId?: StringNullableWithAggregatesFilter<"Oportunidade"> | string | null
  }

  export type MensagemWhereInput = {
    AND?: MensagemWhereInput | MensagemWhereInput[]
    OR?: MensagemWhereInput[]
    NOT?: MensagemWhereInput | MensagemWhereInput[]
    id?: StringFilter<"Mensagem"> | string
    clienteId?: StringFilter<"Mensagem"> | string
    tipoMensagem?: EnumTipoMensagemFilter<"Mensagem"> | $Enums.TipoMensagem
    conteudoSugerido?: StringFilter<"Mensagem"> | string
    conteudoFinal?: StringNullableFilter<"Mensagem"> | string | null
    statusEnvio?: EnumStatusEnvioMensagemFilter<"Mensagem"> | $Enums.StatusEnvioMensagem
    sensivel?: BoolFilter<"Mensagem"> | boolean
    dataCriacao?: DateTimeFilter<"Mensagem"> | Date | string
    dataAprovacao?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    dataEnvio?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    aprovadorId?: StringNullableFilter<"Mensagem"> | string | null
    canalEnvio?: StringFilter<"Mensagem"> | string
    agendadoPara?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    justificativaRejeicao?: StringNullableFilter<"Mensagem"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    aprovador?: XOR<UsuarioNullableScalarRelationFilter, UsuarioWhereInput> | null
  }

  export type MensagemOrderByWithRelationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoMensagem?: SortOrder
    conteudoSugerido?: SortOrder
    conteudoFinal?: SortOrderInput | SortOrder
    statusEnvio?: SortOrder
    sensivel?: SortOrder
    dataCriacao?: SortOrder
    dataAprovacao?: SortOrderInput | SortOrder
    dataEnvio?: SortOrderInput | SortOrder
    aprovadorId?: SortOrderInput | SortOrder
    canalEnvio?: SortOrder
    agendadoPara?: SortOrderInput | SortOrder
    justificativaRejeicao?: SortOrderInput | SortOrder
    cliente?: ClienteOrderByWithRelationInput
    aprovador?: UsuarioOrderByWithRelationInput
    _relevance?: MensagemOrderByRelevanceInput
  }

  export type MensagemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MensagemWhereInput | MensagemWhereInput[]
    OR?: MensagemWhereInput[]
    NOT?: MensagemWhereInput | MensagemWhereInput[]
    clienteId?: StringFilter<"Mensagem"> | string
    tipoMensagem?: EnumTipoMensagemFilter<"Mensagem"> | $Enums.TipoMensagem
    conteudoSugerido?: StringFilter<"Mensagem"> | string
    conteudoFinal?: StringNullableFilter<"Mensagem"> | string | null
    statusEnvio?: EnumStatusEnvioMensagemFilter<"Mensagem"> | $Enums.StatusEnvioMensagem
    sensivel?: BoolFilter<"Mensagem"> | boolean
    dataCriacao?: DateTimeFilter<"Mensagem"> | Date | string
    dataAprovacao?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    dataEnvio?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    aprovadorId?: StringNullableFilter<"Mensagem"> | string | null
    canalEnvio?: StringFilter<"Mensagem"> | string
    agendadoPara?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    justificativaRejeicao?: StringNullableFilter<"Mensagem"> | string | null
    cliente?: XOR<ClienteScalarRelationFilter, ClienteWhereInput>
    aprovador?: XOR<UsuarioNullableScalarRelationFilter, UsuarioWhereInput> | null
  }, "id">

  export type MensagemOrderByWithAggregationInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoMensagem?: SortOrder
    conteudoSugerido?: SortOrder
    conteudoFinal?: SortOrderInput | SortOrder
    statusEnvio?: SortOrder
    sensivel?: SortOrder
    dataCriacao?: SortOrder
    dataAprovacao?: SortOrderInput | SortOrder
    dataEnvio?: SortOrderInput | SortOrder
    aprovadorId?: SortOrderInput | SortOrder
    canalEnvio?: SortOrder
    agendadoPara?: SortOrderInput | SortOrder
    justificativaRejeicao?: SortOrderInput | SortOrder
    _count?: MensagemCountOrderByAggregateInput
    _max?: MensagemMaxOrderByAggregateInput
    _min?: MensagemMinOrderByAggregateInput
  }

  export type MensagemScalarWhereWithAggregatesInput = {
    AND?: MensagemScalarWhereWithAggregatesInput | MensagemScalarWhereWithAggregatesInput[]
    OR?: MensagemScalarWhereWithAggregatesInput[]
    NOT?: MensagemScalarWhereWithAggregatesInput | MensagemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Mensagem"> | string
    clienteId?: StringWithAggregatesFilter<"Mensagem"> | string
    tipoMensagem?: EnumTipoMensagemWithAggregatesFilter<"Mensagem"> | $Enums.TipoMensagem
    conteudoSugerido?: StringWithAggregatesFilter<"Mensagem"> | string
    conteudoFinal?: StringNullableWithAggregatesFilter<"Mensagem"> | string | null
    statusEnvio?: EnumStatusEnvioMensagemWithAggregatesFilter<"Mensagem"> | $Enums.StatusEnvioMensagem
    sensivel?: BoolWithAggregatesFilter<"Mensagem"> | boolean
    dataCriacao?: DateTimeWithAggregatesFilter<"Mensagem"> | Date | string
    dataAprovacao?: DateTimeNullableWithAggregatesFilter<"Mensagem"> | Date | string | null
    dataEnvio?: DateTimeNullableWithAggregatesFilter<"Mensagem"> | Date | string | null
    aprovadorId?: StringNullableWithAggregatesFilter<"Mensagem"> | string | null
    canalEnvio?: StringWithAggregatesFilter<"Mensagem"> | string
    agendadoPara?: DateTimeNullableWithAggregatesFilter<"Mensagem"> | Date | string | null
    justificativaRejeicao?: StringNullableWithAggregatesFilter<"Mensagem"> | string | null
  }

  export type ExecucaoApiWhereInput = {
    AND?: ExecucaoApiWhereInput | ExecucaoApiWhereInput[]
    OR?: ExecucaoApiWhereInput[]
    NOT?: ExecucaoApiWhereInput | ExecucaoApiWhereInput[]
    id?: StringFilter<"ExecucaoApi"> | string
    acaoApi?: EnumAcaoApiFilter<"ExecucaoApi"> | $Enums.AcaoApi
    dataExecucao?: DateTimeFilter<"ExecucaoApi"> | Date | string
    statusExecucao?: EnumStatusExecucaoApiFilter<"ExecucaoApi"> | $Enums.StatusExecucaoApi
    clienteId?: StringNullableFilter<"ExecucaoApi"> | string | null
    detalhesExecucao?: JsonFilter<"ExecucaoApi">
    mensagemErro?: StringNullableFilter<"ExecucaoApi"> | string | null
    duracaoMs?: IntNullableFilter<"ExecucaoApi"> | number | null
    cliente?: XOR<ClienteNullableScalarRelationFilter, ClienteWhereInput> | null
  }

  export type ExecucaoApiOrderByWithRelationInput = {
    id?: SortOrder
    acaoApi?: SortOrder
    dataExecucao?: SortOrder
    statusExecucao?: SortOrder
    clienteId?: SortOrderInput | SortOrder
    detalhesExecucao?: SortOrder
    mensagemErro?: SortOrderInput | SortOrder
    duracaoMs?: SortOrderInput | SortOrder
    cliente?: ClienteOrderByWithRelationInput
    _relevance?: ExecucaoApiOrderByRelevanceInput
  }

  export type ExecucaoApiWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ExecucaoApiWhereInput | ExecucaoApiWhereInput[]
    OR?: ExecucaoApiWhereInput[]
    NOT?: ExecucaoApiWhereInput | ExecucaoApiWhereInput[]
    acaoApi?: EnumAcaoApiFilter<"ExecucaoApi"> | $Enums.AcaoApi
    dataExecucao?: DateTimeFilter<"ExecucaoApi"> | Date | string
    statusExecucao?: EnumStatusExecucaoApiFilter<"ExecucaoApi"> | $Enums.StatusExecucaoApi
    clienteId?: StringNullableFilter<"ExecucaoApi"> | string | null
    detalhesExecucao?: JsonFilter<"ExecucaoApi">
    mensagemErro?: StringNullableFilter<"ExecucaoApi"> | string | null
    duracaoMs?: IntNullableFilter<"ExecucaoApi"> | number | null
    cliente?: XOR<ClienteNullableScalarRelationFilter, ClienteWhereInput> | null
  }, "id">

  export type ExecucaoApiOrderByWithAggregationInput = {
    id?: SortOrder
    acaoApi?: SortOrder
    dataExecucao?: SortOrder
    statusExecucao?: SortOrder
    clienteId?: SortOrderInput | SortOrder
    detalhesExecucao?: SortOrder
    mensagemErro?: SortOrderInput | SortOrder
    duracaoMs?: SortOrderInput | SortOrder
    _count?: ExecucaoApiCountOrderByAggregateInput
    _avg?: ExecucaoApiAvgOrderByAggregateInput
    _max?: ExecucaoApiMaxOrderByAggregateInput
    _min?: ExecucaoApiMinOrderByAggregateInput
    _sum?: ExecucaoApiSumOrderByAggregateInput
  }

  export type ExecucaoApiScalarWhereWithAggregatesInput = {
    AND?: ExecucaoApiScalarWhereWithAggregatesInput | ExecucaoApiScalarWhereWithAggregatesInput[]
    OR?: ExecucaoApiScalarWhereWithAggregatesInput[]
    NOT?: ExecucaoApiScalarWhereWithAggregatesInput | ExecucaoApiScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ExecucaoApi"> | string
    acaoApi?: EnumAcaoApiWithAggregatesFilter<"ExecucaoApi"> | $Enums.AcaoApi
    dataExecucao?: DateTimeWithAggregatesFilter<"ExecucaoApi"> | Date | string
    statusExecucao?: EnumStatusExecucaoApiWithAggregatesFilter<"ExecucaoApi"> | $Enums.StatusExecucaoApi
    clienteId?: StringNullableWithAggregatesFilter<"ExecucaoApi"> | string | null
    detalhesExecucao?: JsonWithAggregatesFilter<"ExecucaoApi">
    mensagemErro?: StringNullableWithAggregatesFilter<"ExecucaoApi"> | string | null
    duracaoMs?: IntNullableWithAggregatesFilter<"ExecucaoApi"> | number | null
  }

  export type KpiSnapshotWhereInput = {
    AND?: KpiSnapshotWhereInput | KpiSnapshotWhereInput[]
    OR?: KpiSnapshotWhereInput[]
    NOT?: KpiSnapshotWhereInput | KpiSnapshotWhereInput[]
    id?: StringFilter<"KpiSnapshot"> | string
    nomeKpi?: StringFilter<"KpiSnapshot"> | string
    valor?: DecimalFilter<"KpiSnapshot"> | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFilter<"KpiSnapshot"> | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFilter<"KpiSnapshot"> | Date | string
    payload?: JsonNullableFilter<"KpiSnapshot">
  }

  export type KpiSnapshotOrderByWithRelationInput = {
    id?: SortOrder
    nomeKpi?: SortOrder
    valor?: SortOrder
    periodo?: SortOrder
    dataReferencia?: SortOrder
    payload?: SortOrderInput | SortOrder
    _relevance?: KpiSnapshotOrderByRelevanceInput
  }

  export type KpiSnapshotWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    nomeKpi_periodo_dataReferencia?: KpiSnapshotNomeKpiPeriodoDataReferenciaCompoundUniqueInput
    AND?: KpiSnapshotWhereInput | KpiSnapshotWhereInput[]
    OR?: KpiSnapshotWhereInput[]
    NOT?: KpiSnapshotWhereInput | KpiSnapshotWhereInput[]
    nomeKpi?: StringFilter<"KpiSnapshot"> | string
    valor?: DecimalFilter<"KpiSnapshot"> | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFilter<"KpiSnapshot"> | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFilter<"KpiSnapshot"> | Date | string
    payload?: JsonNullableFilter<"KpiSnapshot">
  }, "id" | "nomeKpi_periodo_dataReferencia">

  export type KpiSnapshotOrderByWithAggregationInput = {
    id?: SortOrder
    nomeKpi?: SortOrder
    valor?: SortOrder
    periodo?: SortOrder
    dataReferencia?: SortOrder
    payload?: SortOrderInput | SortOrder
    _count?: KpiSnapshotCountOrderByAggregateInput
    _avg?: KpiSnapshotAvgOrderByAggregateInput
    _max?: KpiSnapshotMaxOrderByAggregateInput
    _min?: KpiSnapshotMinOrderByAggregateInput
    _sum?: KpiSnapshotSumOrderByAggregateInput
  }

  export type KpiSnapshotScalarWhereWithAggregatesInput = {
    AND?: KpiSnapshotScalarWhereWithAggregatesInput | KpiSnapshotScalarWhereWithAggregatesInput[]
    OR?: KpiSnapshotScalarWhereWithAggregatesInput[]
    NOT?: KpiSnapshotScalarWhereWithAggregatesInput | KpiSnapshotScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"KpiSnapshot"> | string
    nomeKpi?: StringWithAggregatesFilter<"KpiSnapshot"> | string
    valor?: DecimalWithAggregatesFilter<"KpiSnapshot"> | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiWithAggregatesFilter<"KpiSnapshot"> | $Enums.PeriodoKpi
    dataReferencia?: DateTimeWithAggregatesFilter<"KpiSnapshot"> | Date | string
    payload?: JsonNullableWithAggregatesFilter<"KpiSnapshot">
  }

  export type IntegrationCredentialWhereInput = {
    AND?: IntegrationCredentialWhereInput | IntegrationCredentialWhereInput[]
    OR?: IntegrationCredentialWhereInput[]
    NOT?: IntegrationCredentialWhereInput | IntegrationCredentialWhereInput[]
    id?: StringFilter<"IntegrationCredential"> | string
    provider?: StringFilter<"IntegrationCredential"> | string
    accessToken?: StringNullableFilter<"IntegrationCredential"> | string | null
    refreshToken?: StringNullableFilter<"IntegrationCredential"> | string | null
    expiresAt?: DateTimeNullableFilter<"IntegrationCredential"> | Date | string | null
    metadata?: JsonNullableFilter<"IntegrationCredential">
    atualizadoEm?: DateTimeFilter<"IntegrationCredential"> | Date | string
  }

  export type IntegrationCredentialOrderByWithRelationInput = {
    id?: SortOrder
    provider?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    atualizadoEm?: SortOrder
    _relevance?: IntegrationCredentialOrderByRelevanceInput
  }

  export type IntegrationCredentialWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    provider?: string
    AND?: IntegrationCredentialWhereInput | IntegrationCredentialWhereInput[]
    OR?: IntegrationCredentialWhereInput[]
    NOT?: IntegrationCredentialWhereInput | IntegrationCredentialWhereInput[]
    accessToken?: StringNullableFilter<"IntegrationCredential"> | string | null
    refreshToken?: StringNullableFilter<"IntegrationCredential"> | string | null
    expiresAt?: DateTimeNullableFilter<"IntegrationCredential"> | Date | string | null
    metadata?: JsonNullableFilter<"IntegrationCredential">
    atualizadoEm?: DateTimeFilter<"IntegrationCredential"> | Date | string
  }, "id" | "provider">

  export type IntegrationCredentialOrderByWithAggregationInput = {
    id?: SortOrder
    provider?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    atualizadoEm?: SortOrder
    _count?: IntegrationCredentialCountOrderByAggregateInput
    _max?: IntegrationCredentialMaxOrderByAggregateInput
    _min?: IntegrationCredentialMinOrderByAggregateInput
  }

  export type IntegrationCredentialScalarWhereWithAggregatesInput = {
    AND?: IntegrationCredentialScalarWhereWithAggregatesInput | IntegrationCredentialScalarWhereWithAggregatesInput[]
    OR?: IntegrationCredentialScalarWhereWithAggregatesInput[]
    NOT?: IntegrationCredentialScalarWhereWithAggregatesInput | IntegrationCredentialScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"IntegrationCredential"> | string
    provider?: StringWithAggregatesFilter<"IntegrationCredential"> | string
    accessToken?: StringNullableWithAggregatesFilter<"IntegrationCredential"> | string | null
    refreshToken?: StringNullableWithAggregatesFilter<"IntegrationCredential"> | string | null
    expiresAt?: DateTimeNullableWithAggregatesFilter<"IntegrationCredential"> | Date | string | null
    metadata?: JsonNullableWithAggregatesFilter<"IntegrationCredential">
    atualizadoEm?: DateTimeWithAggregatesFilter<"IntegrationCredential"> | Date | string
  }

  export type SyncStateWhereInput = {
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    id?: StringFilter<"SyncState"> | string
    provider?: StringFilter<"SyncState"> | string
    cursor?: StringNullableFilter<"SyncState"> | string | null
    lastSyncAt?: DateTimeNullableFilter<"SyncState"> | Date | string | null
  }

  export type SyncStateOrderByWithRelationInput = {
    id?: SortOrder
    provider?: SortOrder
    cursor?: SortOrderInput | SortOrder
    lastSyncAt?: SortOrderInput | SortOrder
    _relevance?: SyncStateOrderByRelevanceInput
  }

  export type SyncStateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    provider?: string
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    cursor?: StringNullableFilter<"SyncState"> | string | null
    lastSyncAt?: DateTimeNullableFilter<"SyncState"> | Date | string | null
  }, "id" | "provider">

  export type SyncStateOrderByWithAggregationInput = {
    id?: SortOrder
    provider?: SortOrder
    cursor?: SortOrderInput | SortOrder
    lastSyncAt?: SortOrderInput | SortOrder
    _count?: SyncStateCountOrderByAggregateInput
    _max?: SyncStateMaxOrderByAggregateInput
    _min?: SyncStateMinOrderByAggregateInput
  }

  export type SyncStateScalarWhereWithAggregatesInput = {
    AND?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    OR?: SyncStateScalarWhereWithAggregatesInput[]
    NOT?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SyncState"> | string
    provider?: StringWithAggregatesFilter<"SyncState"> | string
    cursor?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    lastSyncAt?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
  }

  export type RegraClassificacaoWhereInput = {
    AND?: RegraClassificacaoWhereInput | RegraClassificacaoWhereInput[]
    OR?: RegraClassificacaoWhereInput[]
    NOT?: RegraClassificacaoWhereInput | RegraClassificacaoWhereInput[]
    id?: StringFilter<"RegraClassificacao"> | string
    nome?: StringFilter<"RegraClassificacao"> | string
    payload?: JsonFilter<"RegraClassificacao">
    ativo?: BoolFilter<"RegraClassificacao"> | boolean
    criadoEm?: DateTimeFilter<"RegraClassificacao"> | Date | string
  }

  export type RegraClassificacaoOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    payload?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
    _relevance?: RegraClassificacaoOrderByRelevanceInput
  }

  export type RegraClassificacaoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RegraClassificacaoWhereInput | RegraClassificacaoWhereInput[]
    OR?: RegraClassificacaoWhereInput[]
    NOT?: RegraClassificacaoWhereInput | RegraClassificacaoWhereInput[]
    nome?: StringFilter<"RegraClassificacao"> | string
    payload?: JsonFilter<"RegraClassificacao">
    ativo?: BoolFilter<"RegraClassificacao"> | boolean
    criadoEm?: DateTimeFilter<"RegraClassificacao"> | Date | string
  }, "id">

  export type RegraClassificacaoOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    payload?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
    _count?: RegraClassificacaoCountOrderByAggregateInput
    _max?: RegraClassificacaoMaxOrderByAggregateInput
    _min?: RegraClassificacaoMinOrderByAggregateInput
  }

  export type RegraClassificacaoScalarWhereWithAggregatesInput = {
    AND?: RegraClassificacaoScalarWhereWithAggregatesInput | RegraClassificacaoScalarWhereWithAggregatesInput[]
    OR?: RegraClassificacaoScalarWhereWithAggregatesInput[]
    NOT?: RegraClassificacaoScalarWhereWithAggregatesInput | RegraClassificacaoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RegraClassificacao"> | string
    nome?: StringWithAggregatesFilter<"RegraClassificacao"> | string
    payload?: JsonWithAggregatesFilter<"RegraClassificacao">
    ativo?: BoolWithAggregatesFilter<"RegraClassificacao"> | boolean
    criadoEm?: DateTimeWithAggregatesFilter<"RegraClassificacao"> | Date | string
  }

  export type TemplateMensagemWhereInput = {
    AND?: TemplateMensagemWhereInput | TemplateMensagemWhereInput[]
    OR?: TemplateMensagemWhereInput[]
    NOT?: TemplateMensagemWhereInput | TemplateMensagemWhereInput[]
    id?: StringFilter<"TemplateMensagem"> | string
    nome?: StringFilter<"TemplateMensagem"> | string
    tipo?: EnumTipoMensagemFilter<"TemplateMensagem"> | $Enums.TipoMensagem
    corpo?: StringFilter<"TemplateMensagem"> | string
    ativo?: BoolFilter<"TemplateMensagem"> | boolean
    criadoEm?: DateTimeFilter<"TemplateMensagem"> | Date | string
  }

  export type TemplateMensagemOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    corpo?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
    _relevance?: TemplateMensagemOrderByRelevanceInput
  }

  export type TemplateMensagemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TemplateMensagemWhereInput | TemplateMensagemWhereInput[]
    OR?: TemplateMensagemWhereInput[]
    NOT?: TemplateMensagemWhereInput | TemplateMensagemWhereInput[]
    nome?: StringFilter<"TemplateMensagem"> | string
    tipo?: EnumTipoMensagemFilter<"TemplateMensagem"> | $Enums.TipoMensagem
    corpo?: StringFilter<"TemplateMensagem"> | string
    ativo?: BoolFilter<"TemplateMensagem"> | boolean
    criadoEm?: DateTimeFilter<"TemplateMensagem"> | Date | string
  }, "id">

  export type TemplateMensagemOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    corpo?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
    _count?: TemplateMensagemCountOrderByAggregateInput
    _max?: TemplateMensagemMaxOrderByAggregateInput
    _min?: TemplateMensagemMinOrderByAggregateInput
  }

  export type TemplateMensagemScalarWhereWithAggregatesInput = {
    AND?: TemplateMensagemScalarWhereWithAggregatesInput | TemplateMensagemScalarWhereWithAggregatesInput[]
    OR?: TemplateMensagemScalarWhereWithAggregatesInput[]
    NOT?: TemplateMensagemScalarWhereWithAggregatesInput | TemplateMensagemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TemplateMensagem"> | string
    nome?: StringWithAggregatesFilter<"TemplateMensagem"> | string
    tipo?: EnumTipoMensagemWithAggregatesFilter<"TemplateMensagem"> | $Enums.TipoMensagem
    corpo?: StringWithAggregatesFilter<"TemplateMensagem"> | string
    ativo?: BoolWithAggregatesFilter<"TemplateMensagem"> | boolean
    criadoEm?: DateTimeWithAggregatesFilter<"TemplateMensagem"> | Date | string
  }

  export type UsuarioCreateInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemCreateNestedManyWithoutAprovadorInput
    refreshTokens?: RefreshTokenCreateNestedManyWithoutUsuarioInput
    oportunidades?: OportunidadeCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioUncheckedCreateInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemUncheckedCreateNestedManyWithoutAprovadorInput
    refreshTokens?: RefreshTokenUncheckedCreateNestedManyWithoutUsuarioInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUpdateManyWithoutAprovadorNestedInput
    refreshTokens?: RefreshTokenUpdateManyWithoutUsuarioNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutResponsavelNestedInput
  }

  export type UsuarioUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUncheckedUpdateManyWithoutAprovadorNestedInput
    refreshTokens?: RefreshTokenUncheckedUpdateManyWithoutUsuarioNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutResponsavelNestedInput
  }

  export type UsuarioCreateManyInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
  }

  export type UsuarioUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsuarioUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenCreateInput = {
    id?: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
    usuario: UsuarioCreateNestedOneWithoutRefreshTokensInput
  }

  export type RefreshTokenUncheckedCreateInput = {
    id?: string
    usuarioId: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
  }

  export type RefreshTokenUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usuario?: UsuarioUpdateOneRequiredWithoutRefreshTokensNestedInput
  }

  export type RefreshTokenUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    usuarioId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RefreshTokenCreateManyInput = {
    id?: string
    usuarioId: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
  }

  export type RefreshTokenUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RefreshTokenUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    usuarioId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ClienteCreateInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeCreateNestedManyWithoutClienteInput
    mensagens?: MensagemCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoUncheckedCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoUncheckedCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutClienteInput
    mensagens?: MensagemUncheckedCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUncheckedUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUncheckedUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUncheckedUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type ClienteCreateManyInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
  }

  export type ClienteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ClienteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PedidoCreateInput = {
    id?: string
    externalId?: string | null
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    cliente: ClienteCreateNestedOneWithoutPedidosInput
    itens?: ItemPedidoCreateNestedManyWithoutPedidoInput
  }

  export type PedidoUncheckedCreateInput = {
    id?: string
    externalId?: string | null
    clienteId: string
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    itens?: ItemPedidoUncheckedCreateNestedManyWithoutPedidoInput
  }

  export type PedidoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
    cliente?: ClienteUpdateOneRequiredWithoutPedidosNestedInput
    itens?: ItemPedidoUpdateManyWithoutPedidoNestedInput
  }

  export type PedidoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: StringFieldUpdateOperationsInput | string
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
    itens?: ItemPedidoUncheckedUpdateManyWithoutPedidoNestedInput
  }

  export type PedidoCreateManyInput = {
    id?: string
    externalId?: string | null
    clienteId: string
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
  }

  export type PedidoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
  }

  export type PedidoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: StringFieldUpdateOperationsInput | string
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
  }

  export type ItemPedidoCreateInput = {
    id?: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
    pedido: PedidoCreateNestedOneWithoutItensInput
  }

  export type ItemPedidoUncheckedCreateInput = {
    id?: string
    pedidoId: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    pedido?: PedidoUpdateOneRequiredWithoutItensNestedInput
  }

  export type ItemPedidoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pedidoId?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoCreateManyInput = {
    id?: string
    pedidoId: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    pedidoId?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type InteracaoCreateInput = {
    id?: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
    cliente: ClienteCreateNestedOneWithoutInteracoesInput
  }

  export type InteracaoUncheckedCreateInput = {
    id?: string
    clienteId: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
  }

  export type InteracaoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneRequiredWithoutInteracoesNestedInput
  }

  export type InteracaoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InteracaoCreateManyInput = {
    id?: string
    clienteId: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
  }

  export type InteracaoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InteracaoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OportunidadeCreateInput = {
    id?: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    cliente: ClienteCreateNestedOneWithoutOportunidadesInput
    responsavel?: UsuarioCreateNestedOneWithoutOportunidadesInput
  }

  export type OportunidadeUncheckedCreateInput = {
    id?: string
    clienteId: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    responsavelId?: string | null
  }

  export type OportunidadeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cliente?: ClienteUpdateOneRequiredWithoutOportunidadesNestedInput
    responsavel?: UsuarioUpdateOneWithoutOportunidadesNestedInput
  }

  export type OportunidadeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    responsavelId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OportunidadeCreateManyInput = {
    id?: string
    clienteId: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    responsavelId?: string | null
  }

  export type OportunidadeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OportunidadeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    responsavelId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemCreateInput = {
    id?: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
    cliente: ClienteCreateNestedOneWithoutMensagensInput
    aprovador?: UsuarioCreateNestedOneWithoutMensagensInput
  }

  export type MensagemUncheckedCreateInput = {
    id?: string
    clienteId: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    aprovadorId?: string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type MensagemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneRequiredWithoutMensagensNestedInput
    aprovador?: UsuarioUpdateOneWithoutMensagensNestedInput
  }

  export type MensagemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    aprovadorId?: NullableStringFieldUpdateOperationsInput | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemCreateManyInput = {
    id?: string
    clienteId: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    aprovadorId?: string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type MensagemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    aprovadorId?: NullableStringFieldUpdateOperationsInput | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ExecucaoApiCreateInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
    cliente?: ClienteCreateNestedOneWithoutExecucoesInput
  }

  export type ExecucaoApiUncheckedCreateInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    clienteId?: string | null
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
  }

  export type ExecucaoApiUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
    cliente?: ClienteUpdateOneWithoutExecucoesNestedInput
  }

  export type ExecucaoApiUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    clienteId?: NullableStringFieldUpdateOperationsInput | string | null
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ExecucaoApiCreateManyInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    clienteId?: string | null
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
  }

  export type ExecucaoApiUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ExecucaoApiUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    clienteId?: NullableStringFieldUpdateOperationsInput | string | null
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type KpiSnapshotCreateInput = {
    id?: string
    nomeKpi: string
    valor: Decimal | DecimalJsLike | number | string
    periodo: $Enums.PeriodoKpi
    dataReferencia: Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotUncheckedCreateInput = {
    id?: string
    nomeKpi: string
    valor: Decimal | DecimalJsLike | number | string
    periodo: $Enums.PeriodoKpi
    dataReferencia: Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nomeKpi?: StringFieldUpdateOperationsInput | string
    valor?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFieldUpdateOperationsInput | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFieldUpdateOperationsInput | Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nomeKpi?: StringFieldUpdateOperationsInput | string
    valor?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFieldUpdateOperationsInput | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFieldUpdateOperationsInput | Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotCreateManyInput = {
    id?: string
    nomeKpi: string
    valor: Decimal | DecimalJsLike | number | string
    periodo: $Enums.PeriodoKpi
    dataReferencia: Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nomeKpi?: StringFieldUpdateOperationsInput | string
    valor?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFieldUpdateOperationsInput | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFieldUpdateOperationsInput | Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type KpiSnapshotUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nomeKpi?: StringFieldUpdateOperationsInput | string
    valor?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    periodo?: EnumPeriodoKpiFieldUpdateOperationsInput | $Enums.PeriodoKpi
    dataReferencia?: DateTimeFieldUpdateOperationsInput | Date | string
    payload?: NullableJsonNullValueInput | InputJsonValue
  }

  export type IntegrationCredentialCreateInput = {
    id?: string
    provider: string
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: Date | string
  }

  export type IntegrationCredentialUncheckedCreateInput = {
    id?: string
    provider: string
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: Date | string
  }

  export type IntegrationCredentialUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntegrationCredentialUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntegrationCredentialCreateManyInput = {
    id?: string
    provider: string
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: Date | string
  }

  export type IntegrationCredentialUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntegrationCredentialUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    atualizadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateCreateInput = {
    id?: string
    provider: string
    cursor?: string | null
    lastSyncAt?: Date | string | null
  }

  export type SyncStateUncheckedCreateInput = {
    id?: string
    provider: string
    cursor?: string | null
    lastSyncAt?: Date | string | null
  }

  export type SyncStateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    cursor?: NullableStringFieldUpdateOperationsInput | string | null
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SyncStateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    cursor?: NullableStringFieldUpdateOperationsInput | string | null
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SyncStateCreateManyInput = {
    id?: string
    provider: string
    cursor?: string | null
    lastSyncAt?: Date | string | null
  }

  export type SyncStateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    cursor?: NullableStringFieldUpdateOperationsInput | string | null
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SyncStateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    cursor?: NullableStringFieldUpdateOperationsInput | string | null
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RegraClassificacaoCreateInput = {
    id?: string
    nome: string
    payload: JsonNullValueInput | InputJsonValue
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type RegraClassificacaoUncheckedCreateInput = {
    id?: string
    nome: string
    payload: JsonNullValueInput | InputJsonValue
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type RegraClassificacaoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegraClassificacaoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegraClassificacaoCreateManyInput = {
    id?: string
    nome: string
    payload: JsonNullValueInput | InputJsonValue
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type RegraClassificacaoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegraClassificacaoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TemplateMensagemCreateInput = {
    id?: string
    nome: string
    tipo: $Enums.TipoMensagem
    corpo: string
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type TemplateMensagemUncheckedCreateInput = {
    id?: string
    nome: string
    tipo: $Enums.TipoMensagem
    corpo: string
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type TemplateMensagemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    corpo?: StringFieldUpdateOperationsInput | string
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TemplateMensagemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    corpo?: StringFieldUpdateOperationsInput | string
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TemplateMensagemCreateManyInput = {
    id?: string
    nome: string
    tipo: $Enums.TipoMensagem
    corpo: string
    ativo?: boolean
    criadoEm?: Date | string
  }

  export type TemplateMensagemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    corpo?: StringFieldUpdateOperationsInput | string
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TemplateMensagemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    corpo?: StringFieldUpdateOperationsInput | string
    ativo?: BoolFieldUpdateOperationsInput | boolean
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumPerfilUsuarioFilter<$PrismaModel = never> = {
    equals?: $Enums.PerfilUsuario | EnumPerfilUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.PerfilUsuario[]
    notIn?: $Enums.PerfilUsuario[]
    not?: NestedEnumPerfilUsuarioFilter<$PrismaModel> | $Enums.PerfilUsuario
  }

  export type EnumStatusUsuarioFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusUsuario | EnumStatusUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.StatusUsuario[]
    notIn?: $Enums.StatusUsuario[]
    not?: NestedEnumStatusUsuarioFilter<$PrismaModel> | $Enums.StatusUsuario
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type MensagemListRelationFilter = {
    every?: MensagemWhereInput
    some?: MensagemWhereInput
    none?: MensagemWhereInput
  }

  export type RefreshTokenListRelationFilter = {
    every?: RefreshTokenWhereInput
    some?: RefreshTokenWhereInput
    none?: RefreshTokenWhereInput
  }

  export type OportunidadeListRelationFilter = {
    every?: OportunidadeWhereInput
    some?: OportunidadeWhereInput
    none?: OportunidadeWhereInput
  }

  export type MensagemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RefreshTokenOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OportunidadeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UsuarioOrderByRelevanceInput = {
    fields: UsuarioOrderByRelevanceFieldEnum | UsuarioOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type UsuarioCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    email?: SortOrder
    senhaHash?: SortOrder
    perfil?: SortOrder
    status?: SortOrder
    dataCadastro?: SortOrder
  }

  export type UsuarioMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    email?: SortOrder
    senhaHash?: SortOrder
    perfil?: SortOrder
    status?: SortOrder
    dataCadastro?: SortOrder
  }

  export type UsuarioMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    email?: SortOrder
    senhaHash?: SortOrder
    perfil?: SortOrder
    status?: SortOrder
    dataCadastro?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumPerfilUsuarioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PerfilUsuario | EnumPerfilUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.PerfilUsuario[]
    notIn?: $Enums.PerfilUsuario[]
    not?: NestedEnumPerfilUsuarioWithAggregatesFilter<$PrismaModel> | $Enums.PerfilUsuario
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPerfilUsuarioFilter<$PrismaModel>
    _max?: NestedEnumPerfilUsuarioFilter<$PrismaModel>
  }

  export type EnumStatusUsuarioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusUsuario | EnumStatusUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.StatusUsuario[]
    notIn?: $Enums.StatusUsuario[]
    not?: NestedEnumStatusUsuarioWithAggregatesFilter<$PrismaModel> | $Enums.StatusUsuario
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusUsuarioFilter<$PrismaModel>
    _max?: NestedEnumStatusUsuarioFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type UsuarioScalarRelationFilter = {
    is?: UsuarioWhereInput
    isNot?: UsuarioWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RefreshTokenOrderByRelevanceInput = {
    fields: RefreshTokenOrderByRelevanceFieldEnum | RefreshTokenOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type RefreshTokenCountOrderByAggregateInput = {
    id?: SortOrder
    usuarioId?: SortOrder
    tokenHash?: SortOrder
    expiresEm?: SortOrder
    revogadoEm?: SortOrder
  }

  export type RefreshTokenMaxOrderByAggregateInput = {
    id?: SortOrder
    usuarioId?: SortOrder
    tokenHash?: SortOrder
    expiresEm?: SortOrder
    revogadoEm?: SortOrder
  }

  export type RefreshTokenMinOrderByAggregateInput = {
    id?: SortOrder
    usuarioId?: SortOrder
    tokenHash?: SortOrder
    expiresEm?: SortOrder
    revogadoEm?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumTipoClienteFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoCliente | EnumTipoClienteFieldRefInput<$PrismaModel>
    in?: $Enums.TipoCliente[]
    notIn?: $Enums.TipoCliente[]
    not?: NestedEnumTipoClienteFilter<$PrismaModel> | $Enums.TipoCliente
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type EnumStatusRelacionamentoFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusRelacionamento | EnumStatusRelacionamentoFieldRefInput<$PrismaModel>
    in?: $Enums.StatusRelacionamento[]
    notIn?: $Enums.StatusRelacionamento[]
    not?: NestedEnumStatusRelacionamentoFilter<$PrismaModel> | $Enums.StatusRelacionamento
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type PedidoListRelationFilter = {
    every?: PedidoWhereInput
    some?: PedidoWhereInput
    none?: PedidoWhereInput
  }

  export type InteracaoListRelationFilter = {
    every?: InteracaoWhereInput
    some?: InteracaoWhereInput
    none?: InteracaoWhereInput
  }

  export type ExecucaoApiListRelationFilter = {
    every?: ExecucaoApiWhereInput
    some?: ExecucaoApiWhereInput
    none?: ExecucaoApiWhereInput
  }

  export type PedidoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InteracaoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ExecucaoApiOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ClienteOrderByRelevanceInput = {
    fields: ClienteOrderByRelevanceFieldEnum | ClienteOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ClienteCountOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    cnpjCpf?: SortOrder
    endereco?: SortOrder
    contatoPrincipal?: SortOrder
    emailPrincipal?: SortOrder
    telefoneWhatsapp?: SortOrder
    scoreComercial?: SortOrder
    statusRelacionamento?: SortOrder
    tags?: SortOrder
    urlInstagram?: SortOrder
    urlSite?: SortOrder
    dataCadastro?: SortOrder
    dataUltimaAtualizacao?: SortOrder
  }

  export type ClienteAvgOrderByAggregateInput = {
    scoreComercial?: SortOrder
  }

  export type ClienteMaxOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    cnpjCpf?: SortOrder
    endereco?: SortOrder
    contatoPrincipal?: SortOrder
    emailPrincipal?: SortOrder
    telefoneWhatsapp?: SortOrder
    scoreComercial?: SortOrder
    statusRelacionamento?: SortOrder
    urlInstagram?: SortOrder
    urlSite?: SortOrder
    dataCadastro?: SortOrder
    dataUltimaAtualizacao?: SortOrder
  }

  export type ClienteMinOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    cnpjCpf?: SortOrder
    endereco?: SortOrder
    contatoPrincipal?: SortOrder
    emailPrincipal?: SortOrder
    telefoneWhatsapp?: SortOrder
    scoreComercial?: SortOrder
    statusRelacionamento?: SortOrder
    urlInstagram?: SortOrder
    urlSite?: SortOrder
    dataCadastro?: SortOrder
    dataUltimaAtualizacao?: SortOrder
  }

  export type ClienteSumOrderByAggregateInput = {
    scoreComercial?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumTipoClienteWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoCliente | EnumTipoClienteFieldRefInput<$PrismaModel>
    in?: $Enums.TipoCliente[]
    notIn?: $Enums.TipoCliente[]
    not?: NestedEnumTipoClienteWithAggregatesFilter<$PrismaModel> | $Enums.TipoCliente
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoClienteFilter<$PrismaModel>
    _max?: NestedEnumTipoClienteFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumStatusRelacionamentoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusRelacionamento | EnumStatusRelacionamentoFieldRefInput<$PrismaModel>
    in?: $Enums.StatusRelacionamento[]
    notIn?: $Enums.StatusRelacionamento[]
    not?: NestedEnumStatusRelacionamentoWithAggregatesFilter<$PrismaModel> | $Enums.StatusRelacionamento
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusRelacionamentoFilter<$PrismaModel>
    _max?: NestedEnumStatusRelacionamentoFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type EnumOrigemPedidoFilter<$PrismaModel = never> = {
    equals?: $Enums.OrigemPedido | EnumOrigemPedidoFieldRefInput<$PrismaModel>
    in?: $Enums.OrigemPedido[]
    notIn?: $Enums.OrigemPedido[]
    not?: NestedEnumOrigemPedidoFilter<$PrismaModel> | $Enums.OrigemPedido
  }

  export type ClienteScalarRelationFilter = {
    is?: ClienteWhereInput
    isNot?: ClienteWhereInput
  }

  export type ItemPedidoListRelationFilter = {
    every?: ItemPedidoWhereInput
    some?: ItemPedidoWhereInput
    none?: ItemPedidoWhereInput
  }

  export type ItemPedidoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PedidoOrderByRelevanceInput = {
    fields: PedidoOrderByRelevanceFieldEnum | PedidoOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type PedidoCountOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    clienteId?: SortOrder
    dataPedido?: SortOrder
    valorTotal?: SortOrder
    statusPedido?: SortOrder
    origemPedido?: SortOrder
  }

  export type PedidoAvgOrderByAggregateInput = {
    valorTotal?: SortOrder
  }

  export type PedidoMaxOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    clienteId?: SortOrder
    dataPedido?: SortOrder
    valorTotal?: SortOrder
    statusPedido?: SortOrder
    origemPedido?: SortOrder
  }

  export type PedidoMinOrderByAggregateInput = {
    id?: SortOrder
    externalId?: SortOrder
    clienteId?: SortOrder
    dataPedido?: SortOrder
    valorTotal?: SortOrder
    statusPedido?: SortOrder
    origemPedido?: SortOrder
  }

  export type PedidoSumOrderByAggregateInput = {
    valorTotal?: SortOrder
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type EnumOrigemPedidoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrigemPedido | EnumOrigemPedidoFieldRefInput<$PrismaModel>
    in?: $Enums.OrigemPedido[]
    notIn?: $Enums.OrigemPedido[]
    not?: NestedEnumOrigemPedidoWithAggregatesFilter<$PrismaModel> | $Enums.OrigemPedido
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrigemPedidoFilter<$PrismaModel>
    _max?: NestedEnumOrigemPedidoFilter<$PrismaModel>
  }

  export type PedidoScalarRelationFilter = {
    is?: PedidoWhereInput
    isNot?: PedidoWhereInput
  }

  export type ItemPedidoOrderByRelevanceInput = {
    fields: ItemPedidoOrderByRelevanceFieldEnum | ItemPedidoOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ItemPedidoCountOrderByAggregateInput = {
    id?: SortOrder
    pedidoId?: SortOrder
    sku?: SortOrder
    produto?: SortOrder
    categoria?: SortOrder
    quantidade?: SortOrder
    precoUnit?: SortOrder
  }

  export type ItemPedidoAvgOrderByAggregateInput = {
    quantidade?: SortOrder
    precoUnit?: SortOrder
  }

  export type ItemPedidoMaxOrderByAggregateInput = {
    id?: SortOrder
    pedidoId?: SortOrder
    sku?: SortOrder
    produto?: SortOrder
    categoria?: SortOrder
    quantidade?: SortOrder
    precoUnit?: SortOrder
  }

  export type ItemPedidoMinOrderByAggregateInput = {
    id?: SortOrder
    pedidoId?: SortOrder
    sku?: SortOrder
    produto?: SortOrder
    categoria?: SortOrder
    quantidade?: SortOrder
    precoUnit?: SortOrder
  }

  export type ItemPedidoSumOrderByAggregateInput = {
    quantidade?: SortOrder
    precoUnit?: SortOrder
  }

  export type EnumTipoInteracaoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoInteracao | EnumTipoInteracaoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoInteracao[]
    notIn?: $Enums.TipoInteracao[]
    not?: NestedEnumTipoInteracaoFilter<$PrismaModel> | $Enums.TipoInteracao
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type InteracaoOrderByRelevanceInput = {
    fields: InteracaoOrderByRelevanceFieldEnum | InteracaoOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type InteracaoCountOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoInteracao?: SortOrder
    dataInteracao?: SortOrder
    resumo?: SortOrder
    sentimento?: SortOrder
    oportunidadeDetectada?: SortOrder
    riscoDetectado?: SortOrder
    conteudoBruto?: SortOrder
  }

  export type InteracaoAvgOrderByAggregateInput = {
    sentimento?: SortOrder
  }

  export type InteracaoMaxOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoInteracao?: SortOrder
    dataInteracao?: SortOrder
    resumo?: SortOrder
    sentimento?: SortOrder
    oportunidadeDetectada?: SortOrder
    riscoDetectado?: SortOrder
    conteudoBruto?: SortOrder
  }

  export type InteracaoMinOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoInteracao?: SortOrder
    dataInteracao?: SortOrder
    resumo?: SortOrder
    sentimento?: SortOrder
    oportunidadeDetectada?: SortOrder
    riscoDetectado?: SortOrder
    conteudoBruto?: SortOrder
  }

  export type InteracaoSumOrderByAggregateInput = {
    sentimento?: SortOrder
  }

  export type EnumTipoInteracaoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoInteracao | EnumTipoInteracaoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoInteracao[]
    notIn?: $Enums.TipoInteracao[]
    not?: NestedEnumTipoInteracaoWithAggregatesFilter<$PrismaModel> | $Enums.TipoInteracao
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoInteracaoFilter<$PrismaModel>
    _max?: NestedEnumTipoInteracaoFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumTipoOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoOportunidade | EnumTipoOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.TipoOportunidade[]
    notIn?: $Enums.TipoOportunidade[]
    not?: NestedEnumTipoOportunidadeFilter<$PrismaModel> | $Enums.TipoOportunidade
  }

  export type EnumPrioridadeOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadeOportunidade | EnumPrioridadeOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadeOportunidade[]
    notIn?: $Enums.PrioridadeOportunidade[]
    not?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel> | $Enums.PrioridadeOportunidade
  }

  export type EnumStatusOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusOportunidade | EnumStatusOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.StatusOportunidade[]
    notIn?: $Enums.StatusOportunidade[]
    not?: NestedEnumStatusOportunidadeFilter<$PrismaModel> | $Enums.StatusOportunidade
  }

  export type UsuarioNullableScalarRelationFilter = {
    is?: UsuarioWhereInput | null
    isNot?: UsuarioWhereInput | null
  }

  export type OportunidadeOrderByRelevanceInput = {
    fields: OportunidadeOrderByRelevanceFieldEnum | OportunidadeOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type OportunidadeCountOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoOportunidade?: SortOrder
    descricao?: SortOrder
    valorEstimado?: SortOrder
    probabilidadeConversao?: SortOrder
    prioridade?: SortOrder
    statusOportunidade?: SortOrder
    dataCriacao?: SortOrder
    dataFechamento?: SortOrder
    responsavelId?: SortOrder
  }

  export type OportunidadeAvgOrderByAggregateInput = {
    valorEstimado?: SortOrder
    probabilidadeConversao?: SortOrder
  }

  export type OportunidadeMaxOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoOportunidade?: SortOrder
    descricao?: SortOrder
    valorEstimado?: SortOrder
    probabilidadeConversao?: SortOrder
    prioridade?: SortOrder
    statusOportunidade?: SortOrder
    dataCriacao?: SortOrder
    dataFechamento?: SortOrder
    responsavelId?: SortOrder
  }

  export type OportunidadeMinOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoOportunidade?: SortOrder
    descricao?: SortOrder
    valorEstimado?: SortOrder
    probabilidadeConversao?: SortOrder
    prioridade?: SortOrder
    statusOportunidade?: SortOrder
    dataCriacao?: SortOrder
    dataFechamento?: SortOrder
    responsavelId?: SortOrder
  }

  export type OportunidadeSumOrderByAggregateInput = {
    valorEstimado?: SortOrder
    probabilidadeConversao?: SortOrder
  }

  export type EnumTipoOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoOportunidade | EnumTipoOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.TipoOportunidade[]
    notIn?: $Enums.TipoOportunidade[]
    not?: NestedEnumTipoOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.TipoOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumTipoOportunidadeFilter<$PrismaModel>
  }

  export type EnumPrioridadeOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadeOportunidade | EnumPrioridadeOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadeOportunidade[]
    notIn?: $Enums.PrioridadeOportunidade[]
    not?: NestedEnumPrioridadeOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.PrioridadeOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel>
  }

  export type EnumStatusOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusOportunidade | EnumStatusOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.StatusOportunidade[]
    notIn?: $Enums.StatusOportunidade[]
    not?: NestedEnumStatusOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.StatusOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumStatusOportunidadeFilter<$PrismaModel>
  }

  export type EnumTipoMensagemFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMensagem | EnumTipoMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.TipoMensagem[]
    notIn?: $Enums.TipoMensagem[]
    not?: NestedEnumTipoMensagemFilter<$PrismaModel> | $Enums.TipoMensagem
  }

  export type EnumStatusEnvioMensagemFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusEnvioMensagem | EnumStatusEnvioMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.StatusEnvioMensagem[]
    notIn?: $Enums.StatusEnvioMensagem[]
    not?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel> | $Enums.StatusEnvioMensagem
  }

  export type MensagemOrderByRelevanceInput = {
    fields: MensagemOrderByRelevanceFieldEnum | MensagemOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type MensagemCountOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoMensagem?: SortOrder
    conteudoSugerido?: SortOrder
    conteudoFinal?: SortOrder
    statusEnvio?: SortOrder
    sensivel?: SortOrder
    dataCriacao?: SortOrder
    dataAprovacao?: SortOrder
    dataEnvio?: SortOrder
    aprovadorId?: SortOrder
    canalEnvio?: SortOrder
    agendadoPara?: SortOrder
    justificativaRejeicao?: SortOrder
  }

  export type MensagemMaxOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoMensagem?: SortOrder
    conteudoSugerido?: SortOrder
    conteudoFinal?: SortOrder
    statusEnvio?: SortOrder
    sensivel?: SortOrder
    dataCriacao?: SortOrder
    dataAprovacao?: SortOrder
    dataEnvio?: SortOrder
    aprovadorId?: SortOrder
    canalEnvio?: SortOrder
    agendadoPara?: SortOrder
    justificativaRejeicao?: SortOrder
  }

  export type MensagemMinOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    tipoMensagem?: SortOrder
    conteudoSugerido?: SortOrder
    conteudoFinal?: SortOrder
    statusEnvio?: SortOrder
    sensivel?: SortOrder
    dataCriacao?: SortOrder
    dataAprovacao?: SortOrder
    dataEnvio?: SortOrder
    aprovadorId?: SortOrder
    canalEnvio?: SortOrder
    agendadoPara?: SortOrder
    justificativaRejeicao?: SortOrder
  }

  export type EnumTipoMensagemWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMensagem | EnumTipoMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.TipoMensagem[]
    notIn?: $Enums.TipoMensagem[]
    not?: NestedEnumTipoMensagemWithAggregatesFilter<$PrismaModel> | $Enums.TipoMensagem
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoMensagemFilter<$PrismaModel>
    _max?: NestedEnumTipoMensagemFilter<$PrismaModel>
  }

  export type EnumStatusEnvioMensagemWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusEnvioMensagem | EnumStatusEnvioMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.StatusEnvioMensagem[]
    notIn?: $Enums.StatusEnvioMensagem[]
    not?: NestedEnumStatusEnvioMensagemWithAggregatesFilter<$PrismaModel> | $Enums.StatusEnvioMensagem
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel>
    _max?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel>
  }

  export type EnumAcaoApiFilter<$PrismaModel = never> = {
    equals?: $Enums.AcaoApi | EnumAcaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.AcaoApi[]
    notIn?: $Enums.AcaoApi[]
    not?: NestedEnumAcaoApiFilter<$PrismaModel> | $Enums.AcaoApi
  }

  export type EnumStatusExecucaoApiFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusExecucaoApi | EnumStatusExecucaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.StatusExecucaoApi[]
    notIn?: $Enums.StatusExecucaoApi[]
    not?: NestedEnumStatusExecucaoApiFilter<$PrismaModel> | $Enums.StatusExecucaoApi
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ClienteNullableScalarRelationFilter = {
    is?: ClienteWhereInput | null
    isNot?: ClienteWhereInput | null
  }

  export type ExecucaoApiOrderByRelevanceInput = {
    fields: ExecucaoApiOrderByRelevanceFieldEnum | ExecucaoApiOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ExecucaoApiCountOrderByAggregateInput = {
    id?: SortOrder
    acaoApi?: SortOrder
    dataExecucao?: SortOrder
    statusExecucao?: SortOrder
    clienteId?: SortOrder
    detalhesExecucao?: SortOrder
    mensagemErro?: SortOrder
    duracaoMs?: SortOrder
  }

  export type ExecucaoApiAvgOrderByAggregateInput = {
    duracaoMs?: SortOrder
  }

  export type ExecucaoApiMaxOrderByAggregateInput = {
    id?: SortOrder
    acaoApi?: SortOrder
    dataExecucao?: SortOrder
    statusExecucao?: SortOrder
    clienteId?: SortOrder
    mensagemErro?: SortOrder
    duracaoMs?: SortOrder
  }

  export type ExecucaoApiMinOrderByAggregateInput = {
    id?: SortOrder
    acaoApi?: SortOrder
    dataExecucao?: SortOrder
    statusExecucao?: SortOrder
    clienteId?: SortOrder
    mensagemErro?: SortOrder
    duracaoMs?: SortOrder
  }

  export type ExecucaoApiSumOrderByAggregateInput = {
    duracaoMs?: SortOrder
  }

  export type EnumAcaoApiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AcaoApi | EnumAcaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.AcaoApi[]
    notIn?: $Enums.AcaoApi[]
    not?: NestedEnumAcaoApiWithAggregatesFilter<$PrismaModel> | $Enums.AcaoApi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAcaoApiFilter<$PrismaModel>
    _max?: NestedEnumAcaoApiFilter<$PrismaModel>
  }

  export type EnumStatusExecucaoApiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusExecucaoApi | EnumStatusExecucaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.StatusExecucaoApi[]
    notIn?: $Enums.StatusExecucaoApi[]
    not?: NestedEnumStatusExecucaoApiWithAggregatesFilter<$PrismaModel> | $Enums.StatusExecucaoApi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusExecucaoApiFilter<$PrismaModel>
    _max?: NestedEnumStatusExecucaoApiFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumPeriodoKpiFilter<$PrismaModel = never> = {
    equals?: $Enums.PeriodoKpi | EnumPeriodoKpiFieldRefInput<$PrismaModel>
    in?: $Enums.PeriodoKpi[]
    notIn?: $Enums.PeriodoKpi[]
    not?: NestedEnumPeriodoKpiFilter<$PrismaModel> | $Enums.PeriodoKpi
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type KpiSnapshotOrderByRelevanceInput = {
    fields: KpiSnapshotOrderByRelevanceFieldEnum | KpiSnapshotOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type KpiSnapshotNomeKpiPeriodoDataReferenciaCompoundUniqueInput = {
    nomeKpi: string
    periodo: $Enums.PeriodoKpi
    dataReferencia: Date | string
  }

  export type KpiSnapshotCountOrderByAggregateInput = {
    id?: SortOrder
    nomeKpi?: SortOrder
    valor?: SortOrder
    periodo?: SortOrder
    dataReferencia?: SortOrder
    payload?: SortOrder
  }

  export type KpiSnapshotAvgOrderByAggregateInput = {
    valor?: SortOrder
  }

  export type KpiSnapshotMaxOrderByAggregateInput = {
    id?: SortOrder
    nomeKpi?: SortOrder
    valor?: SortOrder
    periodo?: SortOrder
    dataReferencia?: SortOrder
  }

  export type KpiSnapshotMinOrderByAggregateInput = {
    id?: SortOrder
    nomeKpi?: SortOrder
    valor?: SortOrder
    periodo?: SortOrder
    dataReferencia?: SortOrder
  }

  export type KpiSnapshotSumOrderByAggregateInput = {
    valor?: SortOrder
  }

  export type EnumPeriodoKpiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PeriodoKpi | EnumPeriodoKpiFieldRefInput<$PrismaModel>
    in?: $Enums.PeriodoKpi[]
    notIn?: $Enums.PeriodoKpi[]
    not?: NestedEnumPeriodoKpiWithAggregatesFilter<$PrismaModel> | $Enums.PeriodoKpi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPeriodoKpiFilter<$PrismaModel>
    _max?: NestedEnumPeriodoKpiFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntegrationCredentialOrderByRelevanceInput = {
    fields: IntegrationCredentialOrderByRelevanceFieldEnum | IntegrationCredentialOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type IntegrationCredentialCountOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    metadata?: SortOrder
    atualizadoEm?: SortOrder
  }

  export type IntegrationCredentialMaxOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    atualizadoEm?: SortOrder
  }

  export type IntegrationCredentialMinOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    atualizadoEm?: SortOrder
  }

  export type SyncStateOrderByRelevanceInput = {
    fields: SyncStateOrderByRelevanceFieldEnum | SyncStateOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type SyncStateCountOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    cursor?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type SyncStateMaxOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    cursor?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type SyncStateMinOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    cursor?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type RegraClassificacaoOrderByRelevanceInput = {
    fields: RegraClassificacaoOrderByRelevanceFieldEnum | RegraClassificacaoOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type RegraClassificacaoCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    payload?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type RegraClassificacaoMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type RegraClassificacaoMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type TemplateMensagemOrderByRelevanceInput = {
    fields: TemplateMensagemOrderByRelevanceFieldEnum | TemplateMensagemOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type TemplateMensagemCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    corpo?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type TemplateMensagemMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    corpo?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type TemplateMensagemMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    tipo?: SortOrder
    corpo?: SortOrder
    ativo?: SortOrder
    criadoEm?: SortOrder
  }

  export type MensagemCreateNestedManyWithoutAprovadorInput = {
    create?: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput> | MensagemCreateWithoutAprovadorInput[] | MensagemUncheckedCreateWithoutAprovadorInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutAprovadorInput | MensagemCreateOrConnectWithoutAprovadorInput[]
    createMany?: MensagemCreateManyAprovadorInputEnvelope
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
  }

  export type RefreshTokenCreateNestedManyWithoutUsuarioInput = {
    create?: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput> | RefreshTokenCreateWithoutUsuarioInput[] | RefreshTokenUncheckedCreateWithoutUsuarioInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUsuarioInput | RefreshTokenCreateOrConnectWithoutUsuarioInput[]
    createMany?: RefreshTokenCreateManyUsuarioInputEnvelope
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
  }

  export type OportunidadeCreateNestedManyWithoutResponsavelInput = {
    create?: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput> | OportunidadeCreateWithoutResponsavelInput[] | OportunidadeUncheckedCreateWithoutResponsavelInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutResponsavelInput | OportunidadeCreateOrConnectWithoutResponsavelInput[]
    createMany?: OportunidadeCreateManyResponsavelInputEnvelope
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
  }

  export type MensagemUncheckedCreateNestedManyWithoutAprovadorInput = {
    create?: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput> | MensagemCreateWithoutAprovadorInput[] | MensagemUncheckedCreateWithoutAprovadorInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutAprovadorInput | MensagemCreateOrConnectWithoutAprovadorInput[]
    createMany?: MensagemCreateManyAprovadorInputEnvelope
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
  }

  export type RefreshTokenUncheckedCreateNestedManyWithoutUsuarioInput = {
    create?: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput> | RefreshTokenCreateWithoutUsuarioInput[] | RefreshTokenUncheckedCreateWithoutUsuarioInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUsuarioInput | RefreshTokenCreateOrConnectWithoutUsuarioInput[]
    createMany?: RefreshTokenCreateManyUsuarioInputEnvelope
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
  }

  export type OportunidadeUncheckedCreateNestedManyWithoutResponsavelInput = {
    create?: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput> | OportunidadeCreateWithoutResponsavelInput[] | OportunidadeUncheckedCreateWithoutResponsavelInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutResponsavelInput | OportunidadeCreateOrConnectWithoutResponsavelInput[]
    createMany?: OportunidadeCreateManyResponsavelInputEnvelope
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumPerfilUsuarioFieldUpdateOperationsInput = {
    set?: $Enums.PerfilUsuario
  }

  export type EnumStatusUsuarioFieldUpdateOperationsInput = {
    set?: $Enums.StatusUsuario
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type MensagemUpdateManyWithoutAprovadorNestedInput = {
    create?: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput> | MensagemCreateWithoutAprovadorInput[] | MensagemUncheckedCreateWithoutAprovadorInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutAprovadorInput | MensagemCreateOrConnectWithoutAprovadorInput[]
    upsert?: MensagemUpsertWithWhereUniqueWithoutAprovadorInput | MensagemUpsertWithWhereUniqueWithoutAprovadorInput[]
    createMany?: MensagemCreateManyAprovadorInputEnvelope
    set?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    disconnect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    delete?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    update?: MensagemUpdateWithWhereUniqueWithoutAprovadorInput | MensagemUpdateWithWhereUniqueWithoutAprovadorInput[]
    updateMany?: MensagemUpdateManyWithWhereWithoutAprovadorInput | MensagemUpdateManyWithWhereWithoutAprovadorInput[]
    deleteMany?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
  }

  export type RefreshTokenUpdateManyWithoutUsuarioNestedInput = {
    create?: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput> | RefreshTokenCreateWithoutUsuarioInput[] | RefreshTokenUncheckedCreateWithoutUsuarioInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUsuarioInput | RefreshTokenCreateOrConnectWithoutUsuarioInput[]
    upsert?: RefreshTokenUpsertWithWhereUniqueWithoutUsuarioInput | RefreshTokenUpsertWithWhereUniqueWithoutUsuarioInput[]
    createMany?: RefreshTokenCreateManyUsuarioInputEnvelope
    set?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    disconnect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    delete?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    update?: RefreshTokenUpdateWithWhereUniqueWithoutUsuarioInput | RefreshTokenUpdateWithWhereUniqueWithoutUsuarioInput[]
    updateMany?: RefreshTokenUpdateManyWithWhereWithoutUsuarioInput | RefreshTokenUpdateManyWithWhereWithoutUsuarioInput[]
    deleteMany?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
  }

  export type OportunidadeUpdateManyWithoutResponsavelNestedInput = {
    create?: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput> | OportunidadeCreateWithoutResponsavelInput[] | OportunidadeUncheckedCreateWithoutResponsavelInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutResponsavelInput | OportunidadeCreateOrConnectWithoutResponsavelInput[]
    upsert?: OportunidadeUpsertWithWhereUniqueWithoutResponsavelInput | OportunidadeUpsertWithWhereUniqueWithoutResponsavelInput[]
    createMany?: OportunidadeCreateManyResponsavelInputEnvelope
    set?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    disconnect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    delete?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    update?: OportunidadeUpdateWithWhereUniqueWithoutResponsavelInput | OportunidadeUpdateWithWhereUniqueWithoutResponsavelInput[]
    updateMany?: OportunidadeUpdateManyWithWhereWithoutResponsavelInput | OportunidadeUpdateManyWithWhereWithoutResponsavelInput[]
    deleteMany?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
  }

  export type MensagemUncheckedUpdateManyWithoutAprovadorNestedInput = {
    create?: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput> | MensagemCreateWithoutAprovadorInput[] | MensagemUncheckedCreateWithoutAprovadorInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutAprovadorInput | MensagemCreateOrConnectWithoutAprovadorInput[]
    upsert?: MensagemUpsertWithWhereUniqueWithoutAprovadorInput | MensagemUpsertWithWhereUniqueWithoutAprovadorInput[]
    createMany?: MensagemCreateManyAprovadorInputEnvelope
    set?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    disconnect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    delete?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    update?: MensagemUpdateWithWhereUniqueWithoutAprovadorInput | MensagemUpdateWithWhereUniqueWithoutAprovadorInput[]
    updateMany?: MensagemUpdateManyWithWhereWithoutAprovadorInput | MensagemUpdateManyWithWhereWithoutAprovadorInput[]
    deleteMany?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
  }

  export type RefreshTokenUncheckedUpdateManyWithoutUsuarioNestedInput = {
    create?: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput> | RefreshTokenCreateWithoutUsuarioInput[] | RefreshTokenUncheckedCreateWithoutUsuarioInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUsuarioInput | RefreshTokenCreateOrConnectWithoutUsuarioInput[]
    upsert?: RefreshTokenUpsertWithWhereUniqueWithoutUsuarioInput | RefreshTokenUpsertWithWhereUniqueWithoutUsuarioInput[]
    createMany?: RefreshTokenCreateManyUsuarioInputEnvelope
    set?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    disconnect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    delete?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    update?: RefreshTokenUpdateWithWhereUniqueWithoutUsuarioInput | RefreshTokenUpdateWithWhereUniqueWithoutUsuarioInput[]
    updateMany?: RefreshTokenUpdateManyWithWhereWithoutUsuarioInput | RefreshTokenUpdateManyWithWhereWithoutUsuarioInput[]
    deleteMany?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
  }

  export type OportunidadeUncheckedUpdateManyWithoutResponsavelNestedInput = {
    create?: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput> | OportunidadeCreateWithoutResponsavelInput[] | OportunidadeUncheckedCreateWithoutResponsavelInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutResponsavelInput | OportunidadeCreateOrConnectWithoutResponsavelInput[]
    upsert?: OportunidadeUpsertWithWhereUniqueWithoutResponsavelInput | OportunidadeUpsertWithWhereUniqueWithoutResponsavelInput[]
    createMany?: OportunidadeCreateManyResponsavelInputEnvelope
    set?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    disconnect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    delete?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    update?: OportunidadeUpdateWithWhereUniqueWithoutResponsavelInput | OportunidadeUpdateWithWhereUniqueWithoutResponsavelInput[]
    updateMany?: OportunidadeUpdateManyWithWhereWithoutResponsavelInput | OportunidadeUpdateManyWithWhereWithoutResponsavelInput[]
    deleteMany?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
  }

  export type UsuarioCreateNestedOneWithoutRefreshTokensInput = {
    create?: XOR<UsuarioCreateWithoutRefreshTokensInput, UsuarioUncheckedCreateWithoutRefreshTokensInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutRefreshTokensInput
    connect?: UsuarioWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UsuarioUpdateOneRequiredWithoutRefreshTokensNestedInput = {
    create?: XOR<UsuarioCreateWithoutRefreshTokensInput, UsuarioUncheckedCreateWithoutRefreshTokensInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutRefreshTokensInput
    upsert?: UsuarioUpsertWithoutRefreshTokensInput
    connect?: UsuarioWhereUniqueInput
    update?: XOR<XOR<UsuarioUpdateToOneWithWhereWithoutRefreshTokensInput, UsuarioUpdateWithoutRefreshTokensInput>, UsuarioUncheckedUpdateWithoutRefreshTokensInput>
  }

  export type PedidoCreateNestedManyWithoutClienteInput = {
    create?: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput> | PedidoCreateWithoutClienteInput[] | PedidoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: PedidoCreateOrConnectWithoutClienteInput | PedidoCreateOrConnectWithoutClienteInput[]
    createMany?: PedidoCreateManyClienteInputEnvelope
    connect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
  }

  export type InteracaoCreateNestedManyWithoutClienteInput = {
    create?: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput> | InteracaoCreateWithoutClienteInput[] | InteracaoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: InteracaoCreateOrConnectWithoutClienteInput | InteracaoCreateOrConnectWithoutClienteInput[]
    createMany?: InteracaoCreateManyClienteInputEnvelope
    connect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
  }

  export type OportunidadeCreateNestedManyWithoutClienteInput = {
    create?: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput> | OportunidadeCreateWithoutClienteInput[] | OportunidadeUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutClienteInput | OportunidadeCreateOrConnectWithoutClienteInput[]
    createMany?: OportunidadeCreateManyClienteInputEnvelope
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
  }

  export type MensagemCreateNestedManyWithoutClienteInput = {
    create?: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput> | MensagemCreateWithoutClienteInput[] | MensagemUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutClienteInput | MensagemCreateOrConnectWithoutClienteInput[]
    createMany?: MensagemCreateManyClienteInputEnvelope
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
  }

  export type ExecucaoApiCreateNestedManyWithoutClienteInput = {
    create?: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput> | ExecucaoApiCreateWithoutClienteInput[] | ExecucaoApiUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: ExecucaoApiCreateOrConnectWithoutClienteInput | ExecucaoApiCreateOrConnectWithoutClienteInput[]
    createMany?: ExecucaoApiCreateManyClienteInputEnvelope
    connect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
  }

  export type PedidoUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput> | PedidoCreateWithoutClienteInput[] | PedidoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: PedidoCreateOrConnectWithoutClienteInput | PedidoCreateOrConnectWithoutClienteInput[]
    createMany?: PedidoCreateManyClienteInputEnvelope
    connect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
  }

  export type InteracaoUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput> | InteracaoCreateWithoutClienteInput[] | InteracaoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: InteracaoCreateOrConnectWithoutClienteInput | InteracaoCreateOrConnectWithoutClienteInput[]
    createMany?: InteracaoCreateManyClienteInputEnvelope
    connect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
  }

  export type OportunidadeUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput> | OportunidadeCreateWithoutClienteInput[] | OportunidadeUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutClienteInput | OportunidadeCreateOrConnectWithoutClienteInput[]
    createMany?: OportunidadeCreateManyClienteInputEnvelope
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
  }

  export type MensagemUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput> | MensagemCreateWithoutClienteInput[] | MensagemUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutClienteInput | MensagemCreateOrConnectWithoutClienteInput[]
    createMany?: MensagemCreateManyClienteInputEnvelope
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
  }

  export type ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput> | ExecucaoApiCreateWithoutClienteInput[] | ExecucaoApiUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: ExecucaoApiCreateOrConnectWithoutClienteInput | ExecucaoApiCreateOrConnectWithoutClienteInput[]
    createMany?: ExecucaoApiCreateManyClienteInputEnvelope
    connect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumTipoClienteFieldUpdateOperationsInput = {
    set?: $Enums.TipoCliente
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumStatusRelacionamentoFieldUpdateOperationsInput = {
    set?: $Enums.StatusRelacionamento
  }

  export type PedidoUpdateManyWithoutClienteNestedInput = {
    create?: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput> | PedidoCreateWithoutClienteInput[] | PedidoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: PedidoCreateOrConnectWithoutClienteInput | PedidoCreateOrConnectWithoutClienteInput[]
    upsert?: PedidoUpsertWithWhereUniqueWithoutClienteInput | PedidoUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: PedidoCreateManyClienteInputEnvelope
    set?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    disconnect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    delete?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    connect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    update?: PedidoUpdateWithWhereUniqueWithoutClienteInput | PedidoUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: PedidoUpdateManyWithWhereWithoutClienteInput | PedidoUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: PedidoScalarWhereInput | PedidoScalarWhereInput[]
  }

  export type InteracaoUpdateManyWithoutClienteNestedInput = {
    create?: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput> | InteracaoCreateWithoutClienteInput[] | InteracaoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: InteracaoCreateOrConnectWithoutClienteInput | InteracaoCreateOrConnectWithoutClienteInput[]
    upsert?: InteracaoUpsertWithWhereUniqueWithoutClienteInput | InteracaoUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: InteracaoCreateManyClienteInputEnvelope
    set?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    disconnect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    delete?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    connect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    update?: InteracaoUpdateWithWhereUniqueWithoutClienteInput | InteracaoUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: InteracaoUpdateManyWithWhereWithoutClienteInput | InteracaoUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: InteracaoScalarWhereInput | InteracaoScalarWhereInput[]
  }

  export type OportunidadeUpdateManyWithoutClienteNestedInput = {
    create?: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput> | OportunidadeCreateWithoutClienteInput[] | OportunidadeUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutClienteInput | OportunidadeCreateOrConnectWithoutClienteInput[]
    upsert?: OportunidadeUpsertWithWhereUniqueWithoutClienteInput | OportunidadeUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: OportunidadeCreateManyClienteInputEnvelope
    set?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    disconnect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    delete?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    update?: OportunidadeUpdateWithWhereUniqueWithoutClienteInput | OportunidadeUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: OportunidadeUpdateManyWithWhereWithoutClienteInput | OportunidadeUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
  }

  export type MensagemUpdateManyWithoutClienteNestedInput = {
    create?: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput> | MensagemCreateWithoutClienteInput[] | MensagemUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutClienteInput | MensagemCreateOrConnectWithoutClienteInput[]
    upsert?: MensagemUpsertWithWhereUniqueWithoutClienteInput | MensagemUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: MensagemCreateManyClienteInputEnvelope
    set?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    disconnect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    delete?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    update?: MensagemUpdateWithWhereUniqueWithoutClienteInput | MensagemUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: MensagemUpdateManyWithWhereWithoutClienteInput | MensagemUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
  }

  export type ExecucaoApiUpdateManyWithoutClienteNestedInput = {
    create?: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput> | ExecucaoApiCreateWithoutClienteInput[] | ExecucaoApiUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: ExecucaoApiCreateOrConnectWithoutClienteInput | ExecucaoApiCreateOrConnectWithoutClienteInput[]
    upsert?: ExecucaoApiUpsertWithWhereUniqueWithoutClienteInput | ExecucaoApiUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: ExecucaoApiCreateManyClienteInputEnvelope
    set?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    disconnect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    delete?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    connect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    update?: ExecucaoApiUpdateWithWhereUniqueWithoutClienteInput | ExecucaoApiUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: ExecucaoApiUpdateManyWithWhereWithoutClienteInput | ExecucaoApiUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: ExecucaoApiScalarWhereInput | ExecucaoApiScalarWhereInput[]
  }

  export type PedidoUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput> | PedidoCreateWithoutClienteInput[] | PedidoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: PedidoCreateOrConnectWithoutClienteInput | PedidoCreateOrConnectWithoutClienteInput[]
    upsert?: PedidoUpsertWithWhereUniqueWithoutClienteInput | PedidoUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: PedidoCreateManyClienteInputEnvelope
    set?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    disconnect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    delete?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    connect?: PedidoWhereUniqueInput | PedidoWhereUniqueInput[]
    update?: PedidoUpdateWithWhereUniqueWithoutClienteInput | PedidoUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: PedidoUpdateManyWithWhereWithoutClienteInput | PedidoUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: PedidoScalarWhereInput | PedidoScalarWhereInput[]
  }

  export type InteracaoUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput> | InteracaoCreateWithoutClienteInput[] | InteracaoUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: InteracaoCreateOrConnectWithoutClienteInput | InteracaoCreateOrConnectWithoutClienteInput[]
    upsert?: InteracaoUpsertWithWhereUniqueWithoutClienteInput | InteracaoUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: InteracaoCreateManyClienteInputEnvelope
    set?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    disconnect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    delete?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    connect?: InteracaoWhereUniqueInput | InteracaoWhereUniqueInput[]
    update?: InteracaoUpdateWithWhereUniqueWithoutClienteInput | InteracaoUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: InteracaoUpdateManyWithWhereWithoutClienteInput | InteracaoUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: InteracaoScalarWhereInput | InteracaoScalarWhereInput[]
  }

  export type OportunidadeUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput> | OportunidadeCreateWithoutClienteInput[] | OportunidadeUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: OportunidadeCreateOrConnectWithoutClienteInput | OportunidadeCreateOrConnectWithoutClienteInput[]
    upsert?: OportunidadeUpsertWithWhereUniqueWithoutClienteInput | OportunidadeUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: OportunidadeCreateManyClienteInputEnvelope
    set?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    disconnect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    delete?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    connect?: OportunidadeWhereUniqueInput | OportunidadeWhereUniqueInput[]
    update?: OportunidadeUpdateWithWhereUniqueWithoutClienteInput | OportunidadeUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: OportunidadeUpdateManyWithWhereWithoutClienteInput | OportunidadeUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
  }

  export type MensagemUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput> | MensagemCreateWithoutClienteInput[] | MensagemUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: MensagemCreateOrConnectWithoutClienteInput | MensagemCreateOrConnectWithoutClienteInput[]
    upsert?: MensagemUpsertWithWhereUniqueWithoutClienteInput | MensagemUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: MensagemCreateManyClienteInputEnvelope
    set?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    disconnect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    delete?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    connect?: MensagemWhereUniqueInput | MensagemWhereUniqueInput[]
    update?: MensagemUpdateWithWhereUniqueWithoutClienteInput | MensagemUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: MensagemUpdateManyWithWhereWithoutClienteInput | MensagemUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
  }

  export type ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput> | ExecucaoApiCreateWithoutClienteInput[] | ExecucaoApiUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: ExecucaoApiCreateOrConnectWithoutClienteInput | ExecucaoApiCreateOrConnectWithoutClienteInput[]
    upsert?: ExecucaoApiUpsertWithWhereUniqueWithoutClienteInput | ExecucaoApiUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: ExecucaoApiCreateManyClienteInputEnvelope
    set?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    disconnect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    delete?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    connect?: ExecucaoApiWhereUniqueInput | ExecucaoApiWhereUniqueInput[]
    update?: ExecucaoApiUpdateWithWhereUniqueWithoutClienteInput | ExecucaoApiUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: ExecucaoApiUpdateManyWithWhereWithoutClienteInput | ExecucaoApiUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: ExecucaoApiScalarWhereInput | ExecucaoApiScalarWhereInput[]
  }

  export type ClienteCreateNestedOneWithoutPedidosInput = {
    create?: XOR<ClienteCreateWithoutPedidosInput, ClienteUncheckedCreateWithoutPedidosInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutPedidosInput
    connect?: ClienteWhereUniqueInput
  }

  export type ItemPedidoCreateNestedManyWithoutPedidoInput = {
    create?: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput> | ItemPedidoCreateWithoutPedidoInput[] | ItemPedidoUncheckedCreateWithoutPedidoInput[]
    connectOrCreate?: ItemPedidoCreateOrConnectWithoutPedidoInput | ItemPedidoCreateOrConnectWithoutPedidoInput[]
    createMany?: ItemPedidoCreateManyPedidoInputEnvelope
    connect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
  }

  export type ItemPedidoUncheckedCreateNestedManyWithoutPedidoInput = {
    create?: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput> | ItemPedidoCreateWithoutPedidoInput[] | ItemPedidoUncheckedCreateWithoutPedidoInput[]
    connectOrCreate?: ItemPedidoCreateOrConnectWithoutPedidoInput | ItemPedidoCreateOrConnectWithoutPedidoInput[]
    createMany?: ItemPedidoCreateManyPedidoInputEnvelope
    connect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumOrigemPedidoFieldUpdateOperationsInput = {
    set?: $Enums.OrigemPedido
  }

  export type ClienteUpdateOneRequiredWithoutPedidosNestedInput = {
    create?: XOR<ClienteCreateWithoutPedidosInput, ClienteUncheckedCreateWithoutPedidosInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutPedidosInput
    upsert?: ClienteUpsertWithoutPedidosInput
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutPedidosInput, ClienteUpdateWithoutPedidosInput>, ClienteUncheckedUpdateWithoutPedidosInput>
  }

  export type ItemPedidoUpdateManyWithoutPedidoNestedInput = {
    create?: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput> | ItemPedidoCreateWithoutPedidoInput[] | ItemPedidoUncheckedCreateWithoutPedidoInput[]
    connectOrCreate?: ItemPedidoCreateOrConnectWithoutPedidoInput | ItemPedidoCreateOrConnectWithoutPedidoInput[]
    upsert?: ItemPedidoUpsertWithWhereUniqueWithoutPedidoInput | ItemPedidoUpsertWithWhereUniqueWithoutPedidoInput[]
    createMany?: ItemPedidoCreateManyPedidoInputEnvelope
    set?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    disconnect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    delete?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    connect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    update?: ItemPedidoUpdateWithWhereUniqueWithoutPedidoInput | ItemPedidoUpdateWithWhereUniqueWithoutPedidoInput[]
    updateMany?: ItemPedidoUpdateManyWithWhereWithoutPedidoInput | ItemPedidoUpdateManyWithWhereWithoutPedidoInput[]
    deleteMany?: ItemPedidoScalarWhereInput | ItemPedidoScalarWhereInput[]
  }

  export type ItemPedidoUncheckedUpdateManyWithoutPedidoNestedInput = {
    create?: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput> | ItemPedidoCreateWithoutPedidoInput[] | ItemPedidoUncheckedCreateWithoutPedidoInput[]
    connectOrCreate?: ItemPedidoCreateOrConnectWithoutPedidoInput | ItemPedidoCreateOrConnectWithoutPedidoInput[]
    upsert?: ItemPedidoUpsertWithWhereUniqueWithoutPedidoInput | ItemPedidoUpsertWithWhereUniqueWithoutPedidoInput[]
    createMany?: ItemPedidoCreateManyPedidoInputEnvelope
    set?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    disconnect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    delete?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    connect?: ItemPedidoWhereUniqueInput | ItemPedidoWhereUniqueInput[]
    update?: ItemPedidoUpdateWithWhereUniqueWithoutPedidoInput | ItemPedidoUpdateWithWhereUniqueWithoutPedidoInput[]
    updateMany?: ItemPedidoUpdateManyWithWhereWithoutPedidoInput | ItemPedidoUpdateManyWithWhereWithoutPedidoInput[]
    deleteMany?: ItemPedidoScalarWhereInput | ItemPedidoScalarWhereInput[]
  }

  export type PedidoCreateNestedOneWithoutItensInput = {
    create?: XOR<PedidoCreateWithoutItensInput, PedidoUncheckedCreateWithoutItensInput>
    connectOrCreate?: PedidoCreateOrConnectWithoutItensInput
    connect?: PedidoWhereUniqueInput
  }

  export type PedidoUpdateOneRequiredWithoutItensNestedInput = {
    create?: XOR<PedidoCreateWithoutItensInput, PedidoUncheckedCreateWithoutItensInput>
    connectOrCreate?: PedidoCreateOrConnectWithoutItensInput
    upsert?: PedidoUpsertWithoutItensInput
    connect?: PedidoWhereUniqueInput
    update?: XOR<XOR<PedidoUpdateToOneWithWhereWithoutItensInput, PedidoUpdateWithoutItensInput>, PedidoUncheckedUpdateWithoutItensInput>
  }

  export type ClienteCreateNestedOneWithoutInteracoesInput = {
    create?: XOR<ClienteCreateWithoutInteracoesInput, ClienteUncheckedCreateWithoutInteracoesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutInteracoesInput
    connect?: ClienteWhereUniqueInput
  }

  export type EnumTipoInteracaoFieldUpdateOperationsInput = {
    set?: $Enums.TipoInteracao
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ClienteUpdateOneRequiredWithoutInteracoesNestedInput = {
    create?: XOR<ClienteCreateWithoutInteracoesInput, ClienteUncheckedCreateWithoutInteracoesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutInteracoesInput
    upsert?: ClienteUpsertWithoutInteracoesInput
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutInteracoesInput, ClienteUpdateWithoutInteracoesInput>, ClienteUncheckedUpdateWithoutInteracoesInput>
  }

  export type ClienteCreateNestedOneWithoutOportunidadesInput = {
    create?: XOR<ClienteCreateWithoutOportunidadesInput, ClienteUncheckedCreateWithoutOportunidadesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutOportunidadesInput
    connect?: ClienteWhereUniqueInput
  }

  export type UsuarioCreateNestedOneWithoutOportunidadesInput = {
    create?: XOR<UsuarioCreateWithoutOportunidadesInput, UsuarioUncheckedCreateWithoutOportunidadesInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutOportunidadesInput
    connect?: UsuarioWhereUniqueInput
  }

  export type EnumTipoOportunidadeFieldUpdateOperationsInput = {
    set?: $Enums.TipoOportunidade
  }

  export type EnumPrioridadeOportunidadeFieldUpdateOperationsInput = {
    set?: $Enums.PrioridadeOportunidade
  }

  export type EnumStatusOportunidadeFieldUpdateOperationsInput = {
    set?: $Enums.StatusOportunidade
  }

  export type ClienteUpdateOneRequiredWithoutOportunidadesNestedInput = {
    create?: XOR<ClienteCreateWithoutOportunidadesInput, ClienteUncheckedCreateWithoutOportunidadesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutOportunidadesInput
    upsert?: ClienteUpsertWithoutOportunidadesInput
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutOportunidadesInput, ClienteUpdateWithoutOportunidadesInput>, ClienteUncheckedUpdateWithoutOportunidadesInput>
  }

  export type UsuarioUpdateOneWithoutOportunidadesNestedInput = {
    create?: XOR<UsuarioCreateWithoutOportunidadesInput, UsuarioUncheckedCreateWithoutOportunidadesInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutOportunidadesInput
    upsert?: UsuarioUpsertWithoutOportunidadesInput
    disconnect?: UsuarioWhereInput | boolean
    delete?: UsuarioWhereInput | boolean
    connect?: UsuarioWhereUniqueInput
    update?: XOR<XOR<UsuarioUpdateToOneWithWhereWithoutOportunidadesInput, UsuarioUpdateWithoutOportunidadesInput>, UsuarioUncheckedUpdateWithoutOportunidadesInput>
  }

  export type ClienteCreateNestedOneWithoutMensagensInput = {
    create?: XOR<ClienteCreateWithoutMensagensInput, ClienteUncheckedCreateWithoutMensagensInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutMensagensInput
    connect?: ClienteWhereUniqueInput
  }

  export type UsuarioCreateNestedOneWithoutMensagensInput = {
    create?: XOR<UsuarioCreateWithoutMensagensInput, UsuarioUncheckedCreateWithoutMensagensInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutMensagensInput
    connect?: UsuarioWhereUniqueInput
  }

  export type EnumTipoMensagemFieldUpdateOperationsInput = {
    set?: $Enums.TipoMensagem
  }

  export type EnumStatusEnvioMensagemFieldUpdateOperationsInput = {
    set?: $Enums.StatusEnvioMensagem
  }

  export type ClienteUpdateOneRequiredWithoutMensagensNestedInput = {
    create?: XOR<ClienteCreateWithoutMensagensInput, ClienteUncheckedCreateWithoutMensagensInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutMensagensInput
    upsert?: ClienteUpsertWithoutMensagensInput
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutMensagensInput, ClienteUpdateWithoutMensagensInput>, ClienteUncheckedUpdateWithoutMensagensInput>
  }

  export type UsuarioUpdateOneWithoutMensagensNestedInput = {
    create?: XOR<UsuarioCreateWithoutMensagensInput, UsuarioUncheckedCreateWithoutMensagensInput>
    connectOrCreate?: UsuarioCreateOrConnectWithoutMensagensInput
    upsert?: UsuarioUpsertWithoutMensagensInput
    disconnect?: UsuarioWhereInput | boolean
    delete?: UsuarioWhereInput | boolean
    connect?: UsuarioWhereUniqueInput
    update?: XOR<XOR<UsuarioUpdateToOneWithWhereWithoutMensagensInput, UsuarioUpdateWithoutMensagensInput>, UsuarioUncheckedUpdateWithoutMensagensInput>
  }

  export type ClienteCreateNestedOneWithoutExecucoesInput = {
    create?: XOR<ClienteCreateWithoutExecucoesInput, ClienteUncheckedCreateWithoutExecucoesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutExecucoesInput
    connect?: ClienteWhereUniqueInput
  }

  export type EnumAcaoApiFieldUpdateOperationsInput = {
    set?: $Enums.AcaoApi
  }

  export type EnumStatusExecucaoApiFieldUpdateOperationsInput = {
    set?: $Enums.StatusExecucaoApi
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ClienteUpdateOneWithoutExecucoesNestedInput = {
    create?: XOR<ClienteCreateWithoutExecucoesInput, ClienteUncheckedCreateWithoutExecucoesInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutExecucoesInput
    upsert?: ClienteUpsertWithoutExecucoesInput
    disconnect?: ClienteWhereInput | boolean
    delete?: ClienteWhereInput | boolean
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutExecucoesInput, ClienteUpdateWithoutExecucoesInput>, ClienteUncheckedUpdateWithoutExecucoesInput>
  }

  export type EnumPeriodoKpiFieldUpdateOperationsInput = {
    set?: $Enums.PeriodoKpi
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumPerfilUsuarioFilter<$PrismaModel = never> = {
    equals?: $Enums.PerfilUsuario | EnumPerfilUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.PerfilUsuario[]
    notIn?: $Enums.PerfilUsuario[]
    not?: NestedEnumPerfilUsuarioFilter<$PrismaModel> | $Enums.PerfilUsuario
  }

  export type NestedEnumStatusUsuarioFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusUsuario | EnumStatusUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.StatusUsuario[]
    notIn?: $Enums.StatusUsuario[]
    not?: NestedEnumStatusUsuarioFilter<$PrismaModel> | $Enums.StatusUsuario
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumPerfilUsuarioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PerfilUsuario | EnumPerfilUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.PerfilUsuario[]
    notIn?: $Enums.PerfilUsuario[]
    not?: NestedEnumPerfilUsuarioWithAggregatesFilter<$PrismaModel> | $Enums.PerfilUsuario
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPerfilUsuarioFilter<$PrismaModel>
    _max?: NestedEnumPerfilUsuarioFilter<$PrismaModel>
  }

  export type NestedEnumStatusUsuarioWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusUsuario | EnumStatusUsuarioFieldRefInput<$PrismaModel>
    in?: $Enums.StatusUsuario[]
    notIn?: $Enums.StatusUsuario[]
    not?: NestedEnumStatusUsuarioWithAggregatesFilter<$PrismaModel> | $Enums.StatusUsuario
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusUsuarioFilter<$PrismaModel>
    _max?: NestedEnumStatusUsuarioFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumTipoClienteFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoCliente | EnumTipoClienteFieldRefInput<$PrismaModel>
    in?: $Enums.TipoCliente[]
    notIn?: $Enums.TipoCliente[]
    not?: NestedEnumTipoClienteFilter<$PrismaModel> | $Enums.TipoCliente
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumStatusRelacionamentoFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusRelacionamento | EnumStatusRelacionamentoFieldRefInput<$PrismaModel>
    in?: $Enums.StatusRelacionamento[]
    notIn?: $Enums.StatusRelacionamento[]
    not?: NestedEnumStatusRelacionamentoFilter<$PrismaModel> | $Enums.StatusRelacionamento
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumTipoClienteWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoCliente | EnumTipoClienteFieldRefInput<$PrismaModel>
    in?: $Enums.TipoCliente[]
    notIn?: $Enums.TipoCliente[]
    not?: NestedEnumTipoClienteWithAggregatesFilter<$PrismaModel> | $Enums.TipoCliente
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoClienteFilter<$PrismaModel>
    _max?: NestedEnumTipoClienteFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumStatusRelacionamentoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusRelacionamento | EnumStatusRelacionamentoFieldRefInput<$PrismaModel>
    in?: $Enums.StatusRelacionamento[]
    notIn?: $Enums.StatusRelacionamento[]
    not?: NestedEnumStatusRelacionamentoWithAggregatesFilter<$PrismaModel> | $Enums.StatusRelacionamento
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusRelacionamentoFilter<$PrismaModel>
    _max?: NestedEnumStatusRelacionamentoFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedEnumOrigemPedidoFilter<$PrismaModel = never> = {
    equals?: $Enums.OrigemPedido | EnumOrigemPedidoFieldRefInput<$PrismaModel>
    in?: $Enums.OrigemPedido[]
    notIn?: $Enums.OrigemPedido[]
    not?: NestedEnumOrigemPedidoFilter<$PrismaModel> | $Enums.OrigemPedido
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumOrigemPedidoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.OrigemPedido | EnumOrigemPedidoFieldRefInput<$PrismaModel>
    in?: $Enums.OrigemPedido[]
    notIn?: $Enums.OrigemPedido[]
    not?: NestedEnumOrigemPedidoWithAggregatesFilter<$PrismaModel> | $Enums.OrigemPedido
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumOrigemPedidoFilter<$PrismaModel>
    _max?: NestedEnumOrigemPedidoFilter<$PrismaModel>
  }

  export type NestedEnumTipoInteracaoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoInteracao | EnumTipoInteracaoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoInteracao[]
    notIn?: $Enums.TipoInteracao[]
    not?: NestedEnumTipoInteracaoFilter<$PrismaModel> | $Enums.TipoInteracao
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumTipoInteracaoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoInteracao | EnumTipoInteracaoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoInteracao[]
    notIn?: $Enums.TipoInteracao[]
    not?: NestedEnumTipoInteracaoWithAggregatesFilter<$PrismaModel> | $Enums.TipoInteracao
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoInteracaoFilter<$PrismaModel>
    _max?: NestedEnumTipoInteracaoFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumTipoOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoOportunidade | EnumTipoOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.TipoOportunidade[]
    notIn?: $Enums.TipoOportunidade[]
    not?: NestedEnumTipoOportunidadeFilter<$PrismaModel> | $Enums.TipoOportunidade
  }

  export type NestedEnumPrioridadeOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadeOportunidade | EnumPrioridadeOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadeOportunidade[]
    notIn?: $Enums.PrioridadeOportunidade[]
    not?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel> | $Enums.PrioridadeOportunidade
  }

  export type NestedEnumStatusOportunidadeFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusOportunidade | EnumStatusOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.StatusOportunidade[]
    notIn?: $Enums.StatusOportunidade[]
    not?: NestedEnumStatusOportunidadeFilter<$PrismaModel> | $Enums.StatusOportunidade
  }

  export type NestedEnumTipoOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoOportunidade | EnumTipoOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.TipoOportunidade[]
    notIn?: $Enums.TipoOportunidade[]
    not?: NestedEnumTipoOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.TipoOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumTipoOportunidadeFilter<$PrismaModel>
  }

  export type NestedEnumPrioridadeOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PrioridadeOportunidade | EnumPrioridadeOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.PrioridadeOportunidade[]
    notIn?: $Enums.PrioridadeOportunidade[]
    not?: NestedEnumPrioridadeOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.PrioridadeOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumPrioridadeOportunidadeFilter<$PrismaModel>
  }

  export type NestedEnumStatusOportunidadeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusOportunidade | EnumStatusOportunidadeFieldRefInput<$PrismaModel>
    in?: $Enums.StatusOportunidade[]
    notIn?: $Enums.StatusOportunidade[]
    not?: NestedEnumStatusOportunidadeWithAggregatesFilter<$PrismaModel> | $Enums.StatusOportunidade
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusOportunidadeFilter<$PrismaModel>
    _max?: NestedEnumStatusOportunidadeFilter<$PrismaModel>
  }

  export type NestedEnumTipoMensagemFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMensagem | EnumTipoMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.TipoMensagem[]
    notIn?: $Enums.TipoMensagem[]
    not?: NestedEnumTipoMensagemFilter<$PrismaModel> | $Enums.TipoMensagem
  }

  export type NestedEnumStatusEnvioMensagemFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusEnvioMensagem | EnumStatusEnvioMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.StatusEnvioMensagem[]
    notIn?: $Enums.StatusEnvioMensagem[]
    not?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel> | $Enums.StatusEnvioMensagem
  }

  export type NestedEnumTipoMensagemWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoMensagem | EnumTipoMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.TipoMensagem[]
    notIn?: $Enums.TipoMensagem[]
    not?: NestedEnumTipoMensagemWithAggregatesFilter<$PrismaModel> | $Enums.TipoMensagem
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoMensagemFilter<$PrismaModel>
    _max?: NestedEnumTipoMensagemFilter<$PrismaModel>
  }

  export type NestedEnumStatusEnvioMensagemWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusEnvioMensagem | EnumStatusEnvioMensagemFieldRefInput<$PrismaModel>
    in?: $Enums.StatusEnvioMensagem[]
    notIn?: $Enums.StatusEnvioMensagem[]
    not?: NestedEnumStatusEnvioMensagemWithAggregatesFilter<$PrismaModel> | $Enums.StatusEnvioMensagem
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel>
    _max?: NestedEnumStatusEnvioMensagemFilter<$PrismaModel>
  }

  export type NestedEnumAcaoApiFilter<$PrismaModel = never> = {
    equals?: $Enums.AcaoApi | EnumAcaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.AcaoApi[]
    notIn?: $Enums.AcaoApi[]
    not?: NestedEnumAcaoApiFilter<$PrismaModel> | $Enums.AcaoApi
  }

  export type NestedEnumStatusExecucaoApiFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusExecucaoApi | EnumStatusExecucaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.StatusExecucaoApi[]
    notIn?: $Enums.StatusExecucaoApi[]
    not?: NestedEnumStatusExecucaoApiFilter<$PrismaModel> | $Enums.StatusExecucaoApi
  }

  export type NestedEnumAcaoApiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AcaoApi | EnumAcaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.AcaoApi[]
    notIn?: $Enums.AcaoApi[]
    not?: NestedEnumAcaoApiWithAggregatesFilter<$PrismaModel> | $Enums.AcaoApi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAcaoApiFilter<$PrismaModel>
    _max?: NestedEnumAcaoApiFilter<$PrismaModel>
  }

  export type NestedEnumStatusExecucaoApiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StatusExecucaoApi | EnumStatusExecucaoApiFieldRefInput<$PrismaModel>
    in?: $Enums.StatusExecucaoApi[]
    notIn?: $Enums.StatusExecucaoApi[]
    not?: NestedEnumStatusExecucaoApiWithAggregatesFilter<$PrismaModel> | $Enums.StatusExecucaoApi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStatusExecucaoApiFilter<$PrismaModel>
    _max?: NestedEnumStatusExecucaoApiFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumPeriodoKpiFilter<$PrismaModel = never> = {
    equals?: $Enums.PeriodoKpi | EnumPeriodoKpiFieldRefInput<$PrismaModel>
    in?: $Enums.PeriodoKpi[]
    notIn?: $Enums.PeriodoKpi[]
    not?: NestedEnumPeriodoKpiFilter<$PrismaModel> | $Enums.PeriodoKpi
  }

  export type NestedEnumPeriodoKpiWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PeriodoKpi | EnumPeriodoKpiFieldRefInput<$PrismaModel>
    in?: $Enums.PeriodoKpi[]
    notIn?: $Enums.PeriodoKpi[]
    not?: NestedEnumPeriodoKpiWithAggregatesFilter<$PrismaModel> | $Enums.PeriodoKpi
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPeriodoKpiFilter<$PrismaModel>
    _max?: NestedEnumPeriodoKpiFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type MensagemCreateWithoutAprovadorInput = {
    id?: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
    cliente: ClienteCreateNestedOneWithoutMensagensInput
  }

  export type MensagemUncheckedCreateWithoutAprovadorInput = {
    id?: string
    clienteId: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type MensagemCreateOrConnectWithoutAprovadorInput = {
    where: MensagemWhereUniqueInput
    create: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput>
  }

  export type MensagemCreateManyAprovadorInputEnvelope = {
    data: MensagemCreateManyAprovadorInput | MensagemCreateManyAprovadorInput[]
    skipDuplicates?: boolean
  }

  export type RefreshTokenCreateWithoutUsuarioInput = {
    id?: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
  }

  export type RefreshTokenUncheckedCreateWithoutUsuarioInput = {
    id?: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
  }

  export type RefreshTokenCreateOrConnectWithoutUsuarioInput = {
    where: RefreshTokenWhereUniqueInput
    create: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput>
  }

  export type RefreshTokenCreateManyUsuarioInputEnvelope = {
    data: RefreshTokenCreateManyUsuarioInput | RefreshTokenCreateManyUsuarioInput[]
    skipDuplicates?: boolean
  }

  export type OportunidadeCreateWithoutResponsavelInput = {
    id?: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    cliente: ClienteCreateNestedOneWithoutOportunidadesInput
  }

  export type OportunidadeUncheckedCreateWithoutResponsavelInput = {
    id?: string
    clienteId: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
  }

  export type OportunidadeCreateOrConnectWithoutResponsavelInput = {
    where: OportunidadeWhereUniqueInput
    create: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput>
  }

  export type OportunidadeCreateManyResponsavelInputEnvelope = {
    data: OportunidadeCreateManyResponsavelInput | OportunidadeCreateManyResponsavelInput[]
    skipDuplicates?: boolean
  }

  export type MensagemUpsertWithWhereUniqueWithoutAprovadorInput = {
    where: MensagemWhereUniqueInput
    update: XOR<MensagemUpdateWithoutAprovadorInput, MensagemUncheckedUpdateWithoutAprovadorInput>
    create: XOR<MensagemCreateWithoutAprovadorInput, MensagemUncheckedCreateWithoutAprovadorInput>
  }

  export type MensagemUpdateWithWhereUniqueWithoutAprovadorInput = {
    where: MensagemWhereUniqueInput
    data: XOR<MensagemUpdateWithoutAprovadorInput, MensagemUncheckedUpdateWithoutAprovadorInput>
  }

  export type MensagemUpdateManyWithWhereWithoutAprovadorInput = {
    where: MensagemScalarWhereInput
    data: XOR<MensagemUpdateManyMutationInput, MensagemUncheckedUpdateManyWithoutAprovadorInput>
  }

  export type MensagemScalarWhereInput = {
    AND?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
    OR?: MensagemScalarWhereInput[]
    NOT?: MensagemScalarWhereInput | MensagemScalarWhereInput[]
    id?: StringFilter<"Mensagem"> | string
    clienteId?: StringFilter<"Mensagem"> | string
    tipoMensagem?: EnumTipoMensagemFilter<"Mensagem"> | $Enums.TipoMensagem
    conteudoSugerido?: StringFilter<"Mensagem"> | string
    conteudoFinal?: StringNullableFilter<"Mensagem"> | string | null
    statusEnvio?: EnumStatusEnvioMensagemFilter<"Mensagem"> | $Enums.StatusEnvioMensagem
    sensivel?: BoolFilter<"Mensagem"> | boolean
    dataCriacao?: DateTimeFilter<"Mensagem"> | Date | string
    dataAprovacao?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    dataEnvio?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    aprovadorId?: StringNullableFilter<"Mensagem"> | string | null
    canalEnvio?: StringFilter<"Mensagem"> | string
    agendadoPara?: DateTimeNullableFilter<"Mensagem"> | Date | string | null
    justificativaRejeicao?: StringNullableFilter<"Mensagem"> | string | null
  }

  export type RefreshTokenUpsertWithWhereUniqueWithoutUsuarioInput = {
    where: RefreshTokenWhereUniqueInput
    update: XOR<RefreshTokenUpdateWithoutUsuarioInput, RefreshTokenUncheckedUpdateWithoutUsuarioInput>
    create: XOR<RefreshTokenCreateWithoutUsuarioInput, RefreshTokenUncheckedCreateWithoutUsuarioInput>
  }

  export type RefreshTokenUpdateWithWhereUniqueWithoutUsuarioInput = {
    where: RefreshTokenWhereUniqueInput
    data: XOR<RefreshTokenUpdateWithoutUsuarioInput, RefreshTokenUncheckedUpdateWithoutUsuarioInput>
  }

  export type RefreshTokenUpdateManyWithWhereWithoutUsuarioInput = {
    where: RefreshTokenScalarWhereInput
    data: XOR<RefreshTokenUpdateManyMutationInput, RefreshTokenUncheckedUpdateManyWithoutUsuarioInput>
  }

  export type RefreshTokenScalarWhereInput = {
    AND?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
    OR?: RefreshTokenScalarWhereInput[]
    NOT?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
    id?: StringFilter<"RefreshToken"> | string
    usuarioId?: StringFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    expiresEm?: DateTimeFilter<"RefreshToken"> | Date | string
    revogadoEm?: DateTimeNullableFilter<"RefreshToken"> | Date | string | null
  }

  export type OportunidadeUpsertWithWhereUniqueWithoutResponsavelInput = {
    where: OportunidadeWhereUniqueInput
    update: XOR<OportunidadeUpdateWithoutResponsavelInput, OportunidadeUncheckedUpdateWithoutResponsavelInput>
    create: XOR<OportunidadeCreateWithoutResponsavelInput, OportunidadeUncheckedCreateWithoutResponsavelInput>
  }

  export type OportunidadeUpdateWithWhereUniqueWithoutResponsavelInput = {
    where: OportunidadeWhereUniqueInput
    data: XOR<OportunidadeUpdateWithoutResponsavelInput, OportunidadeUncheckedUpdateWithoutResponsavelInput>
  }

  export type OportunidadeUpdateManyWithWhereWithoutResponsavelInput = {
    where: OportunidadeScalarWhereInput
    data: XOR<OportunidadeUpdateManyMutationInput, OportunidadeUncheckedUpdateManyWithoutResponsavelInput>
  }

  export type OportunidadeScalarWhereInput = {
    AND?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
    OR?: OportunidadeScalarWhereInput[]
    NOT?: OportunidadeScalarWhereInput | OportunidadeScalarWhereInput[]
    id?: StringFilter<"Oportunidade"> | string
    clienteId?: StringFilter<"Oportunidade"> | string
    tipoOportunidade?: EnumTipoOportunidadeFilter<"Oportunidade"> | $Enums.TipoOportunidade
    descricao?: StringFilter<"Oportunidade"> | string
    valorEstimado?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: DecimalNullableFilter<"Oportunidade"> | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFilter<"Oportunidade"> | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFilter<"Oportunidade"> | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFilter<"Oportunidade"> | Date | string
    dataFechamento?: DateTimeNullableFilter<"Oportunidade"> | Date | string | null
    responsavelId?: StringNullableFilter<"Oportunidade"> | string | null
  }

  export type UsuarioCreateWithoutRefreshTokensInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemCreateNestedManyWithoutAprovadorInput
    oportunidades?: OportunidadeCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioUncheckedCreateWithoutRefreshTokensInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemUncheckedCreateNestedManyWithoutAprovadorInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioCreateOrConnectWithoutRefreshTokensInput = {
    where: UsuarioWhereUniqueInput
    create: XOR<UsuarioCreateWithoutRefreshTokensInput, UsuarioUncheckedCreateWithoutRefreshTokensInput>
  }

  export type UsuarioUpsertWithoutRefreshTokensInput = {
    update: XOR<UsuarioUpdateWithoutRefreshTokensInput, UsuarioUncheckedUpdateWithoutRefreshTokensInput>
    create: XOR<UsuarioCreateWithoutRefreshTokensInput, UsuarioUncheckedCreateWithoutRefreshTokensInput>
    where?: UsuarioWhereInput
  }

  export type UsuarioUpdateToOneWithWhereWithoutRefreshTokensInput = {
    where?: UsuarioWhereInput
    data: XOR<UsuarioUpdateWithoutRefreshTokensInput, UsuarioUncheckedUpdateWithoutRefreshTokensInput>
  }

  export type UsuarioUpdateWithoutRefreshTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUpdateManyWithoutAprovadorNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutResponsavelNestedInput
  }

  export type UsuarioUncheckedUpdateWithoutRefreshTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUncheckedUpdateManyWithoutAprovadorNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutResponsavelNestedInput
  }

  export type PedidoCreateWithoutClienteInput = {
    id?: string
    externalId?: string | null
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    itens?: ItemPedidoCreateNestedManyWithoutPedidoInput
  }

  export type PedidoUncheckedCreateWithoutClienteInput = {
    id?: string
    externalId?: string | null
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    itens?: ItemPedidoUncheckedCreateNestedManyWithoutPedidoInput
  }

  export type PedidoCreateOrConnectWithoutClienteInput = {
    where: PedidoWhereUniqueInput
    create: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput>
  }

  export type PedidoCreateManyClienteInputEnvelope = {
    data: PedidoCreateManyClienteInput | PedidoCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type InteracaoCreateWithoutClienteInput = {
    id?: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
  }

  export type InteracaoUncheckedCreateWithoutClienteInput = {
    id?: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
  }

  export type InteracaoCreateOrConnectWithoutClienteInput = {
    where: InteracaoWhereUniqueInput
    create: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput>
  }

  export type InteracaoCreateManyClienteInputEnvelope = {
    data: InteracaoCreateManyClienteInput | InteracaoCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type OportunidadeCreateWithoutClienteInput = {
    id?: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    responsavel?: UsuarioCreateNestedOneWithoutOportunidadesInput
  }

  export type OportunidadeUncheckedCreateWithoutClienteInput = {
    id?: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    responsavelId?: string | null
  }

  export type OportunidadeCreateOrConnectWithoutClienteInput = {
    where: OportunidadeWhereUniqueInput
    create: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput>
  }

  export type OportunidadeCreateManyClienteInputEnvelope = {
    data: OportunidadeCreateManyClienteInput | OportunidadeCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type MensagemCreateWithoutClienteInput = {
    id?: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
    aprovador?: UsuarioCreateNestedOneWithoutMensagensInput
  }

  export type MensagemUncheckedCreateWithoutClienteInput = {
    id?: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    aprovadorId?: string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type MensagemCreateOrConnectWithoutClienteInput = {
    where: MensagemWhereUniqueInput
    create: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput>
  }

  export type MensagemCreateManyClienteInputEnvelope = {
    data: MensagemCreateManyClienteInput | MensagemCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type ExecucaoApiCreateWithoutClienteInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
  }

  export type ExecucaoApiUncheckedCreateWithoutClienteInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
  }

  export type ExecucaoApiCreateOrConnectWithoutClienteInput = {
    where: ExecucaoApiWhereUniqueInput
    create: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput>
  }

  export type ExecucaoApiCreateManyClienteInputEnvelope = {
    data: ExecucaoApiCreateManyClienteInput | ExecucaoApiCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type PedidoUpsertWithWhereUniqueWithoutClienteInput = {
    where: PedidoWhereUniqueInput
    update: XOR<PedidoUpdateWithoutClienteInput, PedidoUncheckedUpdateWithoutClienteInput>
    create: XOR<PedidoCreateWithoutClienteInput, PedidoUncheckedCreateWithoutClienteInput>
  }

  export type PedidoUpdateWithWhereUniqueWithoutClienteInput = {
    where: PedidoWhereUniqueInput
    data: XOR<PedidoUpdateWithoutClienteInput, PedidoUncheckedUpdateWithoutClienteInput>
  }

  export type PedidoUpdateManyWithWhereWithoutClienteInput = {
    where: PedidoScalarWhereInput
    data: XOR<PedidoUpdateManyMutationInput, PedidoUncheckedUpdateManyWithoutClienteInput>
  }

  export type PedidoScalarWhereInput = {
    AND?: PedidoScalarWhereInput | PedidoScalarWhereInput[]
    OR?: PedidoScalarWhereInput[]
    NOT?: PedidoScalarWhereInput | PedidoScalarWhereInput[]
    id?: StringFilter<"Pedido"> | string
    externalId?: StringNullableFilter<"Pedido"> | string | null
    clienteId?: StringFilter<"Pedido"> | string
    dataPedido?: DateTimeFilter<"Pedido"> | Date | string
    valorTotal?: DecimalFilter<"Pedido"> | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFilter<"Pedido"> | string
    origemPedido?: EnumOrigemPedidoFilter<"Pedido"> | $Enums.OrigemPedido
  }

  export type InteracaoUpsertWithWhereUniqueWithoutClienteInput = {
    where: InteracaoWhereUniqueInput
    update: XOR<InteracaoUpdateWithoutClienteInput, InteracaoUncheckedUpdateWithoutClienteInput>
    create: XOR<InteracaoCreateWithoutClienteInput, InteracaoUncheckedCreateWithoutClienteInput>
  }

  export type InteracaoUpdateWithWhereUniqueWithoutClienteInput = {
    where: InteracaoWhereUniqueInput
    data: XOR<InteracaoUpdateWithoutClienteInput, InteracaoUncheckedUpdateWithoutClienteInput>
  }

  export type InteracaoUpdateManyWithWhereWithoutClienteInput = {
    where: InteracaoScalarWhereInput
    data: XOR<InteracaoUpdateManyMutationInput, InteracaoUncheckedUpdateManyWithoutClienteInput>
  }

  export type InteracaoScalarWhereInput = {
    AND?: InteracaoScalarWhereInput | InteracaoScalarWhereInput[]
    OR?: InteracaoScalarWhereInput[]
    NOT?: InteracaoScalarWhereInput | InteracaoScalarWhereInput[]
    id?: StringFilter<"Interacao"> | string
    clienteId?: StringFilter<"Interacao"> | string
    tipoInteracao?: EnumTipoInteracaoFilter<"Interacao"> | $Enums.TipoInteracao
    dataInteracao?: DateTimeFilter<"Interacao"> | Date | string
    resumo?: StringNullableFilter<"Interacao"> | string | null
    sentimento?: DecimalNullableFilter<"Interacao"> | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFilter<"Interacao"> | boolean
    riscoDetectado?: BoolFilter<"Interacao"> | boolean
    conteudoBruto?: StringNullableFilter<"Interacao"> | string | null
  }

  export type OportunidadeUpsertWithWhereUniqueWithoutClienteInput = {
    where: OportunidadeWhereUniqueInput
    update: XOR<OportunidadeUpdateWithoutClienteInput, OportunidadeUncheckedUpdateWithoutClienteInput>
    create: XOR<OportunidadeCreateWithoutClienteInput, OportunidadeUncheckedCreateWithoutClienteInput>
  }

  export type OportunidadeUpdateWithWhereUniqueWithoutClienteInput = {
    where: OportunidadeWhereUniqueInput
    data: XOR<OportunidadeUpdateWithoutClienteInput, OportunidadeUncheckedUpdateWithoutClienteInput>
  }

  export type OportunidadeUpdateManyWithWhereWithoutClienteInput = {
    where: OportunidadeScalarWhereInput
    data: XOR<OportunidadeUpdateManyMutationInput, OportunidadeUncheckedUpdateManyWithoutClienteInput>
  }

  export type MensagemUpsertWithWhereUniqueWithoutClienteInput = {
    where: MensagemWhereUniqueInput
    update: XOR<MensagemUpdateWithoutClienteInput, MensagemUncheckedUpdateWithoutClienteInput>
    create: XOR<MensagemCreateWithoutClienteInput, MensagemUncheckedCreateWithoutClienteInput>
  }

  export type MensagemUpdateWithWhereUniqueWithoutClienteInput = {
    where: MensagemWhereUniqueInput
    data: XOR<MensagemUpdateWithoutClienteInput, MensagemUncheckedUpdateWithoutClienteInput>
  }

  export type MensagemUpdateManyWithWhereWithoutClienteInput = {
    where: MensagemScalarWhereInput
    data: XOR<MensagemUpdateManyMutationInput, MensagemUncheckedUpdateManyWithoutClienteInput>
  }

  export type ExecucaoApiUpsertWithWhereUniqueWithoutClienteInput = {
    where: ExecucaoApiWhereUniqueInput
    update: XOR<ExecucaoApiUpdateWithoutClienteInput, ExecucaoApiUncheckedUpdateWithoutClienteInput>
    create: XOR<ExecucaoApiCreateWithoutClienteInput, ExecucaoApiUncheckedCreateWithoutClienteInput>
  }

  export type ExecucaoApiUpdateWithWhereUniqueWithoutClienteInput = {
    where: ExecucaoApiWhereUniqueInput
    data: XOR<ExecucaoApiUpdateWithoutClienteInput, ExecucaoApiUncheckedUpdateWithoutClienteInput>
  }

  export type ExecucaoApiUpdateManyWithWhereWithoutClienteInput = {
    where: ExecucaoApiScalarWhereInput
    data: XOR<ExecucaoApiUpdateManyMutationInput, ExecucaoApiUncheckedUpdateManyWithoutClienteInput>
  }

  export type ExecucaoApiScalarWhereInput = {
    AND?: ExecucaoApiScalarWhereInput | ExecucaoApiScalarWhereInput[]
    OR?: ExecucaoApiScalarWhereInput[]
    NOT?: ExecucaoApiScalarWhereInput | ExecucaoApiScalarWhereInput[]
    id?: StringFilter<"ExecucaoApi"> | string
    acaoApi?: EnumAcaoApiFilter<"ExecucaoApi"> | $Enums.AcaoApi
    dataExecucao?: DateTimeFilter<"ExecucaoApi"> | Date | string
    statusExecucao?: EnumStatusExecucaoApiFilter<"ExecucaoApi"> | $Enums.StatusExecucaoApi
    clienteId?: StringNullableFilter<"ExecucaoApi"> | string | null
    detalhesExecucao?: JsonFilter<"ExecucaoApi">
    mensagemErro?: StringNullableFilter<"ExecucaoApi"> | string | null
    duracaoMs?: IntNullableFilter<"ExecucaoApi"> | number | null
  }

  export type ClienteCreateWithoutPedidosInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    interacoes?: InteracaoCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeCreateNestedManyWithoutClienteInput
    mensagens?: MensagemCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateWithoutPedidosInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    interacoes?: InteracaoUncheckedCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutClienteInput
    mensagens?: MensagemUncheckedCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteCreateOrConnectWithoutPedidosInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutPedidosInput, ClienteUncheckedCreateWithoutPedidosInput>
  }

  export type ItemPedidoCreateWithoutPedidoInput = {
    id?: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUncheckedCreateWithoutPedidoInput = {
    id?: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoCreateOrConnectWithoutPedidoInput = {
    where: ItemPedidoWhereUniqueInput
    create: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput>
  }

  export type ItemPedidoCreateManyPedidoInputEnvelope = {
    data: ItemPedidoCreateManyPedidoInput | ItemPedidoCreateManyPedidoInput[]
    skipDuplicates?: boolean
  }

  export type ClienteUpsertWithoutPedidosInput = {
    update: XOR<ClienteUpdateWithoutPedidosInput, ClienteUncheckedUpdateWithoutPedidosInput>
    create: XOR<ClienteCreateWithoutPedidosInput, ClienteUncheckedCreateWithoutPedidosInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutPedidosInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutPedidosInput, ClienteUncheckedUpdateWithoutPedidosInput>
  }

  export type ClienteUpdateWithoutPedidosInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    interacoes?: InteracaoUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateWithoutPedidosInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    interacoes?: InteracaoUncheckedUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUncheckedUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type ItemPedidoUpsertWithWhereUniqueWithoutPedidoInput = {
    where: ItemPedidoWhereUniqueInput
    update: XOR<ItemPedidoUpdateWithoutPedidoInput, ItemPedidoUncheckedUpdateWithoutPedidoInput>
    create: XOR<ItemPedidoCreateWithoutPedidoInput, ItemPedidoUncheckedCreateWithoutPedidoInput>
  }

  export type ItemPedidoUpdateWithWhereUniqueWithoutPedidoInput = {
    where: ItemPedidoWhereUniqueInput
    data: XOR<ItemPedidoUpdateWithoutPedidoInput, ItemPedidoUncheckedUpdateWithoutPedidoInput>
  }

  export type ItemPedidoUpdateManyWithWhereWithoutPedidoInput = {
    where: ItemPedidoScalarWhereInput
    data: XOR<ItemPedidoUpdateManyMutationInput, ItemPedidoUncheckedUpdateManyWithoutPedidoInput>
  }

  export type ItemPedidoScalarWhereInput = {
    AND?: ItemPedidoScalarWhereInput | ItemPedidoScalarWhereInput[]
    OR?: ItemPedidoScalarWhereInput[]
    NOT?: ItemPedidoScalarWhereInput | ItemPedidoScalarWhereInput[]
    id?: StringFilter<"ItemPedido"> | string
    pedidoId?: StringFilter<"ItemPedido"> | string
    sku?: StringNullableFilter<"ItemPedido"> | string | null
    produto?: StringFilter<"ItemPedido"> | string
    categoria?: StringNullableFilter<"ItemPedido"> | string | null
    quantidade?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFilter<"ItemPedido"> | Decimal | DecimalJsLike | number | string
  }

  export type PedidoCreateWithoutItensInput = {
    id?: string
    externalId?: string | null
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
    cliente: ClienteCreateNestedOneWithoutPedidosInput
  }

  export type PedidoUncheckedCreateWithoutItensInput = {
    id?: string
    externalId?: string | null
    clienteId: string
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
  }

  export type PedidoCreateOrConnectWithoutItensInput = {
    where: PedidoWhereUniqueInput
    create: XOR<PedidoCreateWithoutItensInput, PedidoUncheckedCreateWithoutItensInput>
  }

  export type PedidoUpsertWithoutItensInput = {
    update: XOR<PedidoUpdateWithoutItensInput, PedidoUncheckedUpdateWithoutItensInput>
    create: XOR<PedidoCreateWithoutItensInput, PedidoUncheckedCreateWithoutItensInput>
    where?: PedidoWhereInput
  }

  export type PedidoUpdateToOneWithWhereWithoutItensInput = {
    where?: PedidoWhereInput
    data: XOR<PedidoUpdateWithoutItensInput, PedidoUncheckedUpdateWithoutItensInput>
  }

  export type PedidoUpdateWithoutItensInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
    cliente?: ClienteUpdateOneRequiredWithoutPedidosNestedInput
  }

  export type PedidoUncheckedUpdateWithoutItensInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: StringFieldUpdateOperationsInput | string
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
  }

  export type ClienteCreateWithoutInteracoesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeCreateNestedManyWithoutClienteInput
    mensagens?: MensagemCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateWithoutInteracoesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoUncheckedCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutClienteInput
    mensagens?: MensagemUncheckedCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteCreateOrConnectWithoutInteracoesInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutInteracoesInput, ClienteUncheckedCreateWithoutInteracoesInput>
  }

  export type ClienteUpsertWithoutInteracoesInput = {
    update: XOR<ClienteUpdateWithoutInteracoesInput, ClienteUncheckedUpdateWithoutInteracoesInput>
    create: XOR<ClienteCreateWithoutInteracoesInput, ClienteUncheckedCreateWithoutInteracoesInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutInteracoesInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutInteracoesInput, ClienteUncheckedUpdateWithoutInteracoesInput>
  }

  export type ClienteUpdateWithoutInteracoesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateWithoutInteracoesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUncheckedUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUncheckedUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type ClienteCreateWithoutOportunidadesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoCreateNestedManyWithoutClienteInput
    mensagens?: MensagemCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateWithoutOportunidadesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoUncheckedCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoUncheckedCreateNestedManyWithoutClienteInput
    mensagens?: MensagemUncheckedCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteCreateOrConnectWithoutOportunidadesInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutOportunidadesInput, ClienteUncheckedCreateWithoutOportunidadesInput>
  }

  export type UsuarioCreateWithoutOportunidadesInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemCreateNestedManyWithoutAprovadorInput
    refreshTokens?: RefreshTokenCreateNestedManyWithoutUsuarioInput
  }

  export type UsuarioUncheckedCreateWithoutOportunidadesInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    mensagens?: MensagemUncheckedCreateNestedManyWithoutAprovadorInput
    refreshTokens?: RefreshTokenUncheckedCreateNestedManyWithoutUsuarioInput
  }

  export type UsuarioCreateOrConnectWithoutOportunidadesInput = {
    where: UsuarioWhereUniqueInput
    create: XOR<UsuarioCreateWithoutOportunidadesInput, UsuarioUncheckedCreateWithoutOportunidadesInput>
  }

  export type ClienteUpsertWithoutOportunidadesInput = {
    update: XOR<ClienteUpdateWithoutOportunidadesInput, ClienteUncheckedUpdateWithoutOportunidadesInput>
    create: XOR<ClienteCreateWithoutOportunidadesInput, ClienteUncheckedCreateWithoutOportunidadesInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutOportunidadesInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutOportunidadesInput, ClienteUncheckedUpdateWithoutOportunidadesInput>
  }

  export type ClienteUpdateWithoutOportunidadesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateWithoutOportunidadesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUncheckedUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUncheckedUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUncheckedUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type UsuarioUpsertWithoutOportunidadesInput = {
    update: XOR<UsuarioUpdateWithoutOportunidadesInput, UsuarioUncheckedUpdateWithoutOportunidadesInput>
    create: XOR<UsuarioCreateWithoutOportunidadesInput, UsuarioUncheckedCreateWithoutOportunidadesInput>
    where?: UsuarioWhereInput
  }

  export type UsuarioUpdateToOneWithWhereWithoutOportunidadesInput = {
    where?: UsuarioWhereInput
    data: XOR<UsuarioUpdateWithoutOportunidadesInput, UsuarioUncheckedUpdateWithoutOportunidadesInput>
  }

  export type UsuarioUpdateWithoutOportunidadesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUpdateManyWithoutAprovadorNestedInput
    refreshTokens?: RefreshTokenUpdateManyWithoutUsuarioNestedInput
  }

  export type UsuarioUncheckedUpdateWithoutOportunidadesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagens?: MensagemUncheckedUpdateManyWithoutAprovadorNestedInput
    refreshTokens?: RefreshTokenUncheckedUpdateManyWithoutUsuarioNestedInput
  }

  export type ClienteCreateWithoutMensagensInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateWithoutMensagensInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoUncheckedCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoUncheckedCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutClienteInput
    execucoes?: ExecucaoApiUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteCreateOrConnectWithoutMensagensInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutMensagensInput, ClienteUncheckedCreateWithoutMensagensInput>
  }

  export type UsuarioCreateWithoutMensagensInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    refreshTokens?: RefreshTokenCreateNestedManyWithoutUsuarioInput
    oportunidades?: OportunidadeCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioUncheckedCreateWithoutMensagensInput = {
    id?: string
    nome: string
    email: string
    senhaHash: string
    perfil: $Enums.PerfilUsuario
    status?: $Enums.StatusUsuario
    dataCadastro?: Date | string
    refreshTokens?: RefreshTokenUncheckedCreateNestedManyWithoutUsuarioInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutResponsavelInput
  }

  export type UsuarioCreateOrConnectWithoutMensagensInput = {
    where: UsuarioWhereUniqueInput
    create: XOR<UsuarioCreateWithoutMensagensInput, UsuarioUncheckedCreateWithoutMensagensInput>
  }

  export type ClienteUpsertWithoutMensagensInput = {
    update: XOR<ClienteUpdateWithoutMensagensInput, ClienteUncheckedUpdateWithoutMensagensInput>
    create: XOR<ClienteCreateWithoutMensagensInput, ClienteUncheckedCreateWithoutMensagensInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutMensagensInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutMensagensInput, ClienteUncheckedUpdateWithoutMensagensInput>
  }

  export type ClienteUpdateWithoutMensagensInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateWithoutMensagensInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUncheckedUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUncheckedUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutClienteNestedInput
    execucoes?: ExecucaoApiUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type UsuarioUpsertWithoutMensagensInput = {
    update: XOR<UsuarioUpdateWithoutMensagensInput, UsuarioUncheckedUpdateWithoutMensagensInput>
    create: XOR<UsuarioCreateWithoutMensagensInput, UsuarioUncheckedCreateWithoutMensagensInput>
    where?: UsuarioWhereInput
  }

  export type UsuarioUpdateToOneWithWhereWithoutMensagensInput = {
    where?: UsuarioWhereInput
    data: XOR<UsuarioUpdateWithoutMensagensInput, UsuarioUncheckedUpdateWithoutMensagensInput>
  }

  export type UsuarioUpdateWithoutMensagensInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUpdateManyWithoutUsuarioNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutResponsavelNestedInput
  }

  export type UsuarioUncheckedUpdateWithoutMensagensInput = {
    id?: StringFieldUpdateOperationsInput | string
    nome?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    senhaHash?: StringFieldUpdateOperationsInput | string
    perfil?: EnumPerfilUsuarioFieldUpdateOperationsInput | $Enums.PerfilUsuario
    status?: EnumStatusUsuarioFieldUpdateOperationsInput | $Enums.StatusUsuario
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUncheckedUpdateManyWithoutUsuarioNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutResponsavelNestedInput
  }

  export type ClienteCreateWithoutExecucoesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeCreateNestedManyWithoutClienteInput
    mensagens?: MensagemCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateWithoutExecucoesInput = {
    id?: string
    externalId?: string | null
    nome: string
    tipo: $Enums.TipoCliente
    cnpjCpf?: string | null
    endereco?: string | null
    contatoPrincipal?: string | null
    emailPrincipal?: string | null
    telefoneWhatsapp?: string | null
    scoreComercial?: Decimal | DecimalJsLike | number | string | null
    statusRelacionamento: $Enums.StatusRelacionamento
    tags: JsonNullValueInput | InputJsonValue
    urlInstagram?: string | null
    urlSite?: string | null
    dataCadastro?: Date | string
    dataUltimaAtualizacao?: Date | string
    pedidos?: PedidoUncheckedCreateNestedManyWithoutClienteInput
    interacoes?: InteracaoUncheckedCreateNestedManyWithoutClienteInput
    oportunidades?: OportunidadeUncheckedCreateNestedManyWithoutClienteInput
    mensagens?: MensagemUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteCreateOrConnectWithoutExecucoesInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutExecucoesInput, ClienteUncheckedCreateWithoutExecucoesInput>
  }

  export type ClienteUpsertWithoutExecucoesInput = {
    update: XOR<ClienteUpdateWithoutExecucoesInput, ClienteUncheckedUpdateWithoutExecucoesInput>
    create: XOR<ClienteCreateWithoutExecucoesInput, ClienteUncheckedCreateWithoutExecucoesInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutExecucoesInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutExecucoesInput, ClienteUncheckedUpdateWithoutExecucoesInput>
  }

  export type ClienteUpdateWithoutExecucoesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateWithoutExecucoesInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: StringFieldUpdateOperationsInput | string
    tipo?: EnumTipoClienteFieldUpdateOperationsInput | $Enums.TipoCliente
    cnpjCpf?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    contatoPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    emailPrincipal?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneWhatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    scoreComercial?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    statusRelacionamento?: EnumStatusRelacionamentoFieldUpdateOperationsInput | $Enums.StatusRelacionamento
    tags?: JsonNullValueInput | InputJsonValue
    urlInstagram?: NullableStringFieldUpdateOperationsInput | string | null
    urlSite?: NullableStringFieldUpdateOperationsInput | string | null
    dataCadastro?: DateTimeFieldUpdateOperationsInput | Date | string
    dataUltimaAtualizacao?: DateTimeFieldUpdateOperationsInput | Date | string
    pedidos?: PedidoUncheckedUpdateManyWithoutClienteNestedInput
    interacoes?: InteracaoUncheckedUpdateManyWithoutClienteNestedInput
    oportunidades?: OportunidadeUncheckedUpdateManyWithoutClienteNestedInput
    mensagens?: MensagemUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type MensagemCreateManyAprovadorInput = {
    id?: string
    clienteId: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type RefreshTokenCreateManyUsuarioInput = {
    id?: string
    tokenHash: string
    expiresEm: Date | string
    revogadoEm?: Date | string | null
  }

  export type OportunidadeCreateManyResponsavelInput = {
    id?: string
    clienteId: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
  }

  export type MensagemUpdateWithoutAprovadorInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneRequiredWithoutMensagensNestedInput
  }

  export type MensagemUncheckedUpdateWithoutAprovadorInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemUncheckedUpdateManyWithoutAprovadorInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RefreshTokenUpdateWithoutUsuarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RefreshTokenUncheckedUpdateWithoutUsuarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RefreshTokenUncheckedUpdateManyWithoutUsuarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresEm?: DateTimeFieldUpdateOperationsInput | Date | string
    revogadoEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OportunidadeUpdateWithoutResponsavelInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cliente?: ClienteUpdateOneRequiredWithoutOportunidadesNestedInput
  }

  export type OportunidadeUncheckedUpdateWithoutResponsavelInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OportunidadeUncheckedUpdateManyWithoutResponsavelInput = {
    id?: StringFieldUpdateOperationsInput | string
    clienteId?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PedidoCreateManyClienteInput = {
    id?: string
    externalId?: string | null
    dataPedido: Date | string
    valorTotal: Decimal | DecimalJsLike | number | string
    statusPedido: string
    origemPedido: $Enums.OrigemPedido
  }

  export type InteracaoCreateManyClienteInput = {
    id?: string
    tipoInteracao: $Enums.TipoInteracao
    dataInteracao: Date | string
    resumo?: string | null
    sentimento?: Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: boolean
    riscoDetectado?: boolean
    conteudoBruto?: string | null
  }

  export type OportunidadeCreateManyClienteInput = {
    id?: string
    tipoOportunidade: $Enums.TipoOportunidade
    descricao: string
    valorEstimado?: Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: Decimal | DecimalJsLike | number | string | null
    prioridade: $Enums.PrioridadeOportunidade
    statusOportunidade: $Enums.StatusOportunidade
    dataCriacao?: Date | string
    dataFechamento?: Date | string | null
    responsavelId?: string | null
  }

  export type MensagemCreateManyClienteInput = {
    id?: string
    tipoMensagem: $Enums.TipoMensagem
    conteudoSugerido: string
    conteudoFinal?: string | null
    statusEnvio: $Enums.StatusEnvioMensagem
    sensivel?: boolean
    dataCriacao?: Date | string
    dataAprovacao?: Date | string | null
    dataEnvio?: Date | string | null
    aprovadorId?: string | null
    canalEnvio?: string
    agendadoPara?: Date | string | null
    justificativaRejeicao?: string | null
  }

  export type ExecucaoApiCreateManyClienteInput = {
    id?: string
    acaoApi: $Enums.AcaoApi
    dataExecucao?: Date | string
    statusExecucao: $Enums.StatusExecucaoApi
    detalhesExecucao: JsonNullValueInput | InputJsonValue
    mensagemErro?: string | null
    duracaoMs?: number | null
  }

  export type PedidoUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
    itens?: ItemPedidoUpdateManyWithoutPedidoNestedInput
  }

  export type PedidoUncheckedUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
    itens?: ItemPedidoUncheckedUpdateManyWithoutPedidoNestedInput
  }

  export type PedidoUncheckedUpdateManyWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    externalId?: NullableStringFieldUpdateOperationsInput | string | null
    dataPedido?: DateTimeFieldUpdateOperationsInput | Date | string
    valorTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    statusPedido?: StringFieldUpdateOperationsInput | string
    origemPedido?: EnumOrigemPedidoFieldUpdateOperationsInput | $Enums.OrigemPedido
  }

  export type InteracaoUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InteracaoUncheckedUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InteracaoUncheckedUpdateManyWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoInteracao?: EnumTipoInteracaoFieldUpdateOperationsInput | $Enums.TipoInteracao
    dataInteracao?: DateTimeFieldUpdateOperationsInput | Date | string
    resumo?: NullableStringFieldUpdateOperationsInput | string | null
    sentimento?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    oportunidadeDetectada?: BoolFieldUpdateOperationsInput | boolean
    riscoDetectado?: BoolFieldUpdateOperationsInput | boolean
    conteudoBruto?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OportunidadeUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    responsavel?: UsuarioUpdateOneWithoutOportunidadesNestedInput
  }

  export type OportunidadeUncheckedUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    responsavelId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OportunidadeUncheckedUpdateManyWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoOportunidade?: EnumTipoOportunidadeFieldUpdateOperationsInput | $Enums.TipoOportunidade
    descricao?: StringFieldUpdateOperationsInput | string
    valorEstimado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    probabilidadeConversao?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    prioridade?: EnumPrioridadeOportunidadeFieldUpdateOperationsInput | $Enums.PrioridadeOportunidade
    statusOportunidade?: EnumStatusOportunidadeFieldUpdateOperationsInput | $Enums.StatusOportunidade
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataFechamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    responsavelId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
    aprovador?: UsuarioUpdateOneWithoutMensagensNestedInput
  }

  export type MensagemUncheckedUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    aprovadorId?: NullableStringFieldUpdateOperationsInput | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MensagemUncheckedUpdateManyWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    tipoMensagem?: EnumTipoMensagemFieldUpdateOperationsInput | $Enums.TipoMensagem
    conteudoSugerido?: StringFieldUpdateOperationsInput | string
    conteudoFinal?: NullableStringFieldUpdateOperationsInput | string | null
    statusEnvio?: EnumStatusEnvioMensagemFieldUpdateOperationsInput | $Enums.StatusEnvioMensagem
    sensivel?: BoolFieldUpdateOperationsInput | boolean
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    dataAprovacao?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    dataEnvio?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    aprovadorId?: NullableStringFieldUpdateOperationsInput | string | null
    canalEnvio?: StringFieldUpdateOperationsInput | string
    agendadoPara?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    justificativaRejeicao?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ExecucaoApiUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ExecucaoApiUncheckedUpdateWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ExecucaoApiUncheckedUpdateManyWithoutClienteInput = {
    id?: StringFieldUpdateOperationsInput | string
    acaoApi?: EnumAcaoApiFieldUpdateOperationsInput | $Enums.AcaoApi
    dataExecucao?: DateTimeFieldUpdateOperationsInput | Date | string
    statusExecucao?: EnumStatusExecucaoApiFieldUpdateOperationsInput | $Enums.StatusExecucaoApi
    detalhesExecucao?: JsonNullValueInput | InputJsonValue
    mensagemErro?: NullableStringFieldUpdateOperationsInput | string | null
    duracaoMs?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ItemPedidoCreateManyPedidoInput = {
    id?: string
    sku?: string | null
    produto: string
    categoria?: string | null
    quantidade: Decimal | DecimalJsLike | number | string
    precoUnit: Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUpdateWithoutPedidoInput = {
    id?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUncheckedUpdateWithoutPedidoInput = {
    id?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type ItemPedidoUncheckedUpdateManyWithoutPedidoInput = {
    id?: StringFieldUpdateOperationsInput | string
    sku?: NullableStringFieldUpdateOperationsInput | string | null
    produto?: StringFieldUpdateOperationsInput | string
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    quantidade?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    precoUnit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}