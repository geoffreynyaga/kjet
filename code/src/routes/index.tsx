import { BrowserRouter, Route, Routes } from 'react-router-dom';

import CountiesHome from '../counties';
import Home from '../Home';

export default function RoutesApp() {
    return (
        <BrowserRouter>
            <Routes>
               <Route path="/" element={<Home />} />
               <Route path="/counties" element={<CountiesHome />} />
            </Routes>
        </BrowserRouter>
    )
}