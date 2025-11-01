'use client'

import { useState, useMemo } from 'react'
import { ProductType } from '@/type/ProductType'

interface FilterOptions {
  showOnlySale: boolean
  sortOption: string
  type: string | null
  size: string | null
  color: string | null
  brand: string | null
  priceRange: { min: number; max: number }
}

export const useProductFilters = (
  data: Array<ProductType>,
  initialDataType: string | null,
  productsPerPage: number
) => {
  const [showOnlySale, setShowOnlySale] = useState(false)
  const [sortOption, setSortOption] = useState('')
  const [type, setType] = useState<string | null>(initialDataType)
  const [size, setSize] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 })
  const [currentPage, setCurrentPage] = useState(0)

  // Filter and sort products
  const { filteredData, totalProducts } = useMemo(() => {
    // Apply filters
    let filtered = data.filter((product) => {
      const isShowOnlySaleMatched = !showOnlySale || product.sale
      const isDataTypeMatched = !initialDataType || product.type === initialDataType
      const isTypeMatched = !type || product.type === type
      const isSizeMatched = !size || product.sizes.includes(size)
      const isPriceRangeMatched =
        (priceRange.min === 0 && priceRange.max === 100) ||
        (product.price >= priceRange.min && product.price <= priceRange.max)
      const isColorMatched = !color || product.variation.some((item) => item.color === color)
      const isBrandMatched = !brand || product.brand === brand

      return (
        isShowOnlySaleMatched &&
        isDataTypeMatched &&
        isTypeMatched &&
        isSizeMatched &&
        isColorMatched &&
        isBrandMatched &&
        isPriceRangeMatched &&
        product.category === 'fashion'
      )
    })

    // Apply sorting
    const sorted = [...filtered]
    if (sortOption === 'soldQuantityHighToLow') {
      sorted.sort((a, b) => b.sold - a.sold)
    } else if (sortOption === 'discountHighToLow') {
      sorted.sort(
        (a, b) =>
          Math.floor(100 - (b.price / b.originPrice) * 100) -
          Math.floor(100 - (a.price / a.originPrice) * 100)
      )
    } else if (sortOption === 'priceHighToLow') {
      sorted.sort((a, b) => b.price - a.price)
    } else if (sortOption === 'priceLowToHigh') {
      sorted.sort((a, b) => a.price - b.price)
    }

    return {
      filteredData: sorted,
      totalProducts: sorted.length,
    }
  }, [data, showOnlySale, initialDataType, type, size, color, brand, priceRange, sortOption])

  // Pagination
  const offset = currentPage * productsPerPage
  const pageCount = Math.ceil(filteredData.length / productsPerPage)
  const currentProducts =
    filteredData.length > 0
      ? filteredData.slice(offset, offset + productsPerPage)
      : [
          {
            id: 'no-data',
            category: 'no-data',
            type: 'no-data',
            name: 'no-data',
            gender: 'no-data',
            new: false,
            sale: false,
            rate: 0,
            price: 0,
            originPrice: 0,
            brand: 'no-data',
            sold: 0,
            quantity: 0,
            quantityPurchase: 0,
            sizes: [],
            variation: [],
            thumbImage: [],
            images: [],
            description: 'no-data',
            action: 'no-data',
            slug: 'no-data',
          },
        ]

  // Handlers
  const handleShowOnlySale = () => {
    setShowOnlySale((prev) => !prev)
    setCurrentPage(0)
  }

  const handleSortChange = (option: string) => {
    setSortOption(option)
    setCurrentPage(0)
  }

  const handleType = (typeValue: string) => {
    setType((prevType) => (prevType === typeValue ? null : typeValue))
    setCurrentPage(0)
  }

  const handleSize = (sizeValue: string) => {
    setSize((prevSize) => (prevSize === sizeValue ? null : sizeValue))
    setCurrentPage(0)
  }

  const handlePriceChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      setPriceRange({ min: values[0], max: values[1] })
      setCurrentPage(0)
    }
  }

  const handleColor = (colorValue: string) => {
    setColor((prevColor) => (prevColor === colorValue ? null : colorValue))
    setCurrentPage(0)
  }

  const handleBrand = (brandValue: string) => {
    setBrand((prevBrand) => (prevBrand === brandValue ? null : brandValue))
    setCurrentPage(0)
  }

  const handlePageChange = (selected: number) => {
    setCurrentPage(selected)
  }

  const handleClearAll = () => {
    setType(null)
    setSize(null)
    setColor(null)
    setBrand(null)
    setPriceRange({ min: 0, max: 100 })
    setCurrentPage(0)
  }

  return {
    // State
    showOnlySale,
    sortOption,
    type,
    size,
    color,
    brand,
    priceRange,
    currentPage,
    // Derived values
    filteredData,
    currentProducts,
    totalProducts,
    pageCount,
    // Handlers
    handleShowOnlySale,
    handleSortChange,
    handleType,
    handleSize,
    handlePriceChange,
    handleColor,
    handleBrand,
    handlePageChange,
    handleClearAll,
  }
}
