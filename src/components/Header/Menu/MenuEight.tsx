'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
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
import UserIcon from './Usericon';
import { WhatsappLogoIcon } from '@phosphor-icons/react';
import Logo from '@/components/Logo';

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



const MenuEight = () => {
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
            <div className={`header-menu style-eight ${fixedHeader ? ' fixed' : 'relative'} bg-white w-full md:h-[74px] h-[56px]`}>
                <div className="container mx-auto h-full">
                    <div className="header-main flex items-center justify-between h-full">
                        <div className="menu-mobile-icon lg:hidden flex items-center" onClick={handleMenuMobile}>
                            <i className="icon-category text-2xl"></i>
                        </div>
                        <Link href={'/'} className='flex items-center'>
                            <Logo />
                        </Link>
                        {shouldShowTopNavigation && (
                            <div className="form-search w-2/3 pl-8 flex items-center h-[44px] max-lg:hidden">

                                <div className='w-full flex items-center h-full'>
                                    <div className="relative w-full h-full flex" ref={desktopInputAnchorRef}>
                                        <input
                                            type="text"
                                            className={`search-input h-full px-4 w-full border border-line rounded-l-lg ${shouldShowDropdown ? 'rounded-bl-none' : ''}`}
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
                                        className="search-button button-main bg-black h-full flex items-center px-7 rounded-none rounded-r-lg "
                                        onClick={() => handleSearch(searchKeyword)}
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>)}
                        <div className="right flex gap-12">
                            <div className="list-action flex items-center gap-4">
                                <UserIcon />
                                <div className="max-md:hidden wishlist-icon flex items-center cursor-pointer" onClick={openModalWishlist}>
                                    <Icon.Heart size={24} color='black' />
                                </div>
                                <div className="cart-icon flex items-center relative cursor-pointer" onClick={openModalCart}>
                                    <Icon.Handbag size={24} color='black' />
                                    <span className="quantity cart-quantity absolute -right-2 -top-2 text-[10px] text-white bg-black w-4 h-4 !px-3 flex items-center justify-center rounded-full">{cartCount > 99 ?
                                        '99+' : cartCount}</span>
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
                                        </ul>
                                    </div>
                                </div>
                                <div className="right flex items-center gap-1 cursor-pointer">
                                    <WhatsappLogoIcon weight='fill' className='text-green-500 w-7 h-7' />
                                    <div className="text-button-uppercase text-green-700">+234 802 829 9167</div>
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
                                <Link href={'/'} className='logo text-3xl font-semibold text-center'>Rawura</Link>
                            </div>
                            <div className="form-search relative mt-2" ref={mobileInputAnchorRef}>
                                <div className='flex w-full h-[40px]'>

                                    <input
                                        type="text"
                                        placeholder='What are you looking for?'
                                        className='rounded-l-md border border-line text-sm px-2 w-full h-full'
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
                                    <button onClick={(e) => {
                                        e.preventDefault();
                                        handleSearch(searchKeyword);
                                        handleMenuMobile();
                                    }
                                    } className='w-[50px] h-full rounded-r-md bg-black cursor-pointer flex justify-center items-center'>
                                        <Icon.MagnifyingGlass size={20} className='text-white' />
                                    </button>
                                </div>
                                {shouldShowDropdown && (
                                    <div className="absolute left-0 right-0">
                                        <AutocompleteDropdown
                                            classname='mt-0 top-0'
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
                                        <Link href={'/'} onClick={handleMenuMobile} className={`text-xl font-semibold flex items-center justify-between`}>Home
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
