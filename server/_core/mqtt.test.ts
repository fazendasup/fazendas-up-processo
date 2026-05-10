import { describe, expect, it, vi } from "vitest";

vi.mock("mqtt", () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      publish: vi.fn(),
      end: vi.fn(),
    })),
  },
}));

describe("mqtt bridge", () => {
  it("parseProjetoIdFromMqttTopic extrai o id após o prefixo", async () => {
    const { parseProjetoIdFromMqttTopic } = await import("./mqtt");
    expect(parseProjetoIdFromMqttTopic("fazendasup/p42/telemetry/x")).toBe(42);
    expect(parseProjetoIdFromMqttTopic("fazendasup/p42/cmd/x")).toBe(42);
    expect(parseProjetoIdFromMqttTopic("outro/p1/telemetry/x")).toBe(null);
  });
});
