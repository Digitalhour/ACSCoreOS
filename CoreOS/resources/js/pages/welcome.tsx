import {type SharedData} from '@/types';
import {Head, Link, usePage} from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </nav>
                </header>
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                        <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-[20px] shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
                            <h1 className="mb-1 font-medium">Welcome to Core OS</h1>
                            <p className="mb-2 text-[#706f6c] dark:text-[#A1A09A]">
                                Core OS an incredibly rich ecosystem.
                                <br />
                                Coming soon.
                            </p>
                            {/*<ul className="mb-4 flex flex-col lg:mb-6">*/}
                            {/*    <li className="relative flex items-center gap-4 py-2 before:absolute before:top-1/2 before:bottom-0 before:left-[0.4rem] before:border-l before:border-[#e3e3e0] dark:before:border-[#3E3E3A]">*/}
                            {/*        <span className="relative bg-white py-1 dark:bg-[#161615]">*/}
                            {/*            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#e3e3e0] bg-[#FDFDFC] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] dark:border-[#3E3E3A] dark:bg-[#161615]">*/}
                            {/*                <span className="h-1.5 w-1.5 rounded-full bg-[#dbdbd7] dark:bg-[#3E3E3A]" />*/}
                            {/*            </span>*/}
                            {/*        </span>*/}
                            {/*        <span>*/}
                            {/*            Read the*/}
                            {/*            <a*/}
                            {/*                href="https://laravel.com/docs"*/}
                            {/*                target="_blank"*/}
                            {/*                className="ml-1 inline-flex items-center space-x-1 font-medium text-[#f53003] underline underline-offset-4 dark:text-[#FF4433]"*/}
                            {/*            >*/}
                            {/*                <span>Documentation</span>*/}
                            {/*                <svg*/}
                            {/*                    width={10}*/}
                            {/*                    height={11}*/}
                            {/*                    viewBox="0 0 10 11"*/}
                            {/*                    fill="none"*/}
                            {/*                    xmlns="http://www.w3.org/2000/svg"*/}
                            {/*                    className="h-2.5 w-2.5"*/}
                            {/*                >*/}
                            {/*                    <path*/}
                            {/*                        d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001"*/}
                            {/*                        stroke="currentColor"*/}
                            {/*                        strokeLinecap="square"*/}
                            {/*                    />*/}
                            {/*                </svg>*/}
                            {/*            </a>*/}
                            {/*        </span>*/}
                            {/*    </li>*/}
                            {/*    <li className="relative flex items-center gap-4 py-2 before:absolute before:top-0 before:bottom-1/2 before:left-[0.4rem] before:border-l before:border-[#e3e3e0] dark:before:border-[#3E3E3A]">*/}
                            {/*        <span className="relative bg-white py-1 dark:bg-[#161615]">*/}
                            {/*            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#e3e3e0] bg-[#FDFDFC] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] dark:border-[#3E3E3A] dark:bg-[#161615]">*/}
                            {/*                <span className="h-1.5 w-1.5 rounded-full bg-[#dbdbd7] dark:bg-[#3E3E3A]" />*/}
                            {/*            </span>*/}
                            {/*        </span>*/}
                            {/*        <span>*/}
                            {/*            Watch video tutorials at*/}
                            {/*            <a*/}
                            {/*                href="https://laracasts.com"*/}
                            {/*                target="_blank"*/}
                            {/*                className="ml-1 inline-flex items-center space-x-1 font-medium text-[#f53003] underline underline-offset-4 dark:text-[#FF4433]"*/}
                            {/*            >*/}
                            {/*                <span>Laracasts</span>*/}
                            {/*                <svg*/}
                            {/*                    width={10}*/}
                            {/*                    height={11}*/}
                            {/*                    viewBox="0 0 10 11"*/}
                            {/*                    fill="none"*/}
                            {/*                    xmlns="http://www.w3.org/2000/svg"*/}
                            {/*                    className="h-2.5 w-2.5"*/}
                            {/*                >*/}
                            {/*                    <path*/}
                            {/*                        d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001"*/}
                            {/*                        stroke="currentColor"*/}
                            {/*                        strokeLinecap="square"*/}
                            {/*                    />*/}
                            {/*                </svg>*/}
                            {/*            </a>*/}
                            {/*        </span>*/}
                            {/*    </li>*/}
                            {/*</ul>*/}

                        </div>
                        <div className="relative -mb-px aspect-[335/376] w-full shrink-0 overflow-hidden rounded-t-lg bg-[#fff2f2] lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#1D0002]">
                            <svg  viewBox="358.72 290.64 25.56 31.14" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M382.64,316.98c1.49-1.48,1.64-4.94,1.64-7.06,0,0-1.24,2.37-3.9,3.96-2.07,1.25-5.76,2.99-7.94,4.08-2.46,1.22-6.29,3.82-6.29,3.82,0,0,5.32-.03,7.9-.02,1.52,0,2.68-.54,3.98-1.26,1.68-.94,3.24-2.17,4.6-3.52Z"
                                />
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M383.97,300.12s-1.44,2.04-4.78,4.11c-4.53,2.8-9.68,4.63-14.47,7.03-3.88,1.95-4.91,5.57-4.91,5.57,0,0,4.5,3.93,4.52,3.89.6-1.46,1.49-2.85,2.65-4.02,1.19-1.19,2.67-2.13,4.12-3.04,2.21-1.39,4.46-2.76,6.54-4.3,3.97-2.96,5.77-3.45,6.11-7.05.07-.72.24-1.34.22-2.19Z"
                                />
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M382.14,291.5s-.88.56-1.07.67c-.9.54-4.78,2.59-5.76,3.01-3.69,1.61-5.11,1.98-8.69,3.78-2.98,1.5-6.1,3.26-7.51,6.16-.06.13-.53,1.41-.53,1.41l4.52,3.89s.52-1.09.57-1.18c.5-.93,1.11-1.82,1.84-2.61,3.01-3.27,7.6-4.99,11.25-7.62,2.68-1.93,3.82-3.3,4.24-3.78.8-.9,1.14-3.74,1.14-3.74Z"
                                />
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M373.47,290.64s-4.05.05-5.68.19c-1.64.14-2.96.21-4.37,1.06-1.87,1.13-3.28,2.56-4.7,4.1l3.69,3.18s2.39-2.76,2.57-2.95c2.34-2.44,4.07-3.56,8.5-5.58Z"
                                />
                            </svg>
                            <div className="absolute inset-0 rounded-t-lg shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-t-none lg:rounded-r-lg dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]" />
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}
