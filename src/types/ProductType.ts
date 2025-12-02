import { ProductDescriptionImage, ProductSale } from "@/types/product";

interface Variation {
    color: string;
    colorCode: string;
    colorImage: string;
    image: string;
}

export interface ProductType {
    id: string,
    type: string,
    name: string,
    gender: string,
    new: boolean,
    rate: number,
    price: number,
    originPrice: number,
    brand: string,
    sold: number,
    quantity: number,
    quantityPurchase: number,
    sizes: Array<string>,
    variation: Variation[],
    images: Array<ProductDescriptionImage>,
    description_images: Array<ProductDescriptionImage>,
    description: string,
    action: string,
    slug: string,
    createdAt: string,

    ///new
    _id: string;
    category: {
        _id: string;
        name: string;
        image: string;
        slug: string;
    };
    sku: number;
    stock: number;
    originStock: number;
    sale: ProductSale | null;
}