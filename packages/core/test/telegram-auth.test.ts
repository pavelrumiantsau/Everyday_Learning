import { describe, expect, it } from "vitest";
import { signInitData, verifyInitData } from "../src";

const TOKEN = "123456:TEST-token";
const now = Date.parse("2026-10-01T08:00:00Z");
const fields = (authDate: number) => ({
  query_id: "AAE",
  user: JSON.stringify({ id: 287455704, first_name: "Pavel", language_code: "ru" }),
  auth_date: String(Math.floor(authDate / 1000)),
});

describe("verifyInitData", () => {
  it("accepts correctly signed, fresh data and returns the user id", async () => {
    const data = await signInitData(fields(now - 60_000), TOKEN);
    expect(await verifyInitData(data, TOKEN, now)).toEqual({ ok: true, userId: "287455704" });
  });

  it("rejects data signed with another bot token", async () => {
    const data = await signInitData(fields(now), "999:OTHER");
    expect(await verifyInitData(data, TOKEN, now)).toEqual({ ok: false, reason: "bad signature" });
  });

  it("rejects tampered data (another user id)", async () => {
    const data = await signInitData(fields(now), TOKEN);
    const tampered = data.replace("287455704", "111111111");
    expect((await verifyInitData(tampered, TOKEN, now)).ok).toBe(false);
  });

  it("rejects data older than a day", async () => {
    const data = await signInitData(fields(now - 25 * 3600_000), TOKEN);
    expect(await verifyInitData(data, TOKEN, now)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects missing hash", async () => {
    expect(await verifyInitData("user=%7B%7D&auth_date=1", TOKEN, now)).toEqual({ ok: false, reason: "no hash" });
  });
});
