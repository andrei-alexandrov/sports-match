import { ACTIVITIES } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { CLIENT_ACTIVITIES, activityByKey } from "./catalogue";

describe("client activity catalogue", () => {
  it("maps every shared activity key to an image", () => {
    expect(CLIENT_ACTIVITIES).toHaveLength(ACTIVITIES.length);
    for (const activity of CLIENT_ACTIVITIES) {
      expect(activity.image, `missing image for ${activity.key}`).toBeTruthy();
      expect(activity.label).toBeTruthy();
    }
  });

  it("looks up activities by key and returns undefined for unknown keys", () => {
    expect(activityByKey("tennis")?.label).toBe("Tennis");
    expect(activityByKey("quidditch")).toBeUndefined();
  });
});
