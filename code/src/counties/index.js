// Wrapper to ensure imports like '../counties' resolve in environments
// that may not resolve index.tsx automatically.
// Ensure styles imported by the TSX file are resolved relative to the src folder
import '../App.css';

import ApplicationFiles from './ApplicationFiles.tsx';
import CountiesHome from './counties.tsx';
import HumanCountiesAnalysis from './HumanCountiesAnalysis.tsx';
import LLMCountiesAnalysis from './LLMCountiesAnalysis.tsx';
import StatisticsDashboard from './StatisticsDashboard.tsx';

export { CountiesHome, ApplicationFiles, LLMCountiesAnalysis, HumanCountiesAnalysis, StatisticsDashboard };
export default CountiesHome;
