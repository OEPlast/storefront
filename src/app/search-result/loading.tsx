export default function SearchLoading() {
    return (
        <>
            {/* Breadcrumb Skeleton */}
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center animate-pulse bg-white/20 h-8 w-64 mx-auto rounded"></div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3 animate-pulse bg-white/10 h-4 w-40 mx-auto rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product List Skeleton */}
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="list-product-block relative">
                        {/* Filter Controls Skeleton */}
                        <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                            <div className="left flex has-line items-center flex-wrap gap-5">
                                <div className="animate-pulse bg-gray-300 h-10 w-32 rounded"></div>
                                <div className="flex items-center gap-2">
                                    <div className="animate-pulse bg-gray-300 h-10 w-10 rounded"></div>
                                    <div className="animate-pulse bg-gray-300 h-10 w-10 rounded"></div>
                                    <div className="animate-pulse bg-gray-300 h-10 w-10 rounded"></div>
                                </div>
                            </div>
                            <div className="right flex items-center gap-3">
                                <div className="animate-pulse bg-gray-300 h-10 w-40 rounded"></div>
                            </div>
                        </div>

                        {/* Active Filters Skeleton */}
                        <div className="list-filtered flex items-center gap-3 mt-4">
                            <div className="animate-pulse bg-gray-300 h-6 w-32 rounded"></div>
                        </div>

                        {/* Product Grid Skeleton */}
                        <div className="list-product grid 3xl:grid-cols-6 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
