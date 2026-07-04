import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar/NavBar";
import RequireAuth from "./components/RequireAuth";
import errorpic from "./images/errorPage.gif";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
import HomePage from "./pages/Home/Home";
import LoginForm from "./pages/LoginAndRegister/LoginForm";
import RegistrationForm from "./pages/LoginAndRegister/RegistrationForm";
import ProfilePage from "./pages/Profile/Profile";
import "./App.scss";

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
          <Route path="/activities" element={<ComingSoon feature="Activities" />} />
          <Route path="/buddySearch" element={<ComingSoon feature="Buddy Search" />} />
          <Route path="/messages" element={<ComingSoon feature="Messages" />} />
          <Route path="/places" element={<ComingSoon feature="Places" />} />
        </Route>
        <Route
          path="*"
          element={
            <div>
              <h2 style={{ color: "white", display: "flex", justifyContent: "center" }}>
                Page not found. You've taken a wrong turn, but you found a hedgehog.
              </h2>
              <div className="errorImage">
                <img width={650} src={errorpic} alt="errorImage" />
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
