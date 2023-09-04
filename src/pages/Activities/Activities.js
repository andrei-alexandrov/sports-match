import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import userManager from "../../services/UserManager";
import activitiesData from "./activitiesData";
import { Activity } from "./activitiesData";
import "./Activities.scss";
import "../../sweetalert2-custom.scss";
import { ActivityComponent } from '../../components/Activity/Activity';
import useDebounce from "../../components/Utils/Debounce";
import LoginModal from '../../components/Modals/LoginModal';
import sphere from "../../images/homePage/sphere.gif";

const activities = activitiesData.map(activity => new Activity(activity.name, activity.image));

export default function ActivitiesPage() {
    const [addedActivities, setAddedActivities] = useState([]);
    const [searchInput, setSearchInput] = useState("");
    const navigate = useNavigate();
    const debouncedSearchInput = useDebounce(searchInput, 300);
    activities.sort((a, b) => a.name.localeCompare(b.name));

    useEffect(() => {
        const user = userManager.getLoggedInUser();
        setAddedActivities(user ? user.activities || [] : []);
    }, [userManager.getLoggedInUser()]);


    function handleSearchInputChange(event) {
        setSearchInput(event.target.value);
    }

    async function handleAddActivity(activity) {
        const user = userManager.getLoggedInUser();
        if (!user) {
          const shouldNavigateToLogin = await LoginModal();
          if (shouldNavigateToLogin) {
            navigate('/login');
          }
          return;
        }
        
        if (user.hasActivity(activity)) {
            userManager.removeActivity(activity);
            setAddedActivities((prevActivities) =>
            prevActivities.filter((a) => a.name !== activity.name)
            );
        } else {
            userManager.addActivity(activity);
            setAddedActivities((prevActivities) => [
                ...prevActivities,
                activity,
            ]);
        }
    }

    return (
        <div className="activitiesPageContainer">
            <div className="titleWrapper">
                <h2 className="siteNameTitle">
                    ADD favorite sports to your profile so that other people can find you
                </h2>
            </div>
            <div className="searchContainer">
                <label htmlFor="activitySearch"></label>
                <input
                    id="activitySearch"
                    type="text"
                    value={searchInput}
                    placeholder="Search for sport"
                    onChange={handleSearchInputChange}
                />
            </div>
            <div className="activitiesContainer">
                {activities
                    .filter((activity) =>
                        activity.name.toLowerCase().includes(debouncedSearchInput.toLowerCase())
                    )
                    .map((activity) => (
                        <ActivityComponent
                            className="activity"
                            key={activity.name}
                            activity={activity}
                            onAdd={handleAddActivity}
                            added={addedActivities.some((a) => a.name === activity.name)}
                        />
                    ))}
            </div>
        </div>
    );
}
