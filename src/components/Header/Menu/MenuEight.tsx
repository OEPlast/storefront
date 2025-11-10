'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { usePathname } from 'next/navigation';
import Product from '@/components/Product/Product';
import productData from '@/data/Product.json';
import useLoginPopup from '@/store/useLoginPopup';
import useSubMenuDepartment from '@/store/useSubMenuDepartment';
import useMenuMobile from '@/store/useMenuMobile';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useModalSearchContext } from '@/context/ModalSearchContext';
import { useCart } from '@/context/CartContext';
import NavCategoriesComponent from './NavCategoriesComponent';
import NavCategoriesMobile from './NavCategoriesMobile';
import { useCartCount } from '@/hooks/useCart';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useProductSearchAutocomplete } from '@/hooks/queries/useProducts';
import AutocompleteDropdown from '@/components/Search/AutocompleteDropdown';

// Data constants

const BLOG_LINKS = [
    { href: '/blog/default', label: 'Blog Default' },
    { href: '/blog/list', label: 'Blog List' },
    { href: '/blog/grid', label: 'Blog Grid' },
    { href: '/blog/detail1', label: 'Blog Detail 1' },
    { href: '/blog/detail2', label: 'Blog Detail 2' }
];

const PAGES_LINKS = [
    { href: '/pages/about', label: 'About Us' },
    { href: '/pages/contact', label: 'Contact Us' },
    { href: '/pages/store-list', label: 'Store List' },
    { href: '/pages/page-not-found', label: '404' },
    { href: '/pages/faqs', label: 'FAQs' },
    { href: '/pages/coming-soon', label: 'Coming Soon' },
    { href: '/pages/customer-feedbacks', label: 'Customer Feedbacks' }
];

const DEMO_LINKS = [
    [
        { href: '/', label: 'Home Fashion 1' },
        { href: '/homepages/fashion2', label: 'Home Fashion 2' },
        { href: '/homepages/fashion3', label: 'Home Fashion 3' },
        { href: '/homepages/fashion4', label: 'Home Fashion 4' },
        { href: '/homepages/fashion5', label: 'Home Fashion 5' },
        { href: '/homepages/fashion6', label: 'Home Fashion 6' }
    ],
    [
        { href: '/homepages/fashion7', label: 'Home Fashion 7' },
        { href: '/homepages/fashion8', label: 'Home Fashion 8' },
        { href: '/homepages/fashion9', label: 'Home Fashion 9' },
        { href: '/homepages/fashion10', label: 'Home Fashion 10' },
        { href: '/homepages/fashion11', label: 'Home Fashion 11' },
        { href: '/homepages/underwear', label: 'Home Underwear' }
    ],
    [
        { href: '/homepages/cosmetic1', label: 'Home Cosmetic 1' },
        { href: '/homepages/cosmetic2', label: 'Home Cosmetic 2' },
        { href: '/homepages/cosmetic3', label: 'Home Cosmetic 3' },
        { href: '/homepages/pet', label: 'Home Pet Store' },
        { href: '/homepages/jewelry', label: 'Home Jewelry' },
        { href: '/homepages/furniture', label: 'Home Furniture' }
    ],
    [
        { href: '/homepages/watch', label: 'Home Watch' },
        { href: '/homepages/toys', label: 'Home Toys Kid' },
        { href: '/homepages/yoga', label: 'Home Yoga' },
        { href: '/homepages/organic', label: 'Home Organic' },
        { href: '/homepages/marketplace', label: 'Home Marketplace' }
    ]
];

// Flatten demo links for mobile (2 columns)
const MOBILE_DEMO_LINKS_COL1 = [
    ...DEMO_LINKS[0],
    ...DEMO_LINKS[1].slice(0, 3)
];

const MOBILE_DEMO_LINKS_COL2 = [
    ...DEMO_LINKS[1].slice(3),
    ...DEMO_LINKS[2],
    ...DEMO_LINKS[3]
];

const MenuEight = () => {
    const pathname = usePathname();
    const { openLoginPopup, handleLoginPopup } = useLoginPopup();
    const { openSubMenuDepartment, handleSubMenuDepartment } = useSubMenuDepartment();
    const { openMenuMobile, handleMenuMobile } = useMenuMobile();
    const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null);
    const { openModalCart } = useModalCartContext();
    const { cartState } = useCart();
    const { count: cartCount } = useCartCount();
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
            <div className={`header-menu style-eight ${fixedHeader ? ' fixed' : 'relative'} bg-white w-full md:h-[74px] h-[56px]`}>
                <div className="container mx-auto h-full">
                    <div className="header-main flex items-center justify-between h-full">
                        <div className="menu-mobile-icon lg:hidden flex items-center" onClick={handleMenuMobile}>
                            <i className="icon-category text-2xl"></i>
                        </div>
                        <Link href={'/'} className='flex items-center'>
                            <div className="heading4">OEPlast</div>
                        </Link>
                        {shouldShowTopNavigation && (
                            <div className="form-search w-2/3 pl-8 flex items-center h-[44px] max-lg:hidden">

                                <div className='w-full flex items-center h-full'>
                                    <div className="relative w-full h-full flex" ref={desktopInputAnchorRef}>
                                        <input
                                            type="text"
                                            className="search-input h-full px-4 w-full border border-line rounded-l-lg"
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
                                                    setActiveIndex((prev) => Math.min(prev + 1, (suggestions?.length ?? 0) - 1));
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
                                                open={shouldShowDropdown}
                                                loading={isFetching}
                                                suggestions={searchKeyword.trim().length >= 2 ? suggestions : []}
                                                history={searchKeyword.trim().length < 2 ? history : []}
                                                activeIndex={activeIndex}
                                                anchorRef={desktopInputAnchorRef}
                                                onSelectSuggestion={(item) => handleSelectSuggestion(item.name)}
                                                onSelectHistory={(term) => handleSearch(term)}
                                                onClearHistory={() => clearHistory()}
                                            />
                                        )}
                                    </div>
                                    <button
                                        className="search-button button-main bg-black h-full flex items-center px-7 rounded-none rounded-r-lg "
                                        onClick={() => handleSearch(searchKeyword)}
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>)}
                        <div className="right flex gap-12">
                            <div className="list-action flex items-center gap-4">
                                <div className="user-icon flex items-center justify-center cursor-pointer">
                                    <Icon.User size={24} color='black' onClick={handleLoginPopup} />
                                    <div
                                        className={`login-popup absolute top-[74px] w-[320px] p-7 rounded-xl bg-white box-shadow-sm 
                                            ${openLoginPopup ? 'open' : ''}`}
                                    >
                                        <Link href={'/login'} className="button-main w-full text-center">Login</Link>
                                        <div className="text-secondary text-center mt-3 pb-4">{`Don't have an account?`}
                                            <Link href={'/register'} className='text-black pl-1 hover:underline'>Register</Link>
                                        </div>
                                        <div className="bottom pt-4 border-t border-line"></div>
                                        <Link href={'#!'} className='body1 hover:underline'>Support</Link>
                                    </div>
                                </div>
                                <div className="max-md:hidden wishlist-icon flex items-center cursor-pointer" onClick={openModalWishlist}>
                                    <Icon.Heart size={24} color='black' />
                                </div>
                                <div className="cart-icon flex items-center relative cursor-pointer" onClick={openModalCart}>
                                    <Icon.Handbag size={24} color='black' />
                                    <span className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {shouldShowTopNavigation && (

                <>


                    {/* Top Nav Menu */}
                    <div className="top-nav-menu relative bg-white border-t border-b border-line h-[44px] max-lg:hidden z-10">
                        <div className="container h-full">
                            <div className="top-nav-menu-main flex items-center justify-between h-full relative">
                                <div className="left flex items-center h-full">

                                    <NavCategoriesComponent isOpen={openSubMenuDepartment} />
                                    <div className="menu-main style-eight h-full pl-12 max-lg:hidden">
                                        <ul className='flex items-center gap-8 h-full'>

                                            <li className='h-full relative'>
                                                <Link
                                                    href="/promos"
                                                    className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname.includes('/pages') ? 'active' : ''}`}
                                                >
                                                    Promos
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="right flex items-center gap-1">
                                    <div className="caption1">Hotline:</div>
                                    <div className="text-button-uppercase">+01 1234 8888</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>)}

            {/* Mobile Menu */}
            <div id="menu-mobile" className={`${openMenuMobile ? 'open' : ''}`}>
                <div className="menu-container bg-white h-full">
                    <div className="container h-full px-3">
                        <div className="menu-main h-full overflow-hidden">
                            <div className="heading py-2 relative flex items-center justify-center">
                                <div
                                    className="close-menu-mobile-btn absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface flex items-center justify-center"
                                    onClick={handleMenuMobile}
                                >
                                    <Icon.X size={14} />
                                </div>
                                <Link href={'/'} className='logo text-3xl font-semibold text-center'>OEPlast</Link>
                            </div>
                            <div className="form-search relative mt-2" ref={mobileInputAnchorRef}>
                                <Icon.MagnifyingGlass size={20} className='absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer' />
                                <input
                                    type="text"
                                    placeholder='What are you looking for?'
                                    className=' h-12 rounded-lg border border-line text-sm w-full pl-10 pr-4'
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onFocus={() => setOpenAutocomplete(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearch(searchKeyword);
                                        }
                                    }}
                                />
                                {shouldShowDropdown && (
                                    <div className="absolute left-0 right-0">
                                        <AutocompleteDropdown
                                            open={shouldShowDropdown}
                                            loading={isFetching}
                                            suggestions={searchKeyword.trim().length >= 2 ? suggestions : []}
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
                                    <li
                                    >
                                        <Link href={'/'} className={`text-xl font-semibold flex items-center justify-between`}>Home
                                        </Link>
                                    </li>
                                    {/* categories */}
                                    <li
                                        className={`${openSubNavMobile === 9 ? 'open' : ''}`}
                                        onClick={() => handleOpenSubNavMobile(9)}
                                    >
                                        <div className={`text-xl font-semibold flex items-center justify-between mt-5`}>Categories
                                            <span className='text-right'>
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
                                            <div className="list-nav-item w-full pt-2 pb-6 h-full">
                                                <NavCategoriesMobile />
                                            </div>
                                        </div>
                                    </li>

                                    {/* Features, Shop, Product mobile menus - keep existing complex structures */}

                                    {/* Blog Menu */}
                                    <li
                                        className={`${openSubNavMobile === 5 ? 'open' : ''}`}
                                        onClick={() => handleOpenSubNavMobile(5)}
                                    >
                                        <a href={'#!'} className='text-xl font-semibold flex items-center justify-between mt-5'>Blog
                                            <span className='text-right'>
                                                <Icon.CaretRight size={20} />
                                            </span>
                                        </a>
                                        <div className="sub-nav-mobile">
                                            <div
                                                className="back-btn flex items-center gap-3"
                                                onClick={() => handleOpenSubNavMobile(5)}
                                            >
                                                <Icon.CaretLeft />
                                                Back
                                            </div>
                                            <div className="list-nav-item w-full pt-2 pb-6">
                                                <ul className='w-full'>
                                                    {BLOG_LINKS.map((link, index) => (
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

                                    {/* Pages Menu */}
                                    <li
                                        className={`${openSubNavMobile === 6 ? 'open' : ''}`}
                                        onClick={() => handleOpenSubNavMobile(6)}
                                    >
                                        <a href={'#!'} className='text-xl font-semibold flex items-center justify-between mt-5'>Pages
                                            <span className='text-right'>
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
                                            <div className="list-nav-item w-full pt-2 pb-6">
                                                <ul className='w-full'>
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
