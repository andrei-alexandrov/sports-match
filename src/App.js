import { BrowserRouter } from "react-router-dom";
import Navbar from "./components/NavBar/NavBar";
import "./components/NavBar/NavBar";
import "./App.scss";

function App() {
    return (
        <div className="">
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        </div>
    )
}

export default App;