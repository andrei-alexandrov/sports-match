import Navbar from "./components/NavBar/NavBar";
import "./components/NavBar/NavBar";
import { BrowserRouter } from "react-router-dom";

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