import { requireCategory } from './data';

/**
 * Answers an unknown category with a real 404 before loading.tsx gets involved. The page renders
 * inside loading.tsx's Suspense boundary, and a notFound() thrown in there goes out as a 200; see
 * app/product/[slug]/layout.tsx for the full story.
 */
export default async function CategorySlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string; }>;
}) {
    const { slug } = await params;
    await requireCategory(slug);
    return children;
}
