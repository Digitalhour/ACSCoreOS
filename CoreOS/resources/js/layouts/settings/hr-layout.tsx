import {type PropsWithChildren} from "react";
import HrNavigation from "@/components/hr-navigation";

export default function HrLayout({ children }: PropsWithChildren) {
    return (
        <div>
            <HrNavigation />
            <main className="px-4">{children}</main>
        </div>
    );
}

