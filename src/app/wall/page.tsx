export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { Suspense } from 'react';
import PageClient from './PageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  );
}
