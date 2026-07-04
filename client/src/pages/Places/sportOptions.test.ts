import type { PublicPlace } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { sportOptionsFrom } from "./sportOptions";

function place(sports: PublicPlace["sports"]): PublicPlace {
  return {
    id: "x",
    name: "Зала",
    sports,
    address: "ул. Тестова 1",
    city: "София",
    neighborhood: "Център",
    phone: "0888 000 000",
    workingHours: "Понеделник - неделя: 06:00 - 23:00",
    site: null,
    image: null,
    lat: 42.7,
    lng: 23.3,
  };
}

describe("sportOptionsFrom", () => {
  it("dedupes sports across venues and sorts by label", () => {
    const options = sportOptionsFrom([
      place(["tennis"]),
      place(["badminton", "tennis"]),
      place(["snooker", "pool"]),
    ]);
    expect(options.map((o) => o.key)).toEqual(["badminton", "pool", "snooker", "tennis"]);
    expect(options.every((o) => o.label.length > 0 && o.image.length > 0)).toBe(true);
  });
});
