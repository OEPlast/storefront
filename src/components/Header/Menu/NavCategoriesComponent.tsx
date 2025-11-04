'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CaretDownIcon, DotsThreeIcon } from '@phosphor-icons/react';
import { useCategories } from '@/hooks/queries/useCategories';
import { ApiCategory } from '@/types/category';
import { getCdnUrl } from '@/libs/cdn-url';
import { usePathname } from 'next/navigation';





interface NavCategoriesComponentProps {
    isOpen: boolean;
}

const NavCategoriesComponent = ({ isOpen }: NavCategoriesComponentProps) => {
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
    const { data: _CATEGORIES } = useCategories();
    const CATEGORIES = useMemo(() => _CATEGORIES || [], [_CATEGORIES]);
    const [hoveredCategory, setHoveredCategory] = useState<ApiCategory | null>(CATEGORIES[0]);
    const pathname = usePathname();
    const showFixedCategories = useMemo(() => pathname === '/', [pathname]);
    const [showNavCategories, setShowNavCategories] = useState(false);
    const hideCategoryPanel = () => {
        if (!showFixedCategories) {
            setShowNavCategories(false)
        }
        setIsCategoryExpanded(false);
        setHoveredCategory(CATEGORIES[0]);
    }
    const hideCategoryPanelSecondary = () => {
        if (showFixedCategories) {
            setShowNavCategories(false)
        }
    }
    const toggleNavCategories = () => {
        setShowNavCategories((prev) => !prev);
        setIsCategoryExpanded(true)
    }

    const showCategoryAndExpand = () => {
        if (!showFixedCategories) {
            setShowNavCategories(true)
        }
        setIsCategoryExpanded(true)
    }
    return (
        <div className="menu-department-block h-full">
            <div
                onClick={toggleNavCategories}
                onMouseOver={() => setIsCategoryExpanded(true)}
                onMouseLeave={hideCategoryPanel}
                className="menu-department-btn relative flex h-full min-w-[215px] flex-1 cursor-pointer items-center gap-4 bg-black px-4 sm:gap-16">
                <div className="text-button-uppercase whitespace-nowrap text-white">All Categories</div>
            </div>
            <div
                onMouseOver={showCategoryAndExpand}
                onMouseLeave={hideCategoryPanel}
                className={`sub-menu-department absolute left-0 top-[43px] h-max rounded-b-2xl bg-white transition-all duration-200 ${showFixedCategories ? 'open' : ''} ${showNavCategories ? 'open' : ''} ${isCategoryExpanded
                    ? 'w-full border border-line border-t-0 max-h-[70vh] overflow-hidden'
                    : 'w-[215px]'
                    }`}
            >
                <div className="flex relative h-full">
                    {/* Left Side - Categories List */}
                    <div
                        className={`min-w-[215px] border-t-0 border-line ${isCategoryExpanded ? 'max-h-[70vh] overflow-y-auto scroll-mb-2 pb-2' : ''
                            }`}
                    >
                        {CATEGORIES.map((category, index) => (
                            <div
                                key={index}
                                className={`item relative block ${hoveredCategory?.name === category.name ? 'bg-surface' : ''}`}
                                onMouseEnter={() => setHoveredCategory(category)}
                            >
                                <Link
                                    href={`/category/${category.slug}`}
                                    className="inline-block whitespace-nowrap pr-4 py-1.5 duration-300"
                                >
                                    {category.name}
                                </Link>
                            </div>
                        ))}

                        {!isCategoryExpanded && (
                            <div className="item block absolute bottom-0 left-0 w-full bg-transparent h-fit">
                                <div className="whitespace-nowrap pr-4 pt-1.5 duration-300 flex items-center gap-2 text-lime-700">
                                    <span>All Categories</span>
                                    <CaretDownIcon size={20} className="" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Subcategories */}
                    {isCategoryExpanded && hoveredCategory && (
                        <div
                            className={`flex-1 p-6 ${isCategoryExpanded ? 'max-h-[70vh] overflow-y-auto' : ''
                                }`}
                        >
                            {/* Header */}
                            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                                <h3 className="text-lg font-semibold">{hoveredCategory.name}</h3>
                                <Link
                                    href={`/category/${hoveredCategory.slug}`}
                                    className="text-sm text-secondary duration-300 hover:text-black"
                                >
                                    Browse Collection →
                                </Link>
                            </div>

                            {/* Right Side - Empty State when no subcategories */}
                            {isCategoryExpanded && hoveredCategory && hoveredCategory.sub_categories.length === 0 ? (
                                <div
                                    className={`flex flex-1 items-center justify-center p-6 ${isCategoryExpanded ? 'max-h-[70vh] overflow-y-auto [-ms-overflow-style:auto] [scrollbar-width:auto] [&::-webkit-scrollbar]:auto' : ''
                                        }`}
                                >
                                    <Link href={`/category/${hoveredCategory.slug}`} className="text-black hover:underline">Browse Collection →</Link>
                                </div>) :

                                //  Subcategories Grid
                                (<div className="grid grid-cols-5 gap-4">
                                    {hoveredCategory.sub_categories.map((subCategory, idx) => (
                                        <Link
                                            key={idx}
                                            href={`/category/${subCategory.slug}`}
                                            className="group flex flex-col items-center rounded-lg p-3 duration-300 hover:bg-surface"
                                        >
                                            <div className="mb-2 h-20 w-20 overflow-hidden rounded-lg bg-surface">
                                                <img
                                                    src={getCdnUrl(subCategory.image)}
                                                    alt={subCategory.name}
                                                    width={80}
                                                    height={80}
                                                    className="h-full w-full object-cover duration-300 group-hover:scale-110"
                                                />
                                            </div>
                                            <span className="text-center text-sm duration-300 group-hover:text-black">
                                                {subCategory.name}
                                            </span>
                                        </Link>
                                    ))}
                                </div>)

                            }



                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NavCategoriesComponent;
