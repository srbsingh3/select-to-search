// React entry point for options page
// This file will be implemented in Task 4

import { createRoot } from 'react-dom/client';
import { OptionsPage } from './OptionsPage';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsPage />);
}