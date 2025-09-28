// Wrapper to ensure imports like '../counties' resolve in environments
// that may not resolve index.tsx automatically.
// Ensure styles imported by the TSX file are resolved relative to the src folder
import '../App.css';
import CountiesHome from './counties.tsx';
import ApplicationFiles from './ApplicationFiles.tsx';
import LLMCountiesAnalysis from './LLMCountiesAnalysis.tsx';

export { CountiesHome, ApplicationFiles, LLMCountiesAnalysis };
export default CountiesHome;
