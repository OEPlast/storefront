'use client'
import React from 'react'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import Footer from '@/components/Footer/Footer'
import ForgotPasswordForm from '@/components/forms/ForgotPasswordForm'

const ForgotPassword = () => {

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className='relative w-full'>
                {/* <MenuEight props="bg-transparent" /> */}
                <br />            </div>
            <div className="forgot-pass md:mb-20 mt-32 my-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="w-full max-w-xl mx-auto">
                            <ForgotPasswordForm />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ForgotPassword