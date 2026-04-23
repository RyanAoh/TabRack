/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import MainManager from './components/MainManager';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/src/components/ThemeProvider';
import { LanguageProvider } from '@/src/components/LanguageProvider';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tabrack-theme">
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <MainManager />
          <Toaster position="top-center" expand={true} richColors />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
