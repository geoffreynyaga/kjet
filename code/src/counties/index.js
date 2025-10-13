// Wrapper to ensure imports like '../counties' resolve in environments
// that may not resolve index.tsx automatically.
// Ensure styles imported by the TSX file are resolved relative to the src folder
import '../App.css';

import ApplicationFiles from './ApplicationFiles.tsx';
import ComparisonDashboard from './ComparisonDashboard/index.tsx';
import CountiesHome from './counties.tsx';
import FirstandSecond from './FirstandSecond/index.tsx';
import HumanCountiesAnalysis from './HumanCountiesAnalysis/index.tsx';
import LLMCountiesAnalysis from './LLMCountiesAnalysis.tsx';
import StatisticsDashboard from './StatisticsDashboard.tsx';

export { CountiesHome, ApplicationFiles, LLMCountiesAnalysis, HumanCountiesAnalysis, StatisticsDashboard, ComparisonDashboard,FirstandSecond };
export default CountiesHome;
