import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

import {getPostFromStore} from './openThread';
import {getPostFromState} from '../utils/posts';

type MattermostState = {
    entities: {
        general: {
            config: {
                SiteURL: string;
            };
        };
        channels: {
            channels: Record<string, {team_id?: string}>;
        };
        teams: {
            currentTeamId: string;
            teams: Record<string, {name: string}>;
        };
    };
};

function getSiteUrl(store: Store): string {
    const state = store.getState() as MattermostState;
    return state.entities.general.config.SiteURL || window.location.origin;
}

function getTeamNameForPost(state: unknown, post: Post): string | null {
    const mattermostState = state as MattermostState;
    const channel = mattermostState.entities.channels?.channels?.[post.channel_id];
    const teamId = channel?.team_id || mattermostState.entities.teams?.currentTeamId;
    const team = teamId ? mattermostState.entities.teams?.teams?.[teamId] : undefined;

    return team?.name || null;
}

export function getPermalinkPath(state: unknown, postId: string): string | null {
    const post = getPostFromState(state, postId);
    if (!post) {
        return null;
    }

    const teamName = getTeamNameForPost(state, post);
    if (!teamName) {
        return null;
    }

    return `/${teamName}/pl/${postId}`;
}

export function getPermalinkUrl(store: Store, postId: string): string | null {
    const path = getPermalinkPath(store.getState(), postId);
    if (!path) {
        return null;
    }

    return `${getSiteUrl(store).replace(/\/$/, '')}${path}`;
}

async function ensurePostLoaded(store: Store, postId: string): Promise<Post | undefined> {
    let post = getPostFromStore(store, postId) || getPostFromState(store.getState(), postId);
    if (post) {
        return post;
    }

    const response = await fetch(`${getSiteUrl(store)}/api/v4/posts/${postId}`, {
        credentials: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        return undefined;
    }

    post = await response.json();
    store.dispatch({
        type: 'RECEIVED_POST',
        data: post,
    });

    return post;
}

declare global {
    interface Window {
        WebappUtils?: {
            browserHistory: {
                push: (path: string) => void;
            };
        };
    }
}

export async function navigateToQuotedPost(store: Store, postId: string): Promise<boolean> {
    await ensurePostLoaded(store, postId);

    const permalinkPath = getPermalinkPath(store.getState(), postId);
    if (!permalinkPath) {
        return false;
    }

    if (window.WebappUtils?.browserHistory) {
        window.WebappUtils.browserHistory.push(permalinkPath);
        return true;
    }

    window.location.assign(permalinkPath);
    return true;
}
