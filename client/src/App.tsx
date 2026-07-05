import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar/NavBar";
import RequireAuth from "./components/RequireAuth";
import ActivitiesPage from "./pages/Activities/Activities";
import BuddySearchPage from "./pages/BuddySearch/BuddySearch";
import EventsPage from "./pages/Events/Events";
import HomePage from "./pages/Home/Home";
import LoginForm from "./pages/LoginAndRegister/LoginForm";
import RegistrationForm from "./pages/LoginAndRegister/RegistrationForm";
import MessagesPage from "./pages/Messages/Messages";
import NotFound from "./pages/NotFound/NotFound";
import PlacesPage from "./pages/Places/Places";
import ProfilePage from "./pages/Profile/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route index element={<Navigate to="/home" />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/home" element={<HomePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/buddySearch" element={<BuddySearchPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/places" element={<PlacesPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
