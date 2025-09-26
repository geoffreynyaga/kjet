// Small JS wrapper to ensure webpack can resolve './routes' imports
// Re-exports the TSX router implementation (if present) so older resolver configs work.
import RoutesApp from './index.tsx';
export default RoutesApp;
