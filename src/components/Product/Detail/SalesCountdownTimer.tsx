'use client';
import { ProductSale } from '@/types/product';
import React, { memo, useEffect, useState } from 'react';

interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface SalesCountdownTimerProps {
    sale?: ProductSale | null;
    salesType?: 'Flash' | 'Limited' | 'Normal';
}

/**
 * Calculate countdown time from endDate to now
 */
const calculateCountdownFromEndDate = (endDate: string): CountdownTime => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const distance = Math.max(0, end - now);

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
};

const SalesCountdownTimer = ({ sale, salesType }: SalesCountdownTimerProps) => {
    const [timeLeft, setTimeLeft] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    // Only display if salesType is 'Flash' and endDate exists
    const shouldDisplay = salesType === 'Flash' && sale?.endDate;

    useEffect(() => {
        if (!shouldDisplay) return;

        // Initial calculation
        setTimeLeft(calculateCountdownFromEndDate(sale!.endDate!));

        // Update every second
        const timer = setInterval(() => {
            setTimeLeft(calculateCountdownFromEndDate(sale!.endDate!));
        }, 1000);

        return () => clearInterval(timer);
    }, [shouldDisplay, sale?.endDate]);

    // Don't render if not a Flash sale
    if (!shouldDisplay) {
        return null;
    }

    return (
        <div className="countdown-block flex items-center flex-wrap gap-4">
            <div className="text-title">Offer ends in:</div>
            <div className="countdown-time flex items-center gap-3 max-[400px]:justify-between max-[400px]:w-full">
                <div className="item w-[55px] h-[50px] flex flex-col items-center justify-center border border-red rounded-lg">
                    <div className="days heading7 text-center">{timeLeft.days < 10 ? `0${timeLeft.days}` : timeLeft.days}</div>
                    <div className="caption1 text-center">Days</div>
                </div>
                <div className="heading5">:</div>
                <div className="item w-[55px] h-[50px] flex flex-col items-center justify-center border border-red rounded-lg">
                    <div className="hours heading7 text-center">{timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}</div>
                    <div className="caption1 text-center">Hours</div>
                </div>
                <div className="heading5">:</div>
                <div className="item w-[55px] h-[50px] flex flex-col items-center justify-center border border-red rounded-lg">
                    <div className="mins heading7 text-center">{timeLeft.minutes < 10 ? `0${timeLeft.minutes}` : timeLeft.minutes}</div>
                    <div className="caption1 text-center">Mins</div>
                </div>
                <div className="heading5">:</div>
                <div className="item w-[55px] h-[50px] flex flex-col items-center justify-center border border-red rounded-lg">
                    <div className="secs heading7 text-center">{timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds}</div>
                    <div className="caption1 text-center">Secs</div>
                </div>
            </div>
        </div>
    );
};

export default memo(SalesCountdownTimer);