import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/libs/query/get-query-client';
import { ReactNode } from 'react';
import { cachedGetSafe, seedData } from '@/libs/api/cachedApi';
import { CacheTag } from '@/libs/api/cacheTags';
import { ApiCategory } from '@/types/category';
import { GroupedBanners } from '@/types/banner';
import api from '@/libs/api/endpoints';

/**
 * Data the *layout* needs: the header's category menu and the banner slider, both of which render
 * above `{children}` on every route. Everything else a page needs is prefetched by that page.
 *
 * Two rules keep this file cheap, and both were learned the hard way:
 *
 *  1. **Nothing here may read the request.** This component used to call NextAuth `auth()` to
 *     prefetch the signed-in user's wishlist. `auth()` reads `headers()`, which made *every route
 *     on the site* dynamic — no page was ever cached, and `export const revalidate` was silently
 *     ignored. The wishlist is fetched by the client anyway, so the prefetch bought nothing.
 *  2. **Only layout-wide data belongs here.** The home page's product rails used to be prefetched
 *     here too, so a cached copy of them was folded into the render of every page. Purging
 *     `products` after a price change would then regenerate the whole site. They now live in
 *     `app/page.tsx`.
 *
 * Both fetches fall back to an empty list rather than throwing: a header with no menu is worse
 * than no page at all, and the client refetches after hydration.
 */
export default async function ServerQueries({ children }: { children: ReactNode; }) {
    const queryClient = getQueryClient();

    const [categories, banners] = await Promise.all([
        cachedGetSafe<ApiCategory[]>(api.categories.list, [], { tags: [CacheTag.CATEGORIES] }),
        cachedGetSafe<GroupedBanners[]>(api.banners.grouped, [], { tags: [CacheTag.BANNERS] }),
    ]);

    seedData(queryClient, ['categories'], categories);
    seedData(queryClient, ['banners', 'grouped'], banners);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
        </HydrationBoundary>
    );
}
