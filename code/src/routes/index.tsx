import { ApplicationFiles, ComparisonDashboard, FirstandSecond, HumanCountiesAnalysis, LLMCountiesAnalysis, StatisticsDashboard } from '../counties';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import CountiesHome from '../counties';
import Home from '../Home';
import ApplicantDetail from '../counties/HumanCountiesAnalysis/ApplicantDetail/index.tsx';

export default function RoutesApp() {
    return (
        <BrowserRouter>
            <Routes>
               <Route path="/" element={<Home />} />
               <Route path="/counties" element={<CountiesHome />} />
               <Route path="/counties/:application_id" element={<ApplicationFiles />} />
               <Route path="/details" element={<LLMCountiesAnalysis />} />
               <Route path="/results" element={<HumanCountiesAnalysis />} />
               <Route path="/results/:applicationId" element={<ApplicantDetail />} />
               <Route path="/statistics" element={<StatisticsDashboard />} />
               <Route path="/comparison" element={<ComparisonDashboard />} />
                <Route path="/firstandsecond" element={<FirstandSecond />} />
            </Routes>
        </BrowserRouter>
    )
}