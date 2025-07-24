import {useEffect, useState} from 'react'
import {type SharedData} from '@/types'
import {Head, Link, usePage} from '@inertiajs/react'
import AppLogoIcon from "@/components/app-logo-icon";

export default function Welcome() {
    const { auth } = usePage<SharedData>().props

    const videos = [
        '/videos/video1.mp4',
        '/videos/video2.mp4',
        '/videos/video3.mp4',
        '/videos/video4.mp4',
        '/videos/video5.mp4',
    ]

    const [currentIndex, setCurrentIndex] = useState(0)
    const [prevIndex, setPrevIndex] = useState<number | null>(null)
    const [isFading, setIsFading] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setPrevIndex(currentIndex)
            setCurrentIndex((prev) => (prev + 1) % videos.length)
            setIsFading(true)

            setTimeout(() => {
                setIsFading(false)
                setPrevIndex(null)
            }, 2000) // match fade duration
        }, 9000) // switch every 10 seconds

        return () => clearInterval(interval)
    }, [currentIndex, videos.length])

    return (
        <>
            <Head title="Welcome" />

            {/* Layered Video Backgrounds */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0">
                {/* Previous video fading out */}
                {prevIndex !== null && (
                    <video
                        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
                            isFading ? 'opacity-0' : 'opacity-100'
                        }`}
                        autoPlay
                        muted
                        loop
                        playsInline
                        key={prevIndex}
                    >
                        <source src={videos[prevIndex]} type="video/mp4" />
                    </video>
                )}

                {/* Current video fading in */}
                <video
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
                        isFading ? 'opacity-100' : 'opacity-100'
                    }`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    key={currentIndex}
                >
                    <source src={videos[currentIndex]} type="video/mp4" />
                </video>

                {/* Optional dark overlay */}
                <div className="absolute top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-white px-4 text-center">
                <header className="absolute top-0 right-0 left-0 flex justify-end p-6 text-sm">
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-sm border border-white/30 px-5 py-1.5 hover:border-white/50"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="rounded-sm border border-transparent px-5 py-1.5 hover:border-white/30"
                            >
                                Log in
                            </Link>
                        )}
                    </nav>
                </header>

                <div className="z-10 justify-center flex gap-2">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                        <AppLogoIcon className="size-5 fill-current text-white dark:text-red-700" />
                    </div>
                    <p className={"mt-1"}>
                    Air Compressor Services
                    </p>

                </div>

            </div>
        </>
    )
}
