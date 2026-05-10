# Integração MQTT — Fazendas UP

Este documento descreve **como** o broker MQTT está ligado à aplicação e **que contrato** de tópicos se usa.

## Onde o código corre

- **Servidor Node (Express + tRPC):** sim — implementação em `server/_core/mqtt.ts`, arranque e desligamento em `server/_core/index.ts`.
- **Cliente React (browser):** não — não existe cliente MQTT no browser. Quem é admin vê só um resumo via tRPC `system.mqttStatus` (página Automação).

Toda a subscrição e publicação MQTT passam pelo processo do servidor.

## Ativar / desativar

- **Desativado (default):** não defina `MQTT_URL` (ou deixe vazio). O servidor regista `[MQTT] Desligado` e continua normalmente.
- **Ativo:** defina `MQTT_URL` no `.env` (ex.: `mqtt://127.0.0.1:1883` ou `mqtts://broker.example:8883`).

Variáveis suportadas (ver também `env.defaults`):

- `MQTT_URL` — URL do broker (obrigatória para ligar).
- `MQTT_USERNAME` / `MQTT_PASSWORD` — autenticação opcional.
- `MQTT_CLIENT_ID` — opcional; se vazio, gera-se um id por processo.
- `MQTT_TOPIC_PREFIX` — default `fazendasup` (sem barras no início/fim).
- `MQTT_TLS_INSECURE=1` — só para **desenvolvimento** com `mqtts://`: não valida certificado do servidor (não use em produção).

## Ciclo de vida

1. Após o HTTP `listen`, o servidor chama `initMqttFromEnv()` (assíncrono, não bloqueia a porta HTTP).
2. Se configurado, o cliente MQTT liga e subscreve **uma** máscara global de telemetria (ver abaixo).
3. Em `SIGINT` / `SIGTERM`, chama-se `shutdownMqtt()` para fechar a ligação de forma limpa.

## Contrato de tópicos

Prefixo: `{MQTT_TOPIC_PREFIX}` (ex.: `fazendasup`).

### Telemetria (dispositivo → servidor)

- Padrão: `{prefix}/p{projetoId}/telemetry/{resto}`
- `projetoId` é o **ID numérico** do projeto na base de dados (o mesmo do projeto ativo na API: header `X-Projeto-Id` / cookie).
- Exemplo: `fazendasup/p12/telemetry/esp32-sala1/ec` com payload JSON `{"ec":1.2,"ts":"..."}`.
- O servidor subscreve: `{prefix}/+/telemetry/#` e reparte mensagens internamente (parse do `projetoId` a partir do tópico).

### Comandos (servidor → dispositivo)

- Uso programático: função `publishToProjeto(projetoId, subtopic, payload)` em `server/_core/mqtt.ts`.
- Tópico resultante: `{prefix}/p{projetoId}/{subtopic}` (ex.: subtopic `cmd/bomba/on` → `fazendasup/p12/cmd/bomba/on`).
- O firmware deve **subscrever** os tópicos que realmente implementa; não há comando genérico na UI ainda.

### Multi-tenant e segurança

Num broker partilhado, qualquer cliente que subscreva `#` pode ver tráfego de todos os projetos. **Recomendação:** em produção, usar ACL por utilizador/certificado no Mosquitto, EMQX ou equivalente, limitando cada dispositivo ao prefixo `.../p{id}/...` do seu projeto.

## Observabilidade (admin)

- Procedure tRPC: `system.mqttStatus` (só **admin global**).
- Devolve: `configured`, `connected`, `topicPrefix`, `subscribePattern`, `brokerHost` (URL sanitizada), `lastError` opcional.
- Na UI: página **Automação**, bloco no fundo (visível como admin).

## Broker local (opcional)

Pode subir um Mosquitto só para desenvolvimento:

```bash
docker compose --profile mqtt up -d mosquitto
```

Depois no `.env`:

```env
MQTT_URL=mqtt://127.0.0.1:1883
```

(Ficheiros: `docker-compose.yml` serviço `mosquitto` com `profiles: [mqtt]`, config em `docker/mosquitto.conf`.)

## Extensões futuras

- Handlers `onMqttTelemetry` podem persistir leituras na BD ou alimentar o motor de regras.
- Publicação a partir de mutations tRPC (ex.: comando de válvula) chamando `publishToProjeto`.

## Dependência npm

- Pacote: `mqtt` (MQTT.js v5), declarado em `package.json`.
