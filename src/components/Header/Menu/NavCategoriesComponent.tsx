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
  const [showNavCategories, setShowNavCategories] = useState(false);
  const hideCategoryPanel = () => {
    setIsCategoryExpanded(false);
    setHoveredCategory(CATEGORIES[0]);
  };

  const toggleNavCategories = () => {
    setShowNavCategories((prev) => !prev);
    setIsCategoryExpanded(true);
  };

  const showCategoryAndExpand = () => {
    setIsCategoryExpanded(true);
  };
  const hideCategory = () => {
    setIsCategoryExpanded(false);
    setShowNavCategories(false);
  };

  return (
    <div className="menu-department-block h-full">
      <div
        onClick={toggleNavCategories}
        className="menu-department-btn group relative flex h-full min-w-[230px] flex-1 items-center gap-1.5 bg-black px-2.5"
      >
        <Link
          onClick={toggleNavCategories}
          href={'/category'}
          className="text-button-uppercase whitespace-nowrap text-white hover:underline"
        >
          All Categories
        </Link>

        <CaretDownIcon
          size={14}
          className={`pointer-events-none text-white transition-all duration-300 ${showNavCategories ? 'rotate-180' : ''}`}
        />
      </div>
      <div
        onMouseOver={showCategoryAndExpand}
        onMouseLeave={hideCategory}
        className={`sub-menu-department duration-50 absolute left-0 top-[43px] h-max rounded-b-2xl bg-white transition-all ${showNavCategories ? 'open' : ''} ${
          isCategoryExpanded
            ? 'max-h-[70vh] w-full overflow-hidden border border-t-0 border-line'
            : 'w-[235px]'
        }`}
      >
        <div className="relative flex h-full">
          {/* Left Side - Categories List */}
          <div
            className={`min-w-[215px] border-t-0 border-line ${
              isCategoryExpanded ? 'max-h-[70vh] scroll-mb-2 overflow-y-auto pb-2' : ''
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
                  className="inline-block whitespace-nowrap py-1.5 pr-4 duration-300"
                >
                  {category.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Right Side - Subcategories */}
          {isCategoryExpanded && hoveredCategory && (
            <div
              className={`flex-1 p-6 ${isCategoryExpanded ? 'max-h-[70vh] overflow-y-auto' : ''}`}
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
              {isCategoryExpanded &&
              hoveredCategory &&
              hoveredCategory.sub_categories.length === 0 ? (
                <div
                  className={`flex flex-1 items-center justify-center p-6 ${
                    isCategoryExpanded
                      ? '[&::-webkit-scrollbar]:auto max-h-[70vh] overflow-y-auto [-ms-overflow-style:auto] [scrollbar-width:auto]'
                      : ''
                  }`}
                >
                  <Link
                    href={`/category/${hoveredCategory.slug}`}
                    className="text-black hover:underline"
                  >
                    Browse Collection →
                  </Link>
                </div>
              ) : (
                //  Subcategories Grid
                <div className="grid grid-cols-5 gap-4">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavCategoriesComponent;
