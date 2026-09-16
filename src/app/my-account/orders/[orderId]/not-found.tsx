import Link from 'next/link';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';

// Next.js only honours `not-found.tsx`; this file was named `not_found.tsx`, so it never rendered.
export default function NotFound() {
  return (
    <div className="order-detail-block md:py-20 py-10">
      <div className="container">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <WarningCircleIcon className="text-7xl text-red mb-4" />
          <h3 className="heading3 mb-2">Order Not Found</h3>
          <p className="text-secondary mb-6">
            The order you are looking for does not exist or you do not have permission to view it.
          </p>
          <Link href="/my-account" className="button-main">
            Back to my account
          </Link>
        </div>
      </div>
    </div>
  );
}
