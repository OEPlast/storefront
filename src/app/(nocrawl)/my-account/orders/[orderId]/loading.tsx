export default function OrderDetailsLoading() {
  return (
    <div className="order-detail-block md:py-20 py-10">
      <div className="container">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-surface rounded-lg animate-pulse" />
        </div>

        {/* Order header skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-line">
          <div className="space-y-3">
            <div className="h-8 w-48 bg-surface rounded animate-pulse" />
            <div className="h-5 w-64 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-surface rounded-full animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Order info skeleton */}
          <div className="space-y-8">
            {/* Order Status Timeline skeleton */}
            <div className="p-6 border border-line rounded-xl">
              <div className="h-6 w-32 bg-surface rounded animate-pulse mb-6" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-surface animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-surface rounded animate-pulse" />
                      <div className="h-4 w-48 bg-surface rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information skeleton */}
            <div className="p-6 border border-line rounded-xl">
              <div className="h-6 w-48 bg-surface rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-5 w-40 bg-surface rounded animate-pulse" />
                <div className="h-5 w-48 bg-surface rounded animate-pulse" />
                <div className="h-5 w-56 bg-surface rounded animate-pulse" />
              </div>
            </div>

            {/* Addresses skeleton */}
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="p-6 border border-line rounded-xl">
                  <div className="h-5 w-32 bg-surface rounded animate-pulse mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-surface rounded animate-pulse" />
                    <div className="h-4 w-4/5 bg-surface rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-surface rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Method skeleton */}
            <div className="p-6 border border-line rounded-xl">
              <div className="h-6 w-40 bg-surface rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-5 w-32 bg-surface rounded animate-pulse" />
                <div className="h-5 w-48 bg-surface rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right column - Products & Summary skeleton */}
          <div className="space-y-8">
            {/* Products skeleton */}
            <div className="p-6 border border-line rounded-xl">
              <div className="h-6 w-32 bg-surface rounded animate-pulse mb-6" />
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4 pb-4 border-b border-line last:border-0 last:pb-0">
                    <div className="w-20 h-20 bg-surface rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-3/4 bg-surface rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-surface rounded animate-pulse" />
                      <div className="h-4 w-1/4 bg-surface rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary skeleton */}
            <div className="p-6 border border-line rounded-xl bg-surface">
              <div className="h-6 w-40 bg-white/50 rounded animate-pulse mb-6" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-white/50 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-white/50 rounded animate-pulse" />
                  </div>
                ))}
                <div className="pt-4 border-t border-line flex justify-between items-center">
                  <div className="h-6 w-20 bg-white/50 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-white/50 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="flex gap-3">
              <div className="h-12 flex-1 bg-surface rounded-lg animate-pulse" />
              <div className="h-12 flex-1 bg-surface rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
