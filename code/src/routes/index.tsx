import { ApplicationFiles, ComparisonDashboard, HumanCountiesAnalysis, LLMCountiesAnalysis, StatisticsDashboard } from '../counties';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import CountiesHome from '../counties';
import Home from '../Home';

export default function RoutesApp() {
    return (
        <BrowserRouter>
            <Routes>
               <Route path="/" element={<Home />} />
               <Route path="/counties" element={<CountiesHome />} />
               <Route path="/counties/:application_id" element={<ApplicationFiles />} />
               <Route path="/details" element={<LLMCountiesAnalysis />} />
               <Route path="/results" element={<HumanCountiesAnalysis />} />
               <Route path="/statistics" element={<StatisticsDashboard />} />
               <Route path="/comparison" element={<ComparisonDashboard />} />
            </Routes>
        </BrowserRouter>
    )
}