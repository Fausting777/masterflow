'use client';

import { useState } from 'react';
import BottomTabBar from './BottomTabBar';
import MoreSheet from './MoreSheet';
import FabMenu from './FabMenu';

export default function MobileShell() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <FabMenu />
      <BottomTabBar onOpenMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}