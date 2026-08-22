import type {Post} from '@mattermost/types/posts';
import type {UserProfile} from '@mattermost/types/users';

type MattermostState = {
    entities: {
        posts: {
            posts: Record<string, Post>;
        };
        users: {
            profiles: Record<string, UserProfile>;
        };
    };
};

export function getPostFromState(state: unknown, postId: string): Post | undefined {
    const mattermostState = state as MattermostState;
    return mattermostState.entities?.posts?.posts?.[postId];
}

export function getUserFromState(state: unknown, userId: string): UserProfile | undefined {
    const mattermostState = state as MattermostState;
    return mattermostState.entities?.users?.profiles?.[userId];
}

export function getDisplayName(user?: UserProfile): string {
    if (!user) {
        return 'Unknown user';
    }

    if (user.nickname) {
        return user.nickname;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    if (fullName) {
        return fullName;
    }

    return user.username;
}

export function truncateMessage(message: string, maxLength = 500): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1)}…`;
}
