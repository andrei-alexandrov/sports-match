import tennis from "../../images/activitiesPage/tennis.png";
import tableTennis from "../../images/activitiesPage/tableTennis.png";
import football from "../../images/activitiesPage/football.png";
import badminton from "../../images/activitiesPage/badminton1.png";
import squash from "../../images/activitiesPage/squash.png";
import running from "../../images/activitiesPage/running.png";
import basketball from "../../images/activitiesPage/basketball2.png";
import volleyball from "../../images/activitiesPage/volleyball.png";
import ski from "../../images/activitiesPage/ski.png";
import snowboard from "../../images/activitiesPage/snowboard.png";
import iceSkating from "../../images/activitiesPage/iceSkating.png";
import padel from "../../images/activitiesPage/padel.png";
import wallClimbing from "../../images/activitiesPage/wallClimbing.png";
import darts from "../../images/activitiesPage/darts.png";
import paintball from "../../images/activitiesPage/paintball.png";
import snooker from "../../images/activitiesPage/billiards.png";
import bowling from "../../images/activitiesPage/bowling.png";
import karting from "../../images/activitiesPage/karting.png";
import dance from "../../images/activitiesPage/dance.png";
import pool from "../../images/activitiesPage/pool.png";
import golf from "../../images/activitiesPage/golf.png";
import fitness from "../../images/activitiesPage/fitness.png";
import boxing from "../../images/activitiesPage/boxing.png";
import poledance from "../../images/activitiesPage/poledance.png";
import baseball from "../../images/activitiesPage/baseball.png";
import fencing from "../../images/activitiesPage/fencing.png";
import cycling from "../../images/activitiesPage/cycling.png";
import motorcycling from "../../images/activitiesPage/motorcycling.png";
import rafting from "../../images/activitiesPage/rafting.png";
import canoe from "../../images/activitiesPage/canoe.png"
import curling from "../../images/activitiesPage/curling.png"
import petanka from "../../images/activitiesPage/petanka.webp"
import swimming from "../../images/activitiesPage/swimming.png"
import martialArts from "../../images/activitiesPage/martialArts.png"
import equestrianism from "../../images/activitiesPage/equestrianism.png"
import hockey from "../../images/activitiesPage/hockey.png"
import skating from "../../images/activitiesPage/skating.png"
import yoga from "../../images/activitiesPage/yoga.png"
import trampolines from "../../images/activitiesPage/trampolines.png"
import archery from "../../images/activitiesPage/archery.png"


const activitiesData = [
    {
        name: "Tennis",
        image: tennis,
    },
    {
        name: "Table tennis",
        image: tableTennis,
    },
    {
        name: "Badminton",
        image: badminton,
    },
    {
        name: "Football",
        image: football,
    },
    {
        name: "Squash",
        image: squash,
    },
    {
        name: "Running",
        image: running,
    },
    {
        name: "Basketball",
        image: basketball,
    },
    {
        name: "Volleyball",
        image: volleyball,
    },
    {
        name: "Ski",
        image: ski,
    },
    {
        name: "Snowboard",
        image: snowboard,
    },
    {
        name: "Ice skating",
        image: iceSkating,
    },
    {
        name: "Padel",
        image: padel,
    },
    {
        name: "Wall climbing",
        image: wallClimbing,
    },
    {
        name: "Darts",
        image: darts,
    },
    {
        name: "Paintball",
        image: paintball,
    },
    {
        name: "Snooker",
        image: snooker,
    },
    {
        name: "Bowling",
        image: bowling,
    },
    {
        name: "Karting",
        image: karting,
    },
    {
        name: "Dance",
        image: dance,
    },
    {
        name: "Pool",
        image: pool,
    },
    {
        name: "Golf",
        image: golf,
    },
    {
        name: "Fitness",
        image: fitness,
    },
    {
        name: "Boxing",
        image: boxing,
    },
    {
        name: "Pole Dance",
        image: poledance,
    },
    {
        name: "Baseball",
        image: baseball,
    },
    {
        name: "Fencing",
        image: fencing,
    },
    {
        name: "Cycling",
        image: cycling,
    },
    {
        name: "Motorcycling",
        image: motorcycling,
    },
    {
        name: "Rafting",
        image: rafting,
    },
    {
        name: "Kayak",
        image: canoe,
    },
    {
        name: "Curling",
        image: curling,
    },
    {
        name: "Petanka",
        image: petanka,
    },
    {
        name: "Swimming",
        image: swimming,  
    },
    {
        name: "Martial arts",
        image: martialArts,  
    },
    {
        name: "Horse riding",
        image: equestrianism,  
    },
    {
        name: "Hockey",
        image: hockey,  
    },
    {
        name: "Roller skating",
        image: skating,  
    },
    {
        name: "Yoga",
        image: yoga,  
    },
    {
        name: "Trampolines",
        image: trampolines,  
    },
    {
        name: "Archery",
        image: archery,  
    },
    

];

export class Activity {
    constructor(name, image) {
        this.name = name;
        this.image = image;
    }
}

const activities = activitiesData.map(activity => new Activity(activity.name, activity.image));
export default activities;