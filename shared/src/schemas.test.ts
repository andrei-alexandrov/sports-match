import { describe, expect, it } from "vitest";
import {
  loginInputSchema,
  publicUserSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from "./schemas";
import { ACTIVITIES } from "./activities";
import { searchUsersQuerySchema } from "./schemas";

describe("registerInputSchema", () => {
  it("accepts a valid username and password", () => {
    const result = registerInputSchema.safeParse({ username: "andrei", password: "Secret1" });
    expect(result.success).toBe(true);
  });

  it("rejects usernames shorter than 3 characters with the prototype's message", () => {
    const result = registerInputSchema.safeParse({ username: "ab", password: "Secret1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Username must be at least 3 characters long");
    }
  });

  it("rejects usernames that do not start with a letter", () => {
    for (const username of ["1abc", "_abc"]) {
      const result = registerInputSchema.safeParse({ username, password: "Secret1" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Username must start with a letter");
      }
    }
  });

  it("rejects passwords missing a number or an uppercase letter", () => {
    expect(registerInputSchema.safeParse({ username: "andrei", password: "Secrets" }).success).toBe(false);
    expect(registerInputSchema.safeParse({ username: "andrei", password: "secret1" }).success).toBe(false);
    expect(registerInputSchema.safeParse({ username: "andrei", password: "Se1" }).success).toBe(false);
  });
});

describe("loginInputSchema", () => {
  it("requires both fields non-empty", () => {
    expect(loginInputSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
    expect(loginInputSchema.safeParse({ username: "a", password: "b" }).success).toBe(true);
  });
});

describe("updateProfileInputSchema", () => {
  it("accepts a partial update", () => {
    const result = updateProfileInputSchema.safeParse({ city: "Sofia" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ city: "Sofia" });
  });

  it("strips unknown keys (mass-assignment protection)", () => {
    const result = updateProfileInputSchema.safeParse({ city: "Sofia", unknown: "hacked" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ city: "Sofia" });
  });

  it("rejects ages outside 0-100", () => {
    expect(updateProfileInputSchema.safeParse({ age: 150 }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ age: -1 }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ age: 30 }).success).toBe(true);
    expect(updateProfileInputSchema.safeParse({ age: 0 }).success).toBe(true);
    expect(updateProfileInputSchema.safeParse({ age: 100 }).success).toBe(true);
  });

  it("accepts trainer flag and trainer bio", () => {
    const result = updateProfileInputSchema.safeParse({ trainer: true, trainerBio: "Tennis coach, 10y" });
    expect(result.success).toBe(true);
    expect(result.data.trainer).toBe(true);
  });

  it("rejects an over-long trainer bio", () => {
    expect(updateProfileInputSchema.safeParse({ trainerBio: "x".repeat(121) }).success).toBe(false);
  });
});

describe("publicUserSchema", () => {
  it("describes the public user shape (no password fields)", () => {
    const user = {
      id: "abc123",
      username: "andrei",
      age: null,
      city: "",
      gender: "" as const,
      image: "",
      activities: [],
      trainer: false,
      trainerBio: "",
    };
    expect(publicUserSchema.safeParse(user).success).toBe(true);
    const withHash = publicUserSchema.safeParse({ ...user, passwordHash: "x" });
    expect(withHash.success).toBe(true);
    if (withHash.success) {
      expect(withHash.data).not.toHaveProperty("passwordHash");
    }
  });
});

describe("activities catalogue", () => {
  it("has 40 entries with unique keys and labels", () => {
    expect(ACTIVITIES).toHaveLength(40);
    expect(new Set(ACTIVITIES.map((a) => a.key)).size).toBe(40);
    expect(new Set(ACTIVITIES.map((a) => a.label)).size).toBe(40);
  });

  it("accepts and dedupes valid activity keys in profile updates", () => {
    const result = updateProfileInputSchema.safeParse({ activities: ["tennis", "tennis", "yoga"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toEqual(["tennis", "yoga"]);
    }
  });

  it("rejects unknown activity keys", () => {
    expect(updateProfileInputSchema.safeParse({ activities: ["quidditch"] }).success).toBe(false);
  });
});

describe("searchUsersQuerySchema", () => {
  it("trims city and strips unknown params", () => {
    const result = searchUsersQuerySchema.safeParse({ city: "  Sofia ", activity: "tennis", admin: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ city: "Sofia", activity: "tennis" });
    }
  });

  it("rejects an unknown activity key", () => {
    expect(searchUsersQuerySchema.safeParse({ activity: "quidditch" }).success).toBe(false);
  });
});
