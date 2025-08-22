// client (React)
import {useEffect, useState} from "react";
import {configureEcho} from "@laravel/echo-react";

configureEcho({broadcaster: "reverb"}); // once at bootstrap

type Member = { id: number; name: string; avatar?: string | null };

export function usePagePresence(pageId: string) {
    const [members, setMembers] = useState<Member[]>([]);
    useEffect(() => {
        const channel = Echo.join(`presence.page.${pageId}`)
            .here((users: Member[]) => setMembers(users))
            .joining((user: Member) => setMembers(prev => [...prev, user]))
            .leaving((user: Member) => setMembers(prev => prev.filter(m => m.id !== user.id)));
        return () => {
            channel.leave();
        };
    }, [pageId]);
    return members;
}
