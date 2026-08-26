import type {Post} from '@mattermost/types/posts';

import {clearPendingReply, getPendingReply, isReplyInThreadView, setPendingReply, startReplyToPost} from './reply';
import {openThreadForPost} from './openThread';

jest.mock('./openThread', () => ({openThreadForPost: jest.fn(async () => true)}));

const post = {id: 'post', channel_id: 'channel', root_id: 'root'} as unknown as Post;

describe('reply actions', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());

    it('sets and clears pending state and detects thread DOM', () => {
        const dispatch = jest.fn();
        const store = {dispatch, getState: () => ({})};
        setPendingReply(store as never, {replyToPostId: 'post', channelId: 'channel', rootId: '', context: 'channel'});
        clearPendingReply(store as never);
        expect(dispatch).toHaveBeenCalledTimes(2);
        expect(getPendingReply({getState: () => ({})} as never)).toBeNull();
        const element = document.createElement('button');
        expect(isReplyInThreadView(element)).toBe(false);
        const thread = document.createElement('div');
        thread.className = 'sidebar--right';
        thread.append(element);
        document.body.append(thread);
        expect(isReplyInThreadView(element)).toBe(true);
    });

    it('starts channel and thread replies', async () => {
        const editor = document.createElement('textarea');
        editor.id = 'post_textbox';
        const focus = jest.spyOn(editor, 'focus');
        document.body.append(editor);
        const dispatch = jest.fn();
        const store = {dispatch, getState: () => ({})};

        await expect(startReplyToPost(store as never, post, {context: 'channel'})).resolves.toBe(true);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'UPDATE_RHS_STATE'}));
        await expect(startReplyToPost(store as never, post, {context: 'thread'})).resolves.toBe(true);
        expect(document.querySelector('#post_textbox')).toBe(editor);
        expect(focus).toHaveBeenCalled();
    });

    it('retries composer focus until the editor appears', async () => {
        const store = {dispatch: jest.fn(), getState: () => ({})};
        await startReplyToPost(store as never, post, {context: 'channel'});
        const editor = document.createElement('textarea');
        editor.id = 'post_textbox';
        const focus = jest.spyOn(editor, 'focus');
        document.body.append(editor);

        jest.advanceTimersByTime(100);
        expect(focus).toHaveBeenCalled();
    });

    it('clears pending reply without focusing when opening a thread fails', async () => {
        jest.mocked(openThreadForPost).mockResolvedValueOnce(false);
        const editor = document.createElement('textarea');
        editor.id = 'post_textbox';
        const focus = jest.spyOn(editor, 'focus');
        const rhs = document.createElement('div');
        rhs.className = 'sidebar--right';
        rhs.append(editor);
        document.body.append(rhs);
        const dispatch = jest.fn();

        await expect(startReplyToPost({dispatch, getState: () => ({})} as never, post, {context: 'thread'})).resolves.toBe(false);
        expect(dispatch).toHaveBeenCalledWith({type: expect.stringContaining('CLEAR_PENDING_REPLY')});
        expect(focus).not.toHaveBeenCalled();
    });

    it('handles a thread opening exception without an unhandled rejection', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation();
        jest.mocked(openThreadForPost).mockRejectedValueOnce(new Error('network failed'));
        const dispatch = jest.fn();

        await expect(startReplyToPost({dispatch, getState: () => ({})} as never, post, {context: 'thread'})).resolves.toBe(false);
        expect(dispatch).toHaveBeenCalledWith({type: expect.stringContaining('CLEAR_PENDING_REPLY')});
        expect(error).toHaveBeenCalledWith('Quoted reply failed to open thread for post post:', 'network failed');
    });
});
