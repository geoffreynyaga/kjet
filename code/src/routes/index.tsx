import { BrowserRouter, Route, Routes } from 'react-router-dom';

import CountiesHome from '../counties';
import { ApplicationFiles } from '../counties';
import Home from '../Home';

export default function RoutesApp() {
    return (
        <BrowserRouter>
            <Routes>
               <Route path="/" element={<Home />} />
               <Route path="/counties" element={<CountiesHome />} />
               <Route path="/counties/:application_id" element={<ApplicationFiles />} />
            </Routes>
        </BrowserRouter>
    )
}