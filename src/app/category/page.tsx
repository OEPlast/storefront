'use client';

import React from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { useCategories } from '@/hooks/queries/useCategories';
import type { ApiCategory } from '@/types/category';
import { getCdnUrl } from '@/libs/cdn-url';

const RenderSkeleton = () => {
    const sections = Array.from({ length: 3 });
    const items = Array.from({ length: 6 });

    return (
        <div className="space-y-8">
            {sections.map((_, sectionIdx) => (
                <div key={sectionIdx} className="pb-8 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {items.map((_, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className="w-28 h-28 bg-gray-200 rounded-full mb-2 animate-pulse" />
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function AllCategoriesPage() {
    const { data: categories, isLoading, isError } = useCategories();

    const renderCategories = (cats: ApiCategory[]) => {
        if (!cats || cats.length === 0) {
            return (
                <div className="p-8 text-center text-gray-600">No categories available.</div>
            );
        }

        return (
            <div className="space-y-8">
                {cats.map((cat) => (
                    <div key={cat._id} className="category-section pb-8 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{cat.name}</h2>
                            <Link
                                href={`/category/${cat.slug}`}
                                prefetch={true}
                                className="text-sm text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-1"
                            >
                                View all <span>→</span>
                            </Link>
                        </div>

                        {cat.sub_categories && cat.sub_categories.length > 0 ? (
                            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {cat.sub_categories.map((subCat) => (
                                    <Link
                                        key={String(subCat._id)}
                                        href={`/category/${subCat.slug}`}
                                        prefetch={true}
                                        className="flex flex-col items-center group"
                                    >
                                        <div className="w-28 h-28 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden mb-2 transition-transform group-hover:scale-105">
                                            {subCat.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={getCdnUrl(subCat.image)}
                                                    alt={subCat.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-gray-400 text-3xl">📦</div>
                                            )}
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-800 text-center group-hover:text-purple-600 transition-colors">
                                            {subCat.name}
                                        </h3>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <Link
                                href={`/category/${cat.slug}`}
                                prefetch={true}
                                className="inline-flex items-center text-purple-600 hover:text-purple-700"
                            >
                                Browse {cat.name} →
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Breadcrumb heading="All Categories" subHeading="Browse all product categories" />

            <main className="container mx-auto py-12 px-4">
                {isError && (
                    <div className="p-6 bg-red-50 border border-red-100 text-red-700 rounded mb-8">Failed to load categories. Please try again later.</div>
                )}

                {isLoading ? <RenderSkeleton /> : renderCategories(categories || [])}
            </main>
        </div>
    );
}
