'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { usePathname } from 'next/navigation';
import useLoginPopup from '@/store/useLoginPopup';
import useSubMenuDepartment from '@/store/useSubMenuDepartment';
import useMenuMobile from '@/store/useMenuMobile';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import NavCategoriesComponent from './NavCategoriesComponent';
import NavCategoriesMobile from './NavCategoriesMobile';
import { useCartCount } from '@/context/CartContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useProductSearchAutocomplete } from '@/hooks/queries/useProducts';
import AutocompleteDropdown from '@/components/Search/AutocompleteDropdown';
import { useStoreConfig } from '@/context/StoreConfigContext';
import UserIcon from './Usericon';
import { WhatsappLogoIcon } from '@phosphor-icons/react';
import Logo from '@/components/Logo';

// Data constants

const BLOG_LINKS = [
  { href: '/blog/default', label: 'Blog Default' },
  { href: '/blog/list', label: 'Blog List' },
  { href: '/blog/grid', label: 'Blog Grid' },
  { href: '/blog/detail1', label: 'Blog Detail 1' },
  { href: '/blog/detail2', label: 'Blog Detail 2' },
];

const PAGES_LINKS = [
  { href: '/pages/about', label: 'About Us' },
  { href: '/pages/contact', label: 'Contact Us' },
  { href: '/pages/store-list', label: 'Store List' },
  { href: '/pages/page-not-found', label: '404' },
  { href: '/pages/faqs', label: 'FAQs' },
  { href: '/pages/coming-soon', label: 'Coming Soon' },
  { href: '/pages/customer-feedbacks', label: 'Customer Feedbacks' },
];

const MenuEight = () => {
  const { storeName, whatsappNumber } = useStoreConfig();
  const pathname = usePathname();
  const { openLoginPopup, handleLoginPopup } = useLoginPopup();
  const { openSubMenuDepartment, handleSubMenuDepartment } = useSubMenuDepartment();
  const { openMenuMobile, handleMenuMobile } = useMenuMobile();
  const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null);
  const { openModalCart } = useModalCartContext();
  const cartCount = useCartCount();
  const { openModalWishlist } = useModalWishlistContext();

  const [searchKeyword, setSearchKeyword] = useState('');
  const router = useRouter();
  const debounced = useDebouncedValue(searchKeyword, 200);
  const { history, add: addHistory, clear: clearHistory } = useSearchHistory();
  const [openAutocomplete, setOpenAutocomplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Separate refs for desktop and mobile input+dropdown containers
  const desktopInputAnchorRef = useRef<HTMLDivElement>(null);
  const mobileInputAnchorRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isFetching } = useProductSearchAutocomplete(debounced, 8);

  // Only show dropdown if there are suggestions (>=2 chars) or we have history
  const shouldShowDropdown = useMemo(() => {
    const hasMinChars = searchKeyword.trim().length >= 2;
    const hasHistory = history.length > 0;
    return openAutocomplete && (hasMinChars || hasHistory);
  }, [openAutocomplete, searchKeyword, history]);

  const handleSearch = (value: string) => {
    router.push(`/search-result?query=${value}`);
    addHistory(value);
    setSearchKeyword('');
    setOpenAutocomplete(false);
  };

  const handleSelectSuggestion = (name: string) => {
    // Navigate to search results using the suggestion name
    handleSearch(name);
  };

  const handleOpenSubNavMobile = (index: number) => {
    setOpenSubNavMobile(openSubNavMobile === index ? null : index);
  };

  const [fixedHeader, setFixedHeader] = useState(false);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setFixedHeader(scrollPosition > 0 && scrollPosition < lastScrollPosition);
      setLastScrollPosition(scrollPosition);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollPosition]);

  // Close autocomplete when clicking outside input+dropdown (desktop or mobile containers)
  useEffect(() => {
    function handleOutside(event: MouseEvent | TouchEvent) {
      if (!openAutocomplete) return;
      const target = event.target as Node | null;
      const desktopEl = desktopInputAnchorRef.current;
      const mobileEl = mobileInputAnchorRef.current;
      const clickedInsideDesktop = desktopEl ? desktopEl.contains(target as Node) : false;
      const clickedInsideMobile = mobileEl ? mobileEl.contains(target as Node) : false;
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setOpenAutocomplete(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openAutocomplete]);

  const shouldShowTopNavigation = useMemo(() => {
    if (pathname === '/login' || pathname === '/register') {
      return false;
    }
    return true;
  }, [pathname]);

  return (
    <>
      {/* Header Menu */}
      <div
        className={`header-menu style-eight ${fixedHeader ? 'fixed' : 'relative'} top-0 z-10 w-full bg-white duration-500`}
      >
        <div className={`header-menu-main style-eight h-[56px] w-full md:h-[74px]`}>
          <div className="container mx-auto h-full">
            <div className="header-main flex h-full items-center justify-between">
              <div
                className="menu-mobile-icon flex items-center lg:hidden"
                onClick={handleMenuMobile}
              >
                <i className="icon-category text-2xl"></i>
              </div>
              <Link href={'/'} className="flex items-center">
                <Logo alwaysFull storeName={storeName} />
              </Link>
              {shouldShowTopNavigation && (
                <div className="form-search flex h-[44px] w-2/3 items-center pl-8 max-lg:hidden">
                  <div className="flex h-full w-full items-center">
                    <div className="relative flex h-full w-full" ref={desktopInputAnchorRef}>
                      <input
                        type="text"
                        className={`search-input h-full w-full rounded-l-lg border border-line px-4 ${shouldShowDropdown ? 'rounded-bl-none' : ''}`}
                        placeholder="What are you looking for today?"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onFocus={() => setOpenAutocomplete(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch(searchKeyword);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveIndex((prev) =>
                              Math.min(prev + 1, (suggestions?.length ?? 0) - 1)
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveIndex((prev) => Math.max(prev - 1, -1));
                          } else if (e.key === 'Escape') {
                            setOpenAutocomplete(false);
                          }
                        }}
                      />
                      {shouldShowDropdown && (
                        <AutocompleteDropdown
                          searchKeyword={searchKeyword}
                          open={shouldShowDropdown}
                          loading={isFetching}
                          suggestions={searchKeyword.trim().length >= 2 ? suggestions : []}
                          history={searchKeyword.trim().length < 12 ? history : []}
                          activeIndex={activeIndex}
                          anchorRef={desktopInputAnchorRef}
                          onSelectSuggestion={(item) => handleSelectSuggestion(item.name)}
                          onSelectHistory={(term) => handleSearch(term)}
                          onClearHistory={() => clearHistory()}
                        />
                      )}
                    </div>
                    <button
                      className="search-button button-main flex h-full items-center rounded-none rounded-r-lg bg-black px-7"
                      onClick={() => handleSearch(searchKeyword)}
                    >
                      Search
                    </button>
                  </div>
                </div>
              )}
              <div className="right flex gap-12">
                <div className="list-action flex items-center gap-4">
                  <UserIcon />
                  <div
                    className="wishlist-icon flex cursor-pointer items-center max-md:hidden"
                    onClick={openModalWishlist}
                  >
                    <Icon.Heart size={24} color="black" />
                  </div>
                  <div
                    className="cart-icon relative flex cursor-pointer items-center"
                    onClick={openModalCart}
                  >
                    <Icon.Handbag size={24} color="black" />
                    <span className="quantity cart-quantity absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black !px-3 text-[10px] text-white">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {shouldShowTopNavigation && (
          <div className="top-nav-menu relative z-10 h-[44px] border-b border-t border-line bg-white max-lg:hidden">
            <div className="container h-full">
              <div className="top-nav-menu-main relative flex h-full items-center justify-between">
                <div className="left flex h-full items-center">
                  <NavCategoriesComponent isOpen={openSubMenuDepartment} />
                  <div className="menu-main style-eight h-full pl-12 max-lg:hidden">
                    <ul className="flex h-full items-center gap-8"></ul>
                  </div>
                </div>
                {whatsappNumber && (
                  <div className="right flex cursor-pointer items-center gap-1">
                    <WhatsappLogoIcon weight="fill" className="h-7 w-7 text-green-500" />
                    <div className="text-button-uppercase text-green-700">{whatsappNumber}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      <div id="menu-mobile" className={`${openMenuMobile ? 'open' : ''}`}>
        <div className="menu-container h-full bg-white">
          <div className="container h-full px-3">
            <div className="menu-main h-full overflow-hidden">
              <div className="heading relative flex items-center justify-center py-2">
                <div
                  className="close-menu-mobile-btn absolute left-0 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface"
                  onClick={handleMenuMobile}
                >
                  <Icon.X size={14} />
                </div>
                <Link href={'/'} className="logo text-center text-3xl font-semibold">
                  {storeName}
                </Link>
              </div>
              <div className="form-search relative mt-2" ref={mobileInputAnchorRef}>
                <div className="flex h-[40px] w-full">
                  <input
                    type="text"
                    placeholder="What are you looking for?"
                    className="h-full w-full rounded-l-md border border-line px-2 text-sm"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onFocus={() => setOpenAutocomplete(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch(searchKeyword);
                        handleMenuMobile();
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleSearch(searchKeyword);
                      handleMenuMobile();
                    }}
                    className="flex h-full w-[50px] cursor-pointer items-center justify-center rounded-r-md bg-black"
                  >
                    <Icon.MagnifyingGlass size={20} className="text-white" />
                  </button>
                </div>
                {shouldShowDropdown && (
                  <div className="absolute left-0 right-0">
                    <AutocompleteDropdown
                      classname="mt-0 top-0"
                      open={shouldShowDropdown}
                      loading={isFetching}
                      suggestions={searchKeyword.trim().length >= 2 ? suggestions.slice(0, 7) : []}
                      history={searchKeyword.trim().length < 2 ? history : []}
                      activeIndex={activeIndex}
                      anchorRef={mobileInputAnchorRef}
                      onSelectSuggestion={(item) => handleSelectSuggestion(item.name)}
                      onSelectHistory={(term) => handleSearch(term)}
                      onClearHistory={() => clearHistory()}
                    />
                  </div>
                )}
              </div>
              <div className="list-nav mt-6">
                <ul>
                  {/* Demo Menu */}
                  <li>
                    <Link
                      href={'/'}
                      onClick={handleMenuMobile}
                      className={`flex items-center justify-between text-xl font-semibold`}
                    >
                      Home
                    </Link>
                  </li>
                  {/* categories */}
                  <li
                    className={`${openSubNavMobile === 9 ? 'open' : ''}`}
                    onClick={() => handleOpenSubNavMobile(9)}
                  >
                    <div className={`mt-5 flex items-center justify-between text-xl font-semibold`}>
                      Categories
                      <span className="text-right">
                        <Icon.CaretRight size={20} />
                      </span>
                    </div>
                    <div className="sub-nav-mobile h-full">
                      <div
                        className="back-btn flex items-center gap-3"
                        onClick={() => handleOpenSubNavMobile(9)}
                      >
                        <Icon.CaretLeft />
                        Back
                      </div>
                      <div className="list-nav-item h-full w-full pb-6 pt-2">
                        <NavCategoriesMobile handleMenuMobile={handleMenuMobile} />
                      </div>
                    </div>
                  </li>

                  {/* Features, Shop, Product mobile menus - keep existing complex structures */}

                  {/* Pages Menu */}
                  <li
                    className={`${openSubNavMobile === 6 ? 'open' : ''}`}
                    onClick={() => handleOpenSubNavMobile(6)}
                  >
                    <a
                      href={'#!'}
                      className="mt-5 flex items-center justify-between text-xl font-semibold"
                    >
                      Pages
                      <span className="text-right">
                        <Icon.CaretRight size={20} />
                      </span>
                    </a>
                    <div className="sub-nav-mobile">
                      <div
                        className="back-btn flex items-center gap-3"
                        onClick={() => handleOpenSubNavMobile(6)}
                      >
                        <Icon.CaretLeft />
                        Back
                      </div>
                      <div className="list-nav-item w-full pb-6 pt-2">
                        <ul className="w-full">
                          {PAGES_LINKS.map((link, index) => (
                            <li key={index}>
                              <Link
                                href={link.href}
                                className={`text-secondary duration-300 ${pathname === link.href ? 'active' : ''}`}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuEight;
