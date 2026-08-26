import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

import {getPostFromStore} from './openThread';
import {getPostFromState} from '../utils/posts';

const HIGHLIGHT_REPLY = 'HIGHLIGHT_REPLY';
const CLEAR_HIGHLIGHT_REPLY = 'CLEAR_HIGHLIGHT_REPLY';
const PERMALINK_FADEOUT_MS = 5000;

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
    views?: {
        rhs?: {
            selectedPostId?: string;
            isSidebarOpen?: boolean;
            highlightedPostId?: string;
        };
        rhsSuppressed?: boolean;
    };
};

export function isPostInThread(post: Post, threadRootId: string): boolean {
    return post.id === threadRootId || post.root_id === threadRootId;
}

export function isThreadRhsOpen(state: MattermostState): boolean {
    return Boolean(
        state.views?.rhs?.isSidebarOpen &&
        !state.views?.rhsSuppressed &&
        state.views?.rhs?.selectedPostId,
    );
}

function getOpenThreadRootId(state: MattermostState): string | null {
    return state.views?.rhs?.selectedPostId || null;
}

export function isPostInOpenThread(state: unknown, post: Post): boolean {
    const mattermostState = state as MattermostState;
    const threadRootId = getOpenThreadRootId(mattermostState);

    return Boolean(threadRootId && isThreadRhsOpen(mattermostState) && isPostInThread(post, threadRootId));
}

let highlightClearTimeout: number | undefined;
let highlightClearPostId: string | undefined;

function scheduleHighlightClear(store: Store, postId: string): void {
    if (highlightClearTimeout) {
        window.clearTimeout(highlightClearTimeout);
    }

    highlightClearTimeout = window.setTimeout(() => {
        const state = store.getState() as MattermostState;
        if (state.views?.rhs?.highlightedPostId === highlightClearPostId) {
            store.dispatch({type: CLEAR_HIGHLIGHT_REPLY});
        }
        highlightClearTimeout = undefined;
        highlightClearPostId = undefined;
    }, PERMALINK_FADEOUT_MS);
    highlightClearPostId = postId;
}

function highlightPostInOpenThread(store: Store, postId: string): void {
    const state = store.getState() as MattermostState;
    const currentHighlight = state.views?.rhs?.highlightedPostId;

    if (currentHighlight === postId) {
        store.dispatch({type: CLEAR_HIGHLIGHT_REPLY});
        window.requestAnimationFrame(() => {
            store.dispatch({type: HIGHLIGHT_REPLY, postId});
            scheduleHighlightClear(store, postId);
        });
        return;
    }

    store.dispatch({type: HIGHLIGHT_REPLY, postId});
    scheduleHighlightClear(store, postId);
}

function tryNavigateWithinOpenThread(store: Store, post: Post): boolean {
    const state = store.getState() as MattermostState;

    if (!isThreadRhsOpen(state)) {
        return false;
    }

    const threadRootId = getOpenThreadRootId(state);
    if (!threadRootId || !isPostInThread(post, threadRootId)) {
        return false;
    }

    highlightPostInOpenThread(store, post.id);
    return true;
}

export function getSiteUrl(store: Store): string {
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

async function ensurePostLoaded(store: Store, postId: string): Promise<Post | undefined> {
    let post = getPostFromStore(store, postId) || getPostFromState(store.getState(), postId);
    if (post) {
        return post;
    }

    const response = await fetch(`${getSiteUrl(store).replace(/\/$/, '')}/api/v4/posts/${postId}`, {
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
    const post = await ensurePostLoaded(store, postId);
    if (!post) {
        return false;
    }

    if (tryNavigateWithinOpenThread(store, post)) {
        return true;
    }

    const permalinkPath = getPermalinkPath(store.getState(), postId);
    if (!permalinkPath) {
        return false;
    }

    if (window.WebappUtils?.browserHistory) {
        window.WebappUtils.browserHistory.push(permalinkPath);
        return true;
    }

    window.location.assign(`${getSiteUrl(store).replace(/\/$/, '')}${permalinkPath}`);
    return true;
}
