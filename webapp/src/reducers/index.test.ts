import reducer from './index';
import {CLEAR_PENDING_REPLY, SET_PENDING_REPLY} from '../types/store';

describe('reducer', () => {
    it('sets, clears and preserves pending replies', () => {
        const pendingReply = {replyToPostId: 'post', channelId: 'channel', rootId: '', context: 'channel'} as const;
        const set = reducer(undefined, {type: SET_PENDING_REPLY, data: pendingReply});

        expect(set.pendingReply).toEqual(pendingReply);
        expect(reducer(set, {type: CLEAR_PENDING_REPLY}).pendingReply).toBeNull();
        expect(reducer(set, {type: 'OTHER'})).toBe(set);
    });
});
