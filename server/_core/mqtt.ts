/**
 * Integração MQTT (broker ↔ servidor Node).
 *
 * Onde corre: apenas no processo do servidor HTTP (ver `server/_core/index.ts`). O cliente React não fala MQTT.
 * Quando liga: se existir `MQTT_URL` no ambiente; caso contrário é no-op e a app funciona igual.
 *
 * Contrato de tópicos (prefixo default `fazendasup`, ver `MQTT_TOPIC_PREFIX`):
 * - Dispositivo → app: `{prefix}/p{projetoId}/telemetry/...` com payload JSON UTF-8 (ou texto).
 * - App → dispositivo: `{prefix}/p{projetoId}/cmd/...` via `publishToProjeto` (o firmware subscreve o que combinar).
 * Ex.: `fazendasup/p12/telemetry/esp32/ec` com `{"ec":1.2}`; comando `publishToProjeto(12, "cmd/bomba/on", { on:true })`.
 *
 * Multi-tenant: `projetoId` é o ID numérico na base (igual ao projeto ativo no header). Em produção use ACL no broker.
 * Extensão: `onMqttTelemetry` para gravar telemetria ou acionar regras.
 */

import { EventEmitter } from "node:events";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";
import { ENV } from "./env";

export type MqttTelemetryEvent = {
  projetoId: number;
  /** Parte do tópico após `p{id}/telemetry/` (ex.: `esp32/ec`). */
  path: string;
  topic: string;
  payload: unknown;
  raw: Buffer;
};

const telemetryBus = new EventEmitter();
telemetryBus.setMaxListeners(50);

let client: MqttClient | null = null;
let connected = false;
let lastError: string | undefined;
let initPromise: Promise<void> | null = null;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extrai o ID do projeto do primeiro segmento `p{ número }` após o prefixo. */
export function parseProjetoIdFromMqttTopic(topic: string): number | null {
  const pref = ENV.mqttTopicPrefix;
  const re = new RegExp(`^${escapeRegex(pref)}/p(\\d+)/`, "i");
  const m = topic.match(re);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function isMqttConfigured(): boolean {
  const url = ENV.mqttUrl;
  return typeof url === "string" && url.length > 0;
}

export type MqttBridgeStatus = {
  configured: boolean;
  connected: boolean;
  /** URL sem credenciais (só host/protocolo/porta). */
  brokerHost: string | null;
  topicPrefix: string;
  subscribePattern: string | null;
  lastError?: string;
};

/** Estado para painel admin / health (sem passwords). */
export function getMqttBridgeStatus(): MqttBridgeStatus {
  let brokerHost: string | null = null;
  if (ENV.mqttUrl) {
    try {
      const u = new URL(ENV.mqttUrl.replace(/^mqtt:\/\//i, "http://").replace(/^mqtts:\/\//i, "https://"));
      brokerHost = `${u.protocol}//${u.host}`;
    } catch {
      brokerHost = "(url inválida)";
    }
  }
  const prefix = ENV.mqttTopicPrefix;
  const subscribePattern = isMqttConfigured() ? `${prefix}/+/telemetry/#` : null;
  return {
    configured: isMqttConfigured(),
    connected,
    brokerHost,
    topicPrefix: prefix,
    subscribePattern,
    lastError,
  };
}

/** Subscreve telemetria: evento `telemetry` com {@link MqttTelemetryEvent}. */
export function onMqttTelemetry(handler: (evt: MqttTelemetryEvent) => void): () => void {
  telemetryBus.on("telemetry", handler);
  return () => telemetryBus.off("telemetry", handler);
}

/**
 * Publica no broker (comando ou telemetria espelhada). Só tem efeito se o cliente estiver ligado.
 * Tópico final: `{prefix}/p{projetoId}/{subtopic}` — `subtopic` não deve começar com `/`.
 */
export function publishToProjeto(
  projetoId: number,
  subtopic: string,
  payload: unknown,
  opts?: { qos?: 0 | 1 | 2; retain?: boolean },
): boolean {
  if (!client || !connected) return false;
  const tail = subtopic.replace(/^\/+/, "");
  const topic = `${ENV.mqttTopicPrefix}/p${projetoId}/${tail}`;
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  client.publish(topic, body, { qos: opts?.qos ?? 0, retain: opts?.retain ?? false });
  return true;
}

function handleIncoming(topic: string, buf: Buffer): void {
  const projetoId = parseProjetoIdFromMqttTopic(topic);
  if (projetoId == null) return;
  const prefixWithSlash = `${ENV.mqttTopicPrefix}/p${projetoId}/telemetry/`;
  if (!topic.toLowerCase().startsWith(prefixWithSlash.toLowerCase())) {
    return;
  }
  const path = topic.slice(prefixWithSlash.length);
  let parsed: unknown = buf.toString("utf8");
  try {
    parsed = JSON.parse(buf.toString("utf8"));
  } catch {
    /* mantém string */
  }
  const evt: MqttTelemetryEvent = { projetoId, path, topic, payload: parsed, raw: buf };
  telemetryBus.emit("telemetry", evt);
}

/**
 * Liga ao broker e subscreve `MQTT_TOPIC_PREFIX/+/telemetry/#`.
 * Idempotente; sem `MQTT_URL` retorna imediatamente.
 */
export function initMqttFromEnv(): Promise<void> {
  if (!isMqttConfigured()) {
    console.log("[MQTT] Desligado (defina MQTT_URL para ativar).");
    return Promise.resolve();
  }
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      resolve();
    };

    const connectTimer = setTimeout(() => {
      if (!connected) {
        lastError = lastError || "timeout a ligar ao broker (verifique MQTT_URL e rede)";
        console.warn("[MQTT]", lastError);
        done();
      }
    }, 15_000);

    const url = ENV.mqttUrl;
    const options: mqtt.IClientOptions = {
      clientId:
        ENV.mqttClientId ||
        `fazendas-up-${process.pid}-${Math.random().toString(36).slice(2, 10)}`,
      reconnectPeriod: 5000,
      connectTimeout: 10_000,
    };
    if (ENV.mqttUsername) options.username = ENV.mqttUsername;
    if (ENV.mqttPassword) options.password = ENV.mqttPassword;
    if (url.startsWith("mqtts://")) {
      options.rejectUnauthorized = !ENV.mqttTlsInsecure;
    }

    try {
      client = mqtt.connect(url, options);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error("[MQTT] connect:", lastError);
      done();
      return;
    }

    client.on("connect", () => {
      connected = true;
      lastError = undefined;
      const sub = `${ENV.mqttTopicPrefix}/+/telemetry/#`;
      client!.subscribe(sub, { qos: 0 }, (err: Error | null) => {
        if (err) {
          lastError = err.message;
          console.error("[MQTT] subscribe:", err);
        } else {
          console.log(`[MQTT] Ligado; subscrito: ${sub}`);
        }
        done();
      });
    });

    client.on("error", (err: Error) => {
      lastError = err.message;
      console.error("[MQTT] erro:", err.message);
    });

    client.on("close", () => {
      connected = false;
    });

    client.on("message", (t: string, payload: Buffer) => {
      handleIncoming(t, payload);
    });
  });

  return initPromise;
}

export function shutdownMqtt(): Promise<void> {
  return new Promise((resolve) => {
    if (!client) {
      resolve();
      return;
    }
    const c = client;
    client = null;
    connected = false;
    initPromise = null;
    c.end(false, {}, () => resolve());
  });
}
