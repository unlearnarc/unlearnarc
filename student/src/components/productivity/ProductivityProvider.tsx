import React from 'react';
import { ProductivityDock } from './ProductivityDock';
import { useReminderScheduler } from './useReminderScheduler';
import { usePushSync } from '../../pwa/usePushSync';

/* =============================================================================
   ProductivityProvider — mounts the always-on productivity layer.

   • Runs the single app-wide reminder scheduler so reminders fire regardless of
     which page the user is on or whether a panel is open.
   • Renders the floating ProductivityDock. The dock already hides itself on
     full-screen pages because AppLayout only renders this provider inside its
     chrome region.
   ============================================================================= */

export const ProductivityProvider: React.FC = () => {
  useReminderScheduler();
  usePushSync();
  return <ProductivityDock />;
};
