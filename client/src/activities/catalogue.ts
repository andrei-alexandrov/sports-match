import { ACTIVITIES, type ActivityKey } from "@sports-match/shared";
import archery from "../images/activitiesPage/archery.png";
import badminton from "../images/activitiesPage/badminton1.png";
import baseball from "../images/activitiesPage/baseball.png";
import basketball from "../images/activitiesPage/basketball2.png";
import snooker from "../images/activitiesPage/billiards.png";
import bowling from "../images/activitiesPage/bowling.png";
import boxing from "../images/activitiesPage/boxing.png";
import kayak from "../images/activitiesPage/canoe.png";
import curling from "../images/activitiesPage/curling.png";
import cycling from "../images/activitiesPage/cycling.png";
import dance from "../images/activitiesPage/dance.png";
import horseRiding from "../images/activitiesPage/equestrianism.png";
import fencing from "../images/activitiesPage/fencing.png";
import fitness from "../images/activitiesPage/fitness.png";
import football from "../images/activitiesPage/football.png";
import golf from "../images/activitiesPage/golf.png";
import hockey from "../images/activitiesPage/hockey.png";
import iceSkating from "../images/activitiesPage/iceSkating.png";
import karting from "../images/activitiesPage/karting.png";
import martialArts from "../images/activitiesPage/martialArts.png";
import motorcycling from "../images/activitiesPage/motorcycling.png";
import padel from "../images/activitiesPage/padel.png";
import paintball from "../images/activitiesPage/paintball.png";
import petanka from "../images/activitiesPage/petanka.webp";
import poleDance from "../images/activitiesPage/poledance.png";
import pool from "../images/activitiesPage/pool.png";
import rafting from "../images/activitiesPage/rafting.png";
import running from "../images/activitiesPage/running.png";
import rollerSkating from "../images/activitiesPage/skating.png";
import ski from "../images/activitiesPage/ski.png";
import snowboard from "../images/activitiesPage/snowboard.png";
import squash from "../images/activitiesPage/squash.png";
import swimming from "../images/activitiesPage/swimming.png";
import tableTennis from "../images/activitiesPage/tableTennis.png";
import tennis from "../images/activitiesPage/tennis.png";
import trampolines from "../images/activitiesPage/trampolines.png";
import volleyball from "../images/activitiesPage/volleyball.png";
import wallClimbing from "../images/activitiesPage/wallClimbing.png";
import darts from "../images/activitiesPage/darts.png";
import yoga from "../images/activitiesPage/yoga.png";

const ACTIVITY_IMAGES: Record<ActivityKey, string> = {
  tennis,
  "table-tennis": tableTennis,
  badminton,
  football,
  squash,
  running,
  basketball,
  volleyball,
  ski,
  snowboard,
  "ice-skating": iceSkating,
  padel,
  "wall-climbing": wallClimbing,
  darts,
  paintball,
  snooker,
  bowling,
  karting,
  dance,
  pool,
  golf,
  fitness,
  boxing,
  "pole-dance": poleDance,
  baseball,
  fencing,
  cycling,
  motorcycling,
  rafting,
  kayak,
  curling,
  petanka,
  swimming,
  "martial-arts": martialArts,
  "horse-riding": horseRiding,
  hockey,
  "roller-skating": rollerSkating,
  yoga,
  trampolines,
  archery,
};

export interface ClientActivity {
  key: ActivityKey;
  label: string;
  image: string;
}

export const CLIENT_ACTIVITIES: ClientActivity[] = ACTIVITIES.map((a) => ({
  key: a.key,
  label: a.label,
  image: ACTIVITY_IMAGES[a.key],
}));

export function activityByKey(key: string): ClientActivity | undefined {
  return CLIENT_ACTIVITIES.find((a) => a.key === key);
}
