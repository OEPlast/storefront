'use client';

import React, { useState, useEffect } from 'react';
import { countdownTime } from '@/store/countdownTime';

interface CountdownTimerProps {
    start?: number;
    limit?: number;
}

/**
 * CountdownTimer - Displays a countdown timer for sales/deals
 * Only renders when both start and limit dates are provided
 */
const CountdownTimer: React.FC<CountdownTimerProps> = ({ start, limit }) => {
    const [timeLeft, setTimeLeft] = useState(countdownTime());

    // Only show countdown if both start and limit are defined
    const showCountdown = start !== undefined && limit !== undefined;

    useEffect(() => {
        if (!showCountdown) return;

        const timer = setInterval(() => {
            setTimeLeft(countdownTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [showCountdown]);

    // Don't render anything if countdown shouldn't be shown
    if (!showCountdown) return null;

    return (
        <div className="deal-time bg-red py-1 px-5 rounded-lg">
            <div className="heading6 text-white">
                <span className='day'>{timeLeft.days}</span>
                <span>D : </span>
                <span className='hour'>{timeLeft.hours}</span>
                <span>H : </span>
                <span className='minute'>{timeLeft.minutes}</span>
                <span>M : </span>
                <span className='second'>{timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds}</span>
                <span>S</span>
            </div>
        </div>
    );
};

export default CountdownTimer;
