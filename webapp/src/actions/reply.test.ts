import type {Post} from '@mattermost/types/posts';

import {clearPendingReply, getPendingReply, isReplyInThreadView, setPendingReply, startReplyToPost} from './reply';

jest.mock('./openThread', () => ({openThreadForPost: jest.fn(async () => true)}));

const post = {id: 'post', channel_id: 'channel', root_id: 'root'} as unknown as Post;

describe('reply actions', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('sets and clears pending state and detects thread DOM', () => {
        const dispatch = jest.fn();
        const store = {dispatch, getState: () => ({})};
        setPendingReply(store as never, {replyToPostId: 'post', channelId: 'channel', rootId: '', context: 'channel'});
        clearPendingReply(store as never);
        expect(dispatch).toHaveBeenCalledTimes(2);
        expect(getPendingReply({getState: () => ({})} as never)).toBeNull();
        const element = document.createElement('button');
        document.body.append(element);
        expect(isReplyInThreadView(element)).toBe(false);
        element.closest = jest.fn(() => document.body);
        expect(isReplyInThreadView(element)).toBe(true);
    });

    it('starts channel and thread replies', async () => {
        const editor = document.createElement('textarea');
        editor.id = 'post_textbox';
        document.body.append(editor);
        const dispatch = jest.fn();
        const store = {dispatch, getState: () => ({})};

        await expect(startReplyToPost(store as never, post, {context: 'channel'})).resolves.toBe(true);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'UPDATE_RHS_STATE'}));
        await expect(startReplyToPost(store as never, post, {context: 'thread'})).resolves.toBe(true);
        expect(document.querySelector('#post_textbox')).toBe(editor);
    });
});
